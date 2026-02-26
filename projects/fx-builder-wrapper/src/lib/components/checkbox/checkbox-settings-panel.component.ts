import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FxComponent, FxMode } from '@instantsys-labs/fx';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'lib-checkbox-settings-panel',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, InputTextModule, FormsModule, ReactiveFormsModule],
  templateUrl: './checkbox-settings-panel.component.html',
  styleUrl: './checkbox-settings-panel.component.css',
  encapsulation: ViewEncapsulation.None
})
export class CheckboxSettingsPanelComponent extends FxComponent {
  @Output() configuration = new EventEmitter<any>();

  visible = false;
  protected override readonly FxMode = FxMode;

  settingsForm = new FormGroup({
    label:                 new FormControl(''),
    tooltipText:           new FormControl(''),           // new: tooltip shown on hover
    isRequired:            new FormControl('false'),
    errorMsg:              new FormControl('This field is required'),
    customClass:           new FormControl(''),
    useUserDefinedMapping: new FormControl('false'),
    checkedValue:          new FormControl({ value: '', disabled: true }),
    uncheckedValue:        new FormControl({ value: '', disabled: true }),
  });

  /** True when "Use user defined mapping" is set to Yes */
  get isMappingActive(): boolean {
    return this.settingsForm.get('useUserDefinedMapping')?.value === 'true';
  }

  openDialog(): void {
    this.populateForm();
    this.visible = true;
  }

  private populateForm(): void {
    const config = this.fxData?.settings?.find((s: any) => s.key === 'checkbox-config')?.value || {};

    this.settingsForm.patchValue({
      label:                 config.label                 || 'Checkbox Label',
      tooltipText:           config.tooltipText           || '',
      isRequired:            config.isRequired            || 'false',
      errorMsg:              config.errorMsg              || 'This field is required',
      customClass:           config.customClass           || '',
      useUserDefinedMapping: config.useUserDefinedMapping || 'false',
      checkedValue:          config.checkedValue          || '',
      uncheckedValue:        config.uncheckedValue        || '',
    });

    this.applyMappingState();
  }

  applyMappingState(): void {
    const checkedCtrl   = this.settingsForm.get('checkedValue');
    const uncheckedCtrl = this.settingsForm.get('uncheckedValue');

    if (this.isMappingActive) {
      checkedCtrl?.enable();
      checkedCtrl?.setValidators([Validators.required]);   // mandatory when mapping on
      uncheckedCtrl?.enable();
      uncheckedCtrl?.setValidators([Validators.required]); // mandatory when mapping on
    } else {
      checkedCtrl?.disable();
      checkedCtrl?.clearValidators();
      uncheckedCtrl?.disable();
      uncheckedCtrl?.clearValidators();
    }

    checkedCtrl?.updateValueAndValidity();
    uncheckedCtrl?.updateValueAndValidity();
  }

  saveSettings(): void {
    // Block save and surface errors if mapping fields are empty
    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      return;
    }

    const raw = this.settingsForm.getRawValue();

    const configSetting = this.fxData?.settings?.find((s: any) => s.key === 'checkbox-config');
    if (configSetting) {
      configSetting.value = raw;
    }

    this.configuration.emit(raw);
    this.visible = false;
  }

  closeDialog(): void {
    this.visible = false;
  }
}
