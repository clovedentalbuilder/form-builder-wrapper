import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
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
    label:                  new FormControl(''),
    isRequired:             new FormControl('false'),
    errorMsg:               new FormControl('This field is required'),
    customClass:            new FormControl(''),
    useUserDefinedMapping:  new FormControl('false'),
    checkedValue:           new FormControl({ value: '', disabled: true }),
    uncheckedValue:         new FormControl({ value: '', disabled: true }),
  });

  openDialog(): void {
    this.populateForm();
    this.visible = true;
  }

  private populateForm(): void {
    // Read from the single 'checkbox-config' key (same pattern as dynamic-table's 'table-config')
    const config = this.fxData?.settings?.find((s: any) => s.key === 'checkbox-config')?.value || {};

    this.settingsForm.patchValue({
      label:                 config.label                 || 'Checkbox Label',
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
    const useMapping = this.settingsForm.get('useUserDefinedMapping')?.value === 'true';
    if (useMapping) {
      this.settingsForm.get('checkedValue')?.enable();
      this.settingsForm.get('uncheckedValue')?.enable();
    } else {
      this.settingsForm.get('checkedValue')?.disable();
      this.settingsForm.get('uncheckedValue')?.disable();
    }
  }

  saveSettings(): void {
    const raw = this.settingsForm.getRawValue();

    // Write the full config back into the single 'checkbox-config' setting key
    // (same pattern as dynamic-table's updateSettings() → 'table-config')
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
