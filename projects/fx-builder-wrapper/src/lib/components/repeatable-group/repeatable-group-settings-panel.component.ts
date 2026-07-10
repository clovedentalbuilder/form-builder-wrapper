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
 * Custom settings panel for the Repeatable Group container — same chrome/tab
 * pattern as lib-custom-textarea. Three tabs: Basic Config (titles/labels/
 * listing), Validations (Visibility + Enable/Disable gates — Repeatable
 * Group has no field-level validation of its own, but keeps the same tab
 * layout for consistency across the library), and Import (JSON import;
 * export lives in the footer).
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
 * groups always keep their value in the form now (see RepeatableGroupComponent).
 *
 * Condition lists are stored as JSON-string settings, so they're edited here
 * as plain arrays and (de)serialized on open/save.
 */
@Component({
  selector: 'lib-repeatable-group-settings-panel',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, InputTextModule, FormsModule, ReactiveFormsModule],
  templateUrl: './repeatable-group-settings-panel.component.html',
  styleUrl: './repeatable-group-settings-panel.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class RepeatableGroupSettingsPanelComponent extends FxComponent {
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
    groupTitle: new FormControl<string>('ITEMS'),
    addButtonText: new FormControl<string>('Add Item'),
    itemLabel: new FormControl<string>('ITEM'),
    showCreatedAt: new FormControl<'true' | 'false'>('true'),
    showInListing: new FormControl<'true' | 'false'>('false'),
  });

  openDialog(): void {
    this.settingsForm.patchValue({
      groupTitle: this.read('groupTitle', 'ITEMS'),
      addButtonText: this.read('addButtonText', 'Add Item'),
      itemLabel: this.read('itemLabel', 'ITEM'),
      showCreatedAt: this.read('showCreatedAt', true) ? 'true' : 'false',
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
    this.write('groupTitle', raw.groupTitle);
    this.write('addButtonText', raw.addButtonText);
    this.write('itemLabel', raw.itemLabel);
    this.write('showCreatedAt', raw.showCreatedAt === 'true');
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
      groupTitle: parsed.groupTitle ?? 'ITEMS',
      addButtonText: parsed.addButtonText ?? 'Add Item',
      itemLabel: parsed.itemLabel ?? 'ITEM',
      showCreatedAt: parsed.showCreatedAt ?? 'true',
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
    a.download = `repeatable-group-${raw.groupTitle || 'export'}.json`;
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
