import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FxComponent, FxMode } from '@instantsys-labs/fx';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Condition, ConditionSource, isConditionConfigured, parseConditions } from '../shared/applicability';

export interface ManualOption {
  option: string;
  value: string;
}

type SettingsTab = 'basic' | 'validations' | 'import';
type ImportMode = 'upload' | 'paste';

/**
 * Custom settings panel for the (pre-existing, production) Multiselect Dropdown
 * field — same chrome/tab pattern as lib-custom-textbox (Basic Config /
 * Validations / Import tabs, three-way-split Privilege/Supporting Data/Other
 * Field's Value condition sections, Export Config in the footer).
 *
 * BACKWARD COMPATIBILITY: every existing setting key (itemsOption, select-label-multi,
 * label-key, multiSelectOptionAPIURL, serviceMultiName, isMultiRequired,
 * multiErrorMessage, placeholderMulti, customClassMulti) is unchanged — only the
 * editing UI moved. `itemsOption`'s option list is read/written via its `.options`
 * property (not `.value`) because that's what MultiselectDropdownComponent itself reads.
 *
 * Visibility/Enable conditions are grouped into three fixed sections — Privilege,
 * Supporting Data, Other Field's Value — each with its own "+ Add" in the section
 * header, instead of a single mixed list with a per-row source picker and a
 * list-wide any/all "Match" (same as lib-custom-textbox). Custom-code gating is
 * hidden here for now (the underlying gate.useCode support in shared/applicability.ts
 * is untouched — this panel just no longer offers a way to configure it, and forces
 * it off on save so re-saving an old field falls back to conditions).
 *
 * "Exclude Form Control When Hidden" (excludeControlsWhenHidden) is intentionally
 * never read, written, or shown here — MultiselectDropdownComponent's own
 * settings()/ngDoCheck/FieldControlIncludeController still declare and evaluate it
 * at runtime exactly as before, so any already-configured production field's value
 * is left completely untouched (not reset) when re-saved through this dialog; only
 * the editing UI is gone.
 */
@Component({
  selector: 'lib-multiselect-dropdown-settings-panel',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, InputTextModule, FormsModule, ReactiveFormsModule],
  templateUrl: './multiselect-dropdown-settings-panel.component.html',
  styleUrl: './multiselect-dropdown-settings-panel.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class MultiselectDropdownSettingsPanelComponent extends FxComponent {
  @Output() configuration = new EventEmitter<any>();

  visible = false;
  protected override readonly FxMode = FxMode;

  activeTab: SettingsTab = 'basic';

  manualOptions: ManualOption[] = [];
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

  readonly serviceOptions = [
    { label: 'User Service', value: 'user_service' },
    { label: 'Patient Service', value: 'patient_service' },
    { label: 'Workflow Service', value: 'workflow_service' },
  ];

  settingsForm = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    selectLabelMulti: new FormControl<string>(''),
    labelKey: new FormControl<string>('option'),
    placeholderMulti: new FormControl<string>('Select'),
    customClassMulti: new FormControl<string>(''),

    optionsSource: new FormControl<'manual' | 'api'>('manual'),
    multiSelectOptionAPIURL: new FormControl<string>(''),
    serviceMultiName: new FormControl<string>(''),

    isMultiRequired: new FormControl<'true' | 'false'>('true'),
    multiErrorMessage: new FormControl<string>('Please select'),
  });

  /** Strips the auto-appended id fragment (e.g. "-ae7f1950") from a freshly-dropped field's name for editing. */
  private cleanName(name: string | undefined): string {
    if (!name) return '';
    return name.replace(/-[0-9a-f]{8,}$/i, '');
  }

  openDialog(): void {
    const apiUrl = this.read('multiSelectOptionAPIURL', '');
    this.settingsForm.patchValue({
      name: this.cleanName(this.fxData?.name),
      selectLabelMulti: this.read('select-label-multi', ''),
      labelKey: this.read('label-key', 'option'),
      placeholderMulti: this.read('placeholderMulti', 'Select'),
      customClassMulti: this.read('customClassMulti', ''),

      optionsSource: apiUrl ? 'api' : 'manual',
      multiSelectOptionAPIURL: apiUrl,
      serviceMultiName: this.read('serviceMultiName', ''),

      isMultiRequired: this.read('isMultiRequired', 'true'),
      multiErrorMessage: this.read('multiErrorMessage', 'Please select'),
    });

    this.manualOptions = this.readOptions('itemsOption');

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
    this.settingsForm.get('name')?.markAsTouched();
    if (this.settingsForm.get('name')?.invalid) return;

    const raw = this.settingsForm.getRawValue();
    if (this.fxData && raw.name) {
      this.fxData.name = raw.name;
    }
    this.write('select-label-multi', raw.selectLabelMulti);
    this.write('label-key', raw.labelKey);
    this.write('placeholderMulti', raw.placeholderMulti);
    this.write('customClassMulti', raw.customClassMulti);

    this.write('multiSelectOptionAPIURL', raw.optionsSource === 'api' ? raw.multiSelectOptionAPIURL : '');
    this.write('serviceMultiName', raw.serviceMultiName);
    this.writeOptions('itemsOption', this.cleanOptions(this.manualOptions));

    this.write('isMultiRequired', raw.isMultiRequired);
    this.write('multiErrorMessage', raw.multiErrorMessage);
    // excludeControlsWhenHidden is intentionally never written here — see class doc.

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

  addOption(): void {
    this.manualOptions.push({ option: '', value: '' });
  }

  removeOption(index: number): void {
    this.manualOptions.splice(index, 1);
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
      name: parsed.name ?? this.settingsForm.value.name,
      selectLabelMulti: parsed.selectLabelMulti ?? '',
      labelKey: parsed.labelKey ?? 'option',
      placeholderMulti: parsed.placeholderMulti ?? 'Select',
      customClassMulti: parsed.customClassMulti ?? '',

      optionsSource: parsed.optionsSource ?? 'manual',
      multiSelectOptionAPIURL: parsed.multiSelectOptionAPIURL ?? '',
      serviceMultiName: parsed.serviceMultiName ?? '',

      isMultiRequired: parsed.isMultiRequired ?? 'true',
      multiErrorMessage: parsed.multiErrorMessage ?? 'Please select',
    });

    this.manualOptions = Array.isArray(parsed.manualOptions)
      ? parsed.manualOptions.map((o: any) => ({ option: String(o?.option ?? ''), value: String(o?.value ?? '') }))
      : this.manualOptions;

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
      manualOptions: this.cleanOptions(this.manualOptions),
      visibilityConditions: this.combineSections(this.visibilityPrivilegeConditions, this.visibilitySupportingDataConditions, this.visibilityFieldConditions),
      enableConditions: this.combineSections(this.enablePrivilegeConditions, this.enableSupportingDataConditions, this.enableFieldConditions),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `multiselect-dropdown-${raw.name || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private cleanOptions(list: ManualOption[]): ManualOption[] {
    return list.filter((o) => String(o?.option ?? '').trim() || String(o?.value ?? '').trim());
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

  /** itemsOption stores its live list on `.options`, not `.value` — see class doc. */
  private readOptions(key: string): ManualOption[] {
    const s: any = this.fxData?.settings?.find((x: any) => x.key === key);
    return Array.isArray(s?.options) ? s.options.map((o: any) => ({ option: o?.option ?? '', value: o?.value ?? '' })) : [];
  }

  private writeOptions(key: string, options: ManualOption[]): void {
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
