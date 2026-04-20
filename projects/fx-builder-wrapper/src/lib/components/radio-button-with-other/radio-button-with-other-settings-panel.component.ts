import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FxComponent, FxMode } from '@instantsys-labs/fx';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'lib-radio-button-with-other-settings-panel',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, InputTextModule, FormsModule, ReactiveFormsModule],
  templateUrl: './radio-button-with-other-settings-panel.component.html',
  styleUrl: './radio-button-with-other-settings-panel.component.css',
  encapsulation: ViewEncapsulation.None
})
export class RadioButtonWithOtherSettingsPanelComponent extends FxComponent {
  @Output() configuration = new EventEmitter<any>();

  visible = false;
  protected override readonly FxMode = FxMode;

  readonly serviceOptions = [
    { label: 'User Service',     value: 'user_service' },
    { label: 'Patient Service',  value: 'patient_service' },
    { label: 'Workflow Service', value: 'workflow_service' },
  ];

  manualOptions: { option: string; value: string }[] = [
    { option: 'Yes', value: 'yes' },
    { option: 'No',  value: 'no'  },
  ];

  settingsForm = new FormGroup({
    optionSource:     new FormControl<string>('api'),
    apiUrl:           new FormControl<string>(''),
    serviceName:      new FormControl<string>(''),
    labelKey:         new FormControl<string>('label'),
    valueKey:         new FormControl<string>('value'),
    label:            new FormControl<string>(''),
    showOtherOption:  new FormControl<string>('false'),
    otherLabel:       new FormControl<string>('Other'),
    otherPlaceholder: new FormControl<string>(''),
    otherMaxLength:   new FormControl<number>(768),
    isRequired:       new FormControl<string>('false'),
    errorMessage:     new FormControl<string>('Please select an option'),
    errorMessageOther:new FormControl<string>('Please fill out this field'),
    customClass:      new FormControl<string>(''),
  });

  get isApiMode(): boolean {
    return this.settingsForm.get('optionSource')?.value === 'api';
  }

  openDialog(): void {
    this.populateForm();
    this.visible = true;
  }

  private populateForm(): void {
    const config = this.fxData?.settings?.find((s: any) => s.key === 'radio-config')?.value || {};

    this.settingsForm.patchValue({
      optionSource:      config.optionSource      || 'api',
      apiUrl:            config.apiUrl            || '',
      serviceName:       config.serviceName       || '',
      labelKey:          config.labelKey          || 'label',
      valueKey:          config.valueKey          || 'value',
      label:             config.label             || '',
      showOtherOption:   config.showOtherOption   || 'false',
      otherLabel:        config.otherLabel        || 'Other',
      otherPlaceholder:  config.otherPlaceholder  || '',
      otherMaxLength:    config.otherMaxLength     || 768,
      isRequired:        config.isRequired        || 'false',
      errorMessage:      config.errorMessage      || 'Please select an option',
      errorMessageOther: config.errorMessageOther || 'Please fill out this field',
      customClass:       config.customClass       || '',
    });

    if (config.manualOptions?.length) {
      this.manualOptions = [...config.manualOptions];
    }
  }

  addOption(): void {
    this.manualOptions.push({ option: '', value: '' });
  }

  removeOption(index: number): void {
    this.manualOptions.splice(index, 1);
  }

  saveSettings(): void {
    const raw = this.settingsForm.getRawValue();
    const config = {
      ...raw,
      manualOptions: !this.isApiMode ? [...this.manualOptions] : [],
    };

    const configSetting = this.fxData?.settings?.find((s: any) => s.key === 'radio-config');
    if (configSetting) {
      configSetting.value = config;
    }

    this.configuration.emit(config);
    this.visible = false;
  }

  closeDialog(): void {
    this.visible = false;
  }
}
