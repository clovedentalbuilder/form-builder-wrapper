import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FxComponent, FxMode } from '@instantsys-labs/fx';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Condition, ConditionSource, isConditionConfigured, parseConditions } from '../shared/applicability';
import { toYesNo } from '../shared/yes-no-setting';

/** One row of the `items` option list (label + stored value). */
export interface RadioItem {
  option: string;
  value: string;
}

/** The three fixed subsections every gate is split into in this dialog. */
export interface GateSections {
  privilege: Condition[];
  supportingData: Condition[];
  field: Condition[];
}

type SettingsTab = 'basic' | 'validations' | 'import';
type ImportMode = 'upload' | 'paste';

function emptySections(): GateSections {
  return { privilege: [], supportingData: [], field: [] };
}

/**
 * Settings panel for lib-dependent-radio-group — the modern tabbed dialog
 * (Basic Config / Validations / Import) shared by custom-textarea,
 * multiselect-dropdown and the rest of the modern family.
 *
 * It differs from its siblings in one way: this component has THREE condition
 * gates (Visibility, Enable/Disable and the new "Required When") instead of two,
 * so the per-gate Privilege / Supporting Data / Other Field's Value arrays are
 * grouped into a `GateSections` object per gate rather than nine flat fields.
 * The markup and the stored JSON shape are unchanged from the siblings — each
 * gate still serialises to a flat `Condition[]` JSON string under its own key.
 *
 * Yes/No controls (isRequired, resetOnDisable, showInListing) are modelled as
 * FormControl<'true' | 'false'> and written back as the STRINGS 'true'/'false'
 * — see shared/yes-no-setting.ts for why booleans cannot be persisted.
 *
 * Custom-code gating is deliberately not exposed: on save all three *UseCode
 * flags are forced to 'false' and the *Code keys cleared, so re-saving an old
 * field falls back to conditions only.
 */
