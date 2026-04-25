import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FxComponent, FxMode } from '@instantsys-labs/fx';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'lib-checkbox-group-settings-panel',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, InputTextModule, FormsModule, ReactiveFormsModule],
  templateUrl: './checkbox-group-settings-panel.component.html',
  styleUrl: './checkbox-group-settings-panel.component.css',
  encapsulation: ViewEncapsulation.None
})
export class CheckboxGroupSettingsPanelComponent extends FxComponent {
  @Output() configuration = new EventEmitter<any>();

  visible = false;
  protected override readonly FxMode = FxMode;

  readonly serviceOptions = [
    { label: 'User Service',     value: 'user_service' },
    { label: 'Patient Service',  value: 'patient_service' },
    { label: 'Workflow Service', value: 'workflow_service' },
  ];

  manualOptions: { option: string; value: string; hasTextarea: boolean }[] = [
    { option: 'Option A', value: 'option_a', hasTextarea: false },
    { option: 'Option B', value: 'option_b', hasTextarea: false },
  ];

  regexList: { label: string; pattern: string }[] = [];

  settingsForm = new FormGroup({
    name:                 new FormControl<string>(''),
    optionSource:         new FormControl<string>('api'),
    apiUrl:               new FormControl<string>(''),
    serviceName:          new FormControl<string>(''),
    labelKey:             new FormControl<string>('label'),
    valueKey:             new FormControl<string>('value'),
    label:                new FormControl<string>(''),
    subLabel:             new FormControl<string>(''),
    displayMode:          new FormControl<string>('checkbox'),
    showOtherOption:      new FormControl<string>('false'),
    enableRegex:          new FormControl<string>('false'),
    otherLabel:           new FormControl<string>('Other'),
    otherPlaceholder:     new FormControl<string>(''),
    otherMaxLength:       new FormControl<number>(768),
    isRequired:           new FormControl<string>('false'),
    errorMessage:         new FormControl<string>('Please select at least one option'),
    errorMessageOther:    new FormControl<string>('Please fill out this field'),
    customClass:          new FormControl<string>(''),
    textareaOnValues:     new FormControl<string>(''),
    textareaLabel:        new FormControl<string>('Please specify'),
    textareaPlaceholder:  new FormControl<string>(''),
    textareaMaxLength:    new FormControl<number>(768),
    textareaRequired:     new FormControl<string>('false'),
    textareaErrorMessage: new FormControl<string>('Please fill out this field'),
  });

  private cleanName(name: string | undefined): string {
    if (!name) return '';
    return name.replace(/-[0-9a-f]{8,}$/i, '');
  }

  get isApiMode(): boolean {
    return this.settingsForm.get('optionSource')?.value === 'api';
  }

  get hasAnyTextareaOption(): boolean {
    return this.manualOptions.some(o => o.hasTextarea);
  }

  get hasTextareaOnValues(): boolean {
    return !!this.settingsForm.get('textareaOnValues')?.value?.trim();
  }

  openDialog(): void {
    this.populateForm();
    this.visible = true;
  }

  private populateForm(): void {
    const config = this.fxData?.settings?.find((s: any) => s.key === 'checkbox-group-config')?.value || {};

    this.settingsForm.patchValue({
      name:                 this.cleanName(this.fxData?.name),
      optionSource:         config.optionSource         || 'api',
      apiUrl:               config.apiUrl               || '',
      serviceName:          config.serviceName          || '',
      labelKey:             config.labelKey             || 'label',
      valueKey:             config.valueKey             || 'value',
      label:                config.label                || '',
      subLabel:             config.subLabel             || '',
      displayMode:          config.displayMode          || 'checkbox',
      showOtherOption:      config.showOtherOption      || 'false',
      enableRegex:          config.enableRegex          || 'false',
      otherLabel:           config.otherLabel           || 'Other',
      otherPlaceholder:     config.otherPlaceholder     || '',
      otherMaxLength:       config.otherMaxLength        || 768,
      isRequired:           config.isRequired           || 'false',
      errorMessage:         config.errorMessage         || 'Please select at least one option',
      errorMessageOther:    config.errorMessageOther    || 'Please fill out this field',
      customClass:          config.customClass          || '',
      textareaOnValues:     config.textareaOnValues     || '',
      textareaLabel:        config.textareaLabel        || 'Please specify',
      textareaPlaceholder:  config.textareaPlaceholder  || '',
      textareaMaxLength:    config.textareaMaxLength     || 768,
      textareaRequired:     config.textareaRequired     || 'false',
      textareaErrorMessage: config.textareaErrorMessage || 'Please fill out this field',
    });

    if (config.manualOptions?.length) {
      this.manualOptions = config.manualOptions.map((o: any) => ({
        option:      o.option      ?? '',
        value:       o.value       ?? '',
        hasTextarea: o.hasTextarea ?? false,
      }));
    }

    this.regexList = config.regexList?.length ? [...config.regexList] : [];
  }

  addOption(): void {
    this.manualOptions.push({ option: '', value: '', hasTextarea: false });
  }

  removeOption(index: number): void {
    this.manualOptions.splice(index, 1);
  }

  addRegex(): void {
    this.regexList.push({ label: '', pattern: '' });
  }

  removeRegex(index: number): void {
    this.regexList.splice(index, 1);
  }

  saveSettings(): void {
    const raw = this.settingsForm.getRawValue();
    const config = {
      ...raw,
      manualOptions: !this.isApiMode ? this.manualOptions.map(o => ({ ...o })) : [],
      regexList: raw.enableRegex === 'true' ? [...this.regexList] : [],
    };

    const configSetting = this.fxData?.settings?.find((s: any) => s.key === 'checkbox-group-config');
    if (configSetting) {
      configSetting.value = config;
    }

    if (this.fxData && raw.name) {
      this.fxData.name = raw.name;
    }

    this.configuration.emit(config);
    this.visible = false;
  }

  closeDialog(): void {
    this.visible = false;
  }
}
