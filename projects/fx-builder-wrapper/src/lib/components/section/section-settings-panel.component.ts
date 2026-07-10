import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FxComponent, FxMode } from '@instantsys-labs/fx';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Condition, ConditionSource, isConditionConfigured, parseConditions } from '../shared/applicability';

type SettingsTab = 'basic' | 'validations' | 'import';
type ImportMode = 'upload' | 'paste';

/**
 * Custom settings panel for the Section container — same chrome/tab pattern
 * as lib-custom-textarea. Three tabs: Basic Config (title/subtitle/columns/
 * anchor/listing), Validations (Visibility + Enable/Disable gates — Section
 * has no field-level validation of its own, but keeps the same tab layout
 * for consistency across the library), and Import (JSON import; export
 * lives in the footer).
 *
 * Visibility/Enable conditions are grouped into three fixed sections —
 * Privilege, Supporting Data, Other Field's Value — each with its own
 * "+ Add" in the section header, instead of a single mixed list with a
 * per-row source picker. Custom-code gating is hidden here for now (the
 * underlying gate.useCode support in shared/applicability.ts is untouched —
 * this panel just no longer offers a way to configure it, and forces it off
 * on save so re-saving an old field falls back to conditions).
 *
 * There's no list-wide any/all "Match" anymore either — each condition row
 * has its own plain checkbox (Condition.grouped, no visible label): checked
 * rows are AND-ed together into one clause, which is then OR-ed against
 * every unchecked row individually. See shared/applicability.ts's
 * evaluateConditions for the exact rule.
 *
 * There's also no more "Exclude Form Control When Hidden" option — hidden
 * fields always keep their value in the form now (see SectionComponent).
 *
 * Condition lists are stored as JSON-string settings, so they're edited here
 * as plain arrays and (de)serialized on open/save.
 */
