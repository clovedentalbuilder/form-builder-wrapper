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
 * Custom settings panel for the (pre-existing, production) Multiselect Dropdown
 * field — same chrome pattern as Section/Repeatable Group/custom Textbox.
 * Replaces the generic <fx-component> settings dialog.
 *
 * BACKWARD COMPATIBILITY: every setting key here (itemsOption, select-label-multi,
 * label-key, multiSelectOptionAPIURL, serviceMultiName, isMultiRequired,
 * multiErrorMessage, placeholderMulti, customClassMulti) is unchanged from the
 * original settings() — only the EDITING UI moved from the generic settings
 * dialog to this custom one. Already-saved fields load their existing values
 * here unmodified, and the component's own value shape / patch flow is untouched.
 * `itemsOption`'s option list is read/written via its `.options` property (not
 * `.value`) because that's what MultiselectDropdownComponent itself reads.
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
    selectLabelMulti: new FormControl<string>(''),
    labelKey: new FormControl<string>('option'),
    placeholderMulti: new FormControl<string>('Select'),
    customClassMulti: new FormControl<string>(''),

    optionsSource: new FormControl<'manual' | 'api'>('manual'),
    multiSelectOptionAPIURL: new FormControl<string>(''),
    serviceMultiName: new FormControl<string>(''),

    isMultiRequired: new FormControl<'true' | 'false'>('true'),
    multiErrorMessage: new FormControl<string>('Please select'),

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

      visibilityUseCode: this.read('visibilityUseCode', false) ? 'true' : 'false',
      visibilityConditionsMatch: this.read('visibilityConditionsMatch', 'any'),
      visibilityCode: this.read('visibilityCode', ''),
      excludeControlsWhenHidden: this.read('excludeControlsWhenHidden', false) ? 'true' : 'false',

      enableUseCode: this.read('enableUseCode', false) ? 'true' : 'false',
      enableConditionsMatch: this.read('enableConditionsMatch', 'any'),
      enableCode: this.read('enableCode', ''),
    });
    this.manualOptions = this.readOptions('itemsOption');
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
    this.write('select-label-multi', raw.selectLabelMulti);
    this.write('label-key', raw.labelKey);
    this.write('placeholderMulti', raw.placeholderMulti);
    this.write('customClassMulti', raw.customClassMulti);

    this.write('multiSelectOptionAPIURL', raw.optionsSource === 'api' ? raw.multiSelectOptionAPIURL : '');
    this.write('serviceMultiName', raw.serviceMultiName);
    this.writeOptions('itemsOption', this.cleanOptions(this.manualOptions));

    this.write('isMultiRequired', raw.isMultiRequired);
    this.write('multiErrorMessage', raw.multiErrorMessage);

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

  /** itemsOption/itemsSearchOption store their live list on `.options`, not `.value` — see class doc. */
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