@Component({
  selector: 'lib-dependent-radio-group-settings-panel',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, InputTextModule, FormsModule, ReactiveFormsModule],
  templateUrl: './dependent-radio-group-settings-panel.component.html',
  styleUrl: './dependent-radio-group-settings-panel.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class DependentRadioGroupSettingsPanelComponent extends FxComponent {
  @Output() configuration = new EventEmitter<any>();

  visible = false;
  protected override readonly FxMode = FxMode;

  activeTab: SettingsTab = 'basic';

  items: RadioItem[] = [];

  visibility: GateSections = emptySections();
  enable: GateSections = emptySections();
  required: GateSections = emptySections();

  importMode: ImportMode = 'upload';
  jsonInput = '';
  jsonImportError = '';
  uploadedFileName = '';

  settingsForm = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    label: new FormControl<string>(''),
    display: new FormControl<'h' | 'v'>('v'),
    helpText: new FormControl<string>(''),
    showInListing: new FormControl<'true' | 'false'>('false'),

    isRequired: new FormControl<'true' | 'false'>('false'),
    requiredMessage: new FormControl<string>('Please select an option'),
    resetOnDisable: new FormControl<'true' | 'false'>('true'),
  });

  /** Strips the auto-appended id fragment (e.g. "-ae7f1950") from a freshly-dropped field's name for editing. */
  private cleanName(name: string | undefined): string {
    if (!name) return '';
    return name.replace(/-[0-9a-f]{8,}$/i, '');
  }

  openDialog(): void {
    this.settingsForm.patchValue({
      name: this.cleanName(this.fxData?.name),
      label: this.read('label', ''),
      display: this.read('display', 'v') === 'h' ? 'h' : 'v',
      helpText: this.read('helpText', ''),
      showInListing: toYesNo(this.read('showInListing', 'false')),

      isRequired: toYesNo(this.read('isRequired', 'false')),
      requiredMessage: this.read('requiredMessage', 'Please select an option'),
      resetOnDisable: toYesNo(this.read('resetOnDisable', 'true')),
    });

    this.items = this.readOptions('items');

    this.visibility = this.splitIntoSections(parseConditions(this.read('visibilityConditions', '[]')));
    this.enable = this.splitIntoSections(parseConditions(this.read('enableConditions', '[]')));
    this.required = this.splitIntoSections(parseConditions(this.read('requiredConditions', '[]')));

    this.activeTab = 'basic';
    this.importMode = 'upload';
    this.jsonInput = '';
    this.jsonImportError = '';
    this.uploadedFileName = '';
    this.visible = true;
  }

  saveSettings(): void {
    this.settingsForm.get('name')?.markAsTouched();
    if (this.settingsForm.get('name')?.invalid) return;

    const raw = this.settingsForm.getRawValue();
    if (this.fxData && raw.name) {
      this.fxData.name = raw.name;
    }

    this.write('label', raw.label);
    this.write('display', raw.display === 'h' ? 'h' : 'v');
    this.write('helpText', raw.helpText);
    this.write('showInListing', raw.showInListing === 'true' ? 'true' : 'false');
    this.writeOptions('items', this.cleanItems(this.items));

    this.write('isRequired', raw.isRequired === 'true' ? 'true' : 'false');
    this.write('requiredMessage', raw.requiredMessage);
    this.write('resetOnDisable', raw.resetOnDisable === 'true' ? 'true' : 'false');

    // Custom-code gating is not exposed in this panel — force it off so re-saving
    // an old field (that may have had it on) falls back to conditions only.
    this.write('visibilityUseCode', 'false');
    this.write('visibilityCode', '');
    this.write('visibilityConditions', JSON.stringify(this.combineSections(this.visibility)));

    this.write('enableUseCode', 'false');
    this.write('enableCode', '');
    this.write('enableConditions', JSON.stringify(this.combineSections(this.enable)));

    this.write('requiredUseCode', 'false');
    this.write('requiredCode', '');
    this.write('requiredConditions', JSON.stringify(this.combineSections(this.required)));

    this.configuration.emit(raw);
    this.visible = false;
  }

  closeDialog(): void {
    this.visible = false;
  }

  // ── Items editor ─────────────────────────────────────────────────────────

  addItem(): void {
    this.items.push({ option: '', value: '' });
  }

  removeItem(index: number): void {
    this.items.splice(index, 1);
  }

  // ── Condition rows ───────────────────────────────────────────────────────

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
      name: parsed.name ?? this.settingsForm.value.name,
      label: parsed.label ?? '',
      display: parsed.display === 'h' ? 'h' : 'v',
      helpText: parsed.helpText ?? '',
      showInListing: toYesNo(parsed.showInListing ?? 'false'),

      isRequired: toYesNo(parsed.isRequired ?? 'false'),
      requiredMessage: parsed.requiredMessage ?? 'Please select an option',
      resetOnDisable: toYesNo(parsed.resetOnDisable ?? 'true'),
    });

    this.items = Array.isArray(parsed.items)
      ? parsed.items.map((o: any) => ({ option: String(o?.option ?? ''), value: String(o?.value ?? '') }))
      : this.items;

    this.visibility = this.splitIntoSections(Array.isArray(parsed.visibilityConditions) ? parsed.visibilityConditions : []);
    this.enable = this.splitIntoSections(Array.isArray(parsed.enableConditions) ? parsed.enableConditions : []);
    this.required = this.splitIntoSections(Array.isArray(parsed.requiredConditions) ? parsed.requiredConditions : []);

    this.activeTab = 'basic';
    this.jsonInput = '';
    this.uploadedFileName = '';
    this.jsonImportError = '';
  }

  exportCurrentConfig(): void {
    const raw = this.settingsForm.getRawValue();
    const config = {
      ...raw,
      items: this.cleanItems(this.items),
      visibilityConditions: this.combineSections(this.visibility),
      enableConditions: this.combineSections(this.enable),
      requiredConditions: this.combineSections(this.required),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dependent-radio-group-${raw.name || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Storage helpers ──────────────────────────────────────────────────────

  private cleanItems(list: RadioItem[]): RadioItem[] {
    return list.filter((o) => String(o?.option ?? '').trim() || String(o?.value ?? '').trim());
  }

  private splitIntoSections(list: Condition[]): GateSections {
    return {
      privilege: list.filter((c) => c?.source === 'privilege'),
      supportingData: list.filter((c) => c?.source === 'supportingData'),
      field: list.filter((c) => c?.source !== 'privilege' && c?.source !== 'supportingData'),
    };
  }

  private combineSections(sections: GateSections): Condition[] {
    return [...sections.privilege, ...sections.supportingData, ...sections.field].filter(isConditionConfigured);
  }

  /** `items` is an FxOptionSetting — its live list lives on `.options`, mirrored to `.value` on write. */
  private readOptions(key: string): RadioItem[] {
    const s: any = this.fxData?.settings?.find((x: any) => x.key === key);
    return Array.isArray(s?.options) ? s.options.map((o: any) => ({ option: o?.option ?? '', value: o?.value ?? '' })) : [];
  }

  private writeOptions(key: string, options: RadioItem[]): void {
    const s: any = this.fxData?.settings?.find((x: any) => x.key === key);
    if (s) {
      s.options = options;
      s.value = options;
    }
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