@Component({
  selector: 'lib-section-settings-panel',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, InputTextModule, FormsModule, ReactiveFormsModule],
  templateUrl: './section-settings-panel.component.html',
  styleUrl: './section-settings-panel.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class SectionSettingsPanelComponent extends FxComponent {
  @Output() configuration = new EventEmitter<any>();

  visible = false;
  protected override readonly FxMode = FxMode;

  activeTab: SettingsTab = 'basic';

  visibilityPrivilegeConditions: Condition[] = [];
  visibilitySupportingDataConditions: Condition[] = [];
  visibilityFieldConditions: Condition[] = [];
  enablePrivilegeConditions: Condition[] = [];
  enableSupportingDataConditions: Condition[] = [];
  enableFieldConditions: Condition[] = [];

  importMode: ImportMode = 'upload';
  jsonInput = '';
  jsonImportError = '';
  uploadedFileName = '';

  settingsForm = new FormGroup({
    heading: new FormControl<string>('Section'),
    subtitle: new FormControl<string>(''),
    anchorKey: new FormControl<string>(''),
    columns: new FormControl<number>(2),
    showInListing: new FormControl<'true' | 'false'>('false'),
  });

  openDialog(): void {
    this.settingsForm.patchValue({
      heading: this.read('heading', 'Section'),
      subtitle: this.read('subtitle', ''),
      anchorKey: this.read('anchorKey', ''),
      columns: this.read('columns', 2),
      showInListing: this.read('showInListing', false) ? 'true' : 'false',
    });

    this.splitIntoSections(
      parseConditions(this.read('visibilityConditions', '[]')),
      (p, s, f) => { this.visibilityPrivilegeConditions = p; this.visibilitySupportingDataConditions = s; this.visibilityFieldConditions = f; },
    );
    this.splitIntoSections(
      parseConditions(this.read('enableConditions', '[]')),
      (p, s, f) => { this.enablePrivilegeConditions = p; this.enableSupportingDataConditions = s; this.enableFieldConditions = f; },
    );

    this.activeTab = 'basic';
    this.importMode = 'upload';
    this.jsonInput = '';
    this.jsonImportError = '';
    this.uploadedFileName = '';
    this.visible = true;
  }

  saveSettings(): void {
    const raw = this.settingsForm.getRawValue();
    this.write('heading', raw.heading);
    this.write('subtitle', raw.subtitle);
    this.write('anchorKey', raw.anchorKey);
    this.write('columns', raw.columns);
    this.write('showInListing', raw.showInListing === 'true');

    // Custom-code gating is hidden in this panel for now — force it off so re-saving
    // an old field (that may have had it on) falls back to conditions-only.
    this.write('visibilityUseCode', false);
    this.write('visibilityCode', '');
    this.write('visibilityConditions', JSON.stringify(this.combineSections(this.visibilityPrivilegeConditions, this.visibilitySupportingDataConditions, this.visibilityFieldConditions)));

    this.write('enableUseCode', false);
    this.write('enableCode', '');
    this.write('enableConditions', JSON.stringify(this.combineSections(this.enablePrivilegeConditions, this.enableSupportingDataConditions, this.enableFieldConditions)));

    this.configuration.emit(raw);
    this.visible = false;
  }

  closeDialog(): void {
    this.visible = false;
  }

  addCondition(list: Condition[], source: ConditionSource): void {
    list.push({ source, key: '', operator: source === 'privilege' ? 'truthy' : 'equals', value: '', grouped: false });
  }

  removeCondition(list: Condition[], index: number): void {
    list.splice(index, 1);
  }

  conditionKeyPlaceholder(source: ConditionSource): string {
    switch (source) {
      case 'field': return 'Other Field Name';
      case 'supportingData':
      default: return 'Supporting Data Key';
    }
  }

  // ── JSON import / export ─────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadedFileName = file.name;
    this.jsonImportError = '';
    const reader = new FileReader();
    reader.onload = (e) => { this.jsonInput = (e.target?.result as string) ?? ''; };
    reader.readAsText(file);
  }

  importFromJson(): void {
    this.jsonImportError = '';
    if (!this.jsonInput.trim()) {
      this.jsonImportError = this.importMode === 'upload' ? 'Please select a .json file first.' : 'Please paste a JSON configuration.';
      return;
    }
    let parsed: any;
    try {
      parsed = JSON.parse(this.jsonInput);
    } catch {
      this.jsonImportError = 'Invalid JSON — please check the format and try again.';
      return;
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      this.jsonImportError = 'JSON must be a configuration object, not an array or primitive.';
      return;
    }

    this.settingsForm.patchValue({
      heading: parsed.heading ?? 'Section',
      subtitle: parsed.subtitle ?? '',
      anchorKey: parsed.anchorKey ?? '',
      columns: parsed.columns ?? 2,
      showInListing: parsed.showInListing ?? 'false',
    });

    this.splitIntoSections(
      Array.isArray(parsed.visibilityConditions) ? parsed.visibilityConditions : [],
      (p, s, f) => { this.visibilityPrivilegeConditions = p; this.visibilitySupportingDataConditions = s; this.visibilityFieldConditions = f; },
    );
    this.splitIntoSections(
      Array.isArray(parsed.enableConditions) ? parsed.enableConditions : [],
      (p, s, f) => { this.enablePrivilegeConditions = p; this.enableSupportingDataConditions = s; this.enableFieldConditions = f; },
    );

    this.activeTab = 'basic';
    this.jsonInput = '';
    this.uploadedFileName = '';
    this.jsonImportError = '';
  }

  exportCurrentConfig(): void {
    const raw = this.settingsForm.getRawValue();
    const config = {
      ...raw,
      visibilityConditions: this.combineSections(this.visibilityPrivilegeConditions, this.visibilitySupportingDataConditions, this.visibilityFieldConditions),
      enableConditions: this.combineSections(this.enablePrivilegeConditions, this.enableSupportingDataConditions, this.enableFieldConditions),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `section-${raw.heading || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private splitIntoSections(list: Condition[], assign: (privilege: Condition[], supportingData: Condition[], field: Condition[]) => void): void {
    const privilege = list.filter((c) => c?.source === 'privilege');
    const supportingData = list.filter((c) => c?.source === 'supportingData');
    const field = list.filter((c) => c?.source !== 'privilege' && c?.source !== 'supportingData');
    assign(privilege, supportingData, field);
  }

  private combineSections(privilege: Condition[], supportingData: Condition[], field: Condition[]): Condition[] {
    return [...privilege, ...supportingData, ...field].filter(isConditionConfigured);
  }

  private read(key: string, def: any): any {
    const v = this.fxData?.settings?.find((s: any) => s.key === key)?.value;
    return v === undefined || v === null ? def : v;
  }

  private write(key: string, value: any): void {
    const s = this.fxData?.settings?.find((x: any) => x.key === key);
    if (s) s.value = value;
  }
}
