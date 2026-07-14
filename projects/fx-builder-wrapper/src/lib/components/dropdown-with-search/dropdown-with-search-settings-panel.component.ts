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
 * Custom settings panel for the (pre-existing, production) Dropdown with
 * Search field — same chrome/tab pattern as lib-custom-textarea (Basic
 * Config / Validations / Import tabs, three-way-split Privilege/Supporting
 * Data/Other Field's Value condition sections, Export Config in the footer).
 *
 * BACKWARD COMPATIBILITY: every existing setting key (itemsSearchOption,
 * select-label-search, label-key-search, value-key-search,
 * searchSelectOptionAPIURL, serviceSearchName, isSearchRequired,
 * multiErrorSearch, placeholderSearch, customClassSearch) is unchanged.
 *
 * This panel deliberately does NOT expose (read, write, or show a control
 * for) the legacy disableWhenControl/disableWhenValue pair, the Enable/
 * Disable condition gate (enableUseCode/enableConditions/enableCode), or
 * "Exclude Form Control When Hidden" (excludeControlsWhenHidden) — none are
 * needed for this field. Crucially, this panel never WRITES those keys
 * either, so any already-configured production field's values for them are
 * left completely untouched (not reset/cleared) when re-saved through this
 * dialog — DropdownWithSearchComponent's own settings()/ConditionalDisableController
 * still declare and evaluate them at runtime exactly as before, only the
 * editing UI is gone.
 *
 * "Enable Search" (isSearchEnabled) toggles the dropdown's built-in filter
 * box — defaults to Yes (search visible), same Yes/No FxSelectSetting shape
 * as isSearchRequired (a string, not FxToggleSetting, so a saved "No" isn't
 * silently reverted back to the "Yes" class default by the fx library's
 * deepMergeObjects — see DropdownWithSearchComponent.settings()).
 */
@Component({
  selector: 'lib-dropdown-with-search-settings-panel',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, InputTextModule, FormsModule, ReactiveFormsModule],
  templateUrl: './dropdown-with-search-settings-panel.component.html',
  styleUrl: './dropdown-with-search-settings-panel.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class DropdownWithSearchSettingsPanelComponent extends FxComponent {
  @Output() configuration = new EventEmitter<any>();

  visible = false;
  protected override readonly FxMode = FxMode;

  activeTab: SettingsTab = 'basic';

  manualOptions: ManualOption[] = [];
  visibilityPrivilegeConditions: Condition[] = [];
  visibilitySupportingDataConditions: Condition[] = [];
  visibilityFieldConditions: Condition[] = [];

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
    selectLabelSearch: new FormControl<string>(''),
    labelKeySearch: new FormControl<string>('option'),
    valueKeySearch: new FormControl<string>('value'),
    placeholderSearch: new FormControl<string>('Select'),
    customClassSearch: new FormControl<string>(''),
    isSearchEnabled: new FormControl<'true' | 'false'>('true'),

    optionsSource: new FormControl<'manual' | 'api'>('manual'),
    searchSelectOptionAPIURL: new FormControl<string>(''),
    serviceSearchName: new FormControl<string>(''),

    isSearchRequired: new FormControl<'true' | 'false'>('true'),
    multiErrorSearch: new FormControl<string>('Please select'),

    visibilityUseCode: new FormControl<'true' | 'false'>('false'),
    visibilityCode: new FormControl<string>(''),
  });

  /** Strips the auto-appended id fragment (e.g. "-ae7f1950") from a freshly-dropped field's name for editing. */
  private cleanName(name: string | undefined): string {
    if (!name) return '';
    return name.replace(/-[0-9a-f]{8,}$/i, '');
  }

  openDialog(): void {
    const apiUrl = this.read('searchSelectOptionAPIURL', '');
    this.settingsForm.patchValue({
      name: this.cleanName(this.fxData?.name),
      selectLabelSearch: this.read('select-label-search', ''),
      labelKeySearch: this.read('label-key-search', 'option'),
      valueKeySearch: this.read('value-key-search', 'value'),
      placeholderSearch: this.read('placeholderSearch', 'Select'),
      customClassSearch: this.read('customClassSearch', ''),
      isSearchEnabled: this.read('isSearchEnabled', 'true'),

      optionsSource: apiUrl ? 'api' : 'manual',
      searchSelectOptionAPIURL: apiUrl,
      serviceSearchName: this.read('serviceSearchName', ''),

      isSearchRequired: this.read('isSearchRequired', 'true'),
      multiErrorSearch: this.read('multiErrorSearch', 'Please select'),

      visibilityUseCode: this.read('visibilityUseCode', false) ? 'true' : 'false',
      visibilityCode: this.read('visibilityCode', ''),
    });

    this.manualOptions = this.readOptions('itemsSearchOption');

    this.splitIntoSections(
      parseConditions(this.read('visibilityConditions', '[]')),
      (p, s, f) => { this.visibilityPrivilegeConditions = p; this.visibilitySupportingDataConditions = s; this.visibilityFieldConditions = f; },
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
    this.write('select-label-search', raw.selectLabelSearch);
    this.write('label-key-search', raw.labelKeySearch);
    this.write('value-key-search', raw.valueKeySearch);
    this.write('placeholderSearch', raw.placeholderSearch);
    this.write('customClassSearch', raw.customClassSearch);
    this.write('isSearchEnabled', raw.isSearchEnabled);

    this.write('searchSelectOptionAPIURL', raw.optionsSource === 'api' ? raw.searchSelectOptionAPIURL : '');
    this.write('serviceSearchName', raw.serviceSearchName);
    this.writeOptions('itemsSearchOption', this.cleanOptions(this.manualOptions));

    this.write('isSearchRequired', raw.isSearchRequired);
    this.write('multiErrorSearch', raw.multiErrorSearch);

    // Custom-code gating is hidden in this panel for now — force it off so re-saving
    // an old field (that may have had it on) falls back to conditions-only.
    this.write('visibilityUseCode', false);
    this.write('visibilityCode', '');
    this.write('visibilityConditions', JSON.stringify(this.combineSections(this.visibilityPrivilegeConditions, this.visibilitySupportingDataConditions, this.visibilityFieldConditions)));

    // Legacy disableWhenControl/disableWhenValue, the Enable/Disable condition gate, and
    // excludeControlsWhenHidden are intentionally never read or written here — see class doc.

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
      selectLabelSearch: parsed.selectLabelSearch ?? '',
      labelKeySearch: parsed.labelKeySearch ?? 'option',
      valueKeySearch: parsed.valueKeySearch ?? 'value',
      placeholderSearch: parsed.placeholderSearch ?? 'Select',
      customClassSearch: parsed.customClassSearch ?? '',
      isSearchEnabled: parsed.isSearchEnabled ?? 'true',

      optionsSource: parsed.optionsSource ?? 'manual',
      searchSelectOptionAPIURL: parsed.searchSelectOptionAPIURL ?? '',
      serviceSearchName: parsed.serviceSearchName ?? '',

      isSearchRequired: parsed.isSearchRequired ?? 'true',
      multiErrorSearch: parsed.multiErrorSearch ?? 'Please select',
    });

    this.manualOptions = Array.isArray(parsed.manualOptions)
      ? parsed.manualOptions.map((o: any) => ({ option: String(o?.option ?? ''), value: String(o?.value ?? '') }))
      : this.manualOptions;

    this.splitIntoSections(
      Array.isArray(parsed.visibilityConditions) ? parsed.visibilityConditions : [],
      (p, s, f) => { this.visibilityPrivilegeConditions = p; this.visibilitySupportingDataConditions = s; this.visibilityFieldConditions = f; },
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
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dropdown-with-search-${raw.name || 'export'}.json`;
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

  /** itemsSearchOption stores its live list on `.options`, not `.value` — see class doc. */
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
