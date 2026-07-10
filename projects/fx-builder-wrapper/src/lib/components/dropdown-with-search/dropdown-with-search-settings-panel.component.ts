import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FxComponent, FxMode } from '@instantsys-labs/fx';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Condition, ConditionSource, parseConditions } from '../shared/applicability';

export interface ManualOption {
  option: string;
  value: string;
}

/**
 * Custom settings panel for the (pre-existing, production) Dropdown with
 * Search field — same chrome pattern as Section/Repeatable Group/custom
 * Textbox. Replaces the generic <fx-component> settings dialog.
 *
 * BACKWARD COMPATIBILITY: every existing setting key (itemsSearchOption,
 * select-label-search, label-key-search, value-key-search,
 * searchSelectOptionAPIURL, serviceSearchName, isSearchRequired,
 * multiErrorSearch, placeholderSearch, customClassSearch, plus the legacy
 * disableWhenControl/disableWhenValue conditional-disable pair) is unchanged —
 * only the editing UI moved here. The legacy "Disable When" rule is kept
 * fully editable below (still applied at runtime via ConditionalDisableController,
 * OR'd with the new Enable/Disable gate) so already-configured fields keep working.
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

  manualOptions: ManualOption[] = [];
  visibilityConditions: Condition[] = [];
  enableConditions: Condition[] = [];

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

    optionsSource: new FormControl<'manual' | 'api'>('manual'),
    searchSelectOptionAPIURL: new FormControl<string>(''),
    serviceSearchName: new FormControl<string>(''),

    isSearchRequired: new FormControl<'true' | 'false'>('true'),
    multiErrorSearch: new FormControl<string>('Please select'),

    // Legacy conditional-disable (pre-existing) — kept editable for backward compat.
    disableWhenControl: new FormControl<string>(''),
    disableWhenValue: new FormControl<string>(''),

    visibilityUseCode: new FormControl<'true' | 'false'>('false'),
    visibilityConditionsMatch: new FormControl<'any' | 'all'>('any'),
    visibilityCode: new FormControl<string>(''),
    excludeControlsWhenHidden: new FormControl<'true' | 'false'>('false'),

    enableUseCode: new FormControl<'true' | 'false'>('false'),
    enableConditionsMatch: new FormControl<'any' | 'all'>('any'),
    enableCode: new FormControl<string>(''),
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

      optionsSource: apiUrl ? 'api' : 'manual',
      searchSelectOptionAPIURL: apiUrl,
      serviceSearchName: this.read('serviceSearchName', ''),

      isSearchRequired: this.read('isSearchRequired', 'true'),
      multiErrorSearch: this.read('multiErrorSearch', 'Please select'),

      disableWhenControl: this.read('disableWhenControl', ''),
      disableWhenValue: this.read('disableWhenValue', ''),

      visibilityUseCode: this.read('visibilityUseCode', false) ? 'true' : 'false',
      visibilityConditionsMatch: this.read('visibilityConditionsMatch', 'any'),
      visibilityCode: this.read('visibilityCode', ''),
      excludeControlsWhenHidden: this.read('excludeControlsWhenHidden', false) ? 'true' : 'false',

      enableUseCode: this.read('enableUseCode', false) ? 'true' : 'false',
      enableConditionsMatch: this.read('enableConditionsMatch', 'any'),
      enableCode: this.read('enableCode', ''),
    });
    this.manualOptions = this.readOptions('itemsSearchOption');
    this.visibilityConditions = parseConditions(this.read('visibilityConditions', '[]'));
    this.enableConditions = parseConditions(this.read('enableConditions', '[]'));
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

    this.write('searchSelectOptionAPIURL', raw.optionsSource === 'api' ? raw.searchSelectOptionAPIURL : '');
    this.write('serviceSearchName', raw.serviceSearchName);
    this.writeOptions('itemsSearchOption', this.cleanOptions(this.manualOptions));

    this.write('isSearchRequired', raw.isSearchRequired);
    this.write('multiErrorSearch', raw.multiErrorSearch);

    this.write('disableWhenControl', raw.disableWhenControl);
    this.write('disableWhenValue', raw.disableWhenValue);

    this.write('visibilityUseCode', raw.visibilityUseCode === 'true');
    this.write('visibilityConditionsMatch', raw.visibilityConditionsMatch);
    this.write('visibilityCode', raw.visibilityCode);
    this.write('visibilityConditions', JSON.stringify(this.cleanConditions(this.visibilityConditions)));
    this.write('excludeControlsWhenHidden', raw.excludeControlsWhenHidden === 'true');

    this.write('enableUseCode', raw.enableUseCode === 'true');
    this.write('enableConditionsMatch', raw.enableConditionsMatch);
    this.write('enableCode', raw.enableCode);
    this.write('enableConditions', JSON.stringify(this.cleanConditions(this.enableConditions)));

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

  addCondition(list: Condition[]): void {
    list.push({ source: 'supportingData', key: '', operator: 'equals', value: '' });
  }

  removeCondition(list: Condition[], index: number): void {
    list.splice(index, 1);
  }

  conditionKeyPlaceholder(source: ConditionSource): string {
    switch (source) {
      case 'privilege': return 'Privilege Name';
      case 'field': return 'Other Field Name';
      case 'supportingData':
      default: return 'Supporting Data Key';
    }
  }

  private cleanOptions(list: ManualOption[]): ManualOption[] {
    return list.filter((o) => String(o?.option ?? '').trim() || String(o?.value ?? '').trim());
  }

  private cleanConditions(list: Condition[]): Condition[] {
    return list.filter((c) => String(c?.key ?? '').trim());
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
