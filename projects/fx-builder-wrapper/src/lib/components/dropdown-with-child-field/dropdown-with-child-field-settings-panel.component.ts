import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FxComponent, FxMode } from '@instantsys-labs/fx';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

export interface DwcChildFieldConfig {
  optionValue: string;
  optionLabel: string;
  enabled: boolean;
  fieldType: '' | 'textbox' | 'textarea' | 'dropdown' | 'radiobutton' | 'checkbox';
  label: string;
  placeholder: string;
  isRequired: 'true' | 'false';
  errorMessage: string;
  maxLength: number;
  optionSource: 'api' | 'manual';
  apiUrl: string;
  serviceName: string;
  labelKey: string;
  valueKey: string;
  childManualOptions: { option: string; value: string }[];
  regexPattern: string;
  regexErrorMessage: string;
  childClass: string;
}

@Component({
  selector: 'lib-dropdown-with-child-field-settings-panel',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, InputTextModule, FormsModule, ReactiveFormsModule],
  templateUrl: './dropdown-with-child-field-settings-panel.component.html',
  styleUrl: './dropdown-with-child-field-settings-panel.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class DropdownWithChildFieldSettingsPanelComponent extends FxComponent {
  @Output() configuration = new EventEmitter<any>();

  visible = false;
  saveError = '';
  saveAttempted = false;
  protected override readonly FxMode = FxMode;
  expandedChildIndex: number | null = null;

  setupTab: 'manual' | 'quick' = 'manual';

  showJsonImport = false;
  importMode: 'upload' | 'paste' = 'upload';
  jsonInput = '';
  jsonImportError = '';
  uploadedFileName = '';

  readonly serviceOptions = [
    { label: 'User Service',     value: 'user_service' },
    { label: 'Patient Service',  value: 'patient_service' },
    { label: 'Workflow Service', value: 'workflow_service' },
  ];

  readonly fieldTypeOptions = [
    { label: 'Text Box',     value: 'textbox' },
    { label: 'Textarea',     value: 'textarea' },
    { label: 'Dropdown',     value: 'dropdown' },
    { label: 'Radio Button', value: 'radiobutton' },
    { label: 'Checkbox',     value: 'checkbox' },
  ];

  manualOptions: { option: string; value: string }[] = [
    { option: 'Yes', value: 'yes' },
    { option: 'No',  value: 'no' },
  ];

  childFieldConfigs: DwcChildFieldConfig[] = [];

  settingsForm = new FormGroup({
    name:         new FormControl<string>('', Validators.required),
    optionSource: new FormControl<string>('api'),
    apiUrl:       new FormControl<string>(''),
    serviceName:  new FormControl<string>(''),
    labelKey:     new FormControl<string>('label'),
    valueKey:     new FormControl<string>('value'),
    label:        new FormControl<string>('', Validators.required),
    subLabel:     new FormControl<string>(''),
    placeholder:  new FormControl<string>('Select an option'),
    isRequired:   new FormControl<string>('false'),
    errorMessage: new FormControl<string>('Please select an option'),
    customClass:  new FormControl<string>(''),
    parentClass:  new FormControl<string>(''),
  });

  private cleanName(name: string | undefined): string {
    if (!name) return '';
    return name.replace(/-[0-9a-f]{8,}$/i, '');
  }

  get isApiMode(): boolean {
    return this.settingsForm.get('optionSource')?.value === 'api';
  }

  openDialog(): void {
    this.populateForm();
    this.visible = true;
  }

  private populateForm(): void {
    const config = this.fxData?.settings?.find((s: any) => s.key === 'dropdown-with-child-config')?.value || {};

    this.settingsForm.patchValue({
      name:         this.cleanName(this.fxData?.name),
      optionSource: config.optionSource || 'api',
      apiUrl:       config.apiUrl       || '',
      serviceName:  config.serviceName  || '',
      labelKey:     config.labelKey     || 'label',
      valueKey:     config.valueKey     || 'value',
      label:        config.label        || '',
      subLabel:     config.subLabel     || '',
      placeholder:  config.placeholder  || 'Select an option',
      isRequired:   config.isRequired   || 'false',
      errorMessage: config.errorMessage || 'Please select an option',
      customClass:  config.customClass  || '',
      parentClass:  config.parentClass  || '',
    });

    if (config.manualOptions?.length) {
      this.manualOptions = [...config.manualOptions];
    }

    this.childFieldConfigs = [];
    if (config.childFields) {
      for (const [optVal, childCfg] of Object.entries(config.childFields) as [string, any][]) {
        this.childFieldConfigs.push({
          optionValue:        optVal,
          optionLabel:        childCfg.optionLabel        || optVal,
          enabled:            childCfg.enabled            ?? true,
          fieldType:          childCfg.fieldType          || 'textbox',
          label:              childCfg.label              || '',
          placeholder:        childCfg.placeholder        || '',
          isRequired:         childCfg.isRequired         || 'false',
          errorMessage:       childCfg.errorMessage       || 'This field is required',
          maxLength:          childCfg.maxLength          || 512,
          optionSource:       childCfg.optionSource       || 'manual',
          apiUrl:             childCfg.apiUrl             || '',
          serviceName:        childCfg.serviceName        || '',
          labelKey:           childCfg.labelKey           || 'label',
          valueKey:           childCfg.valueKey           || 'value',
          childManualOptions: childCfg.manualOptions      || [],
          regexPattern:       childCfg.regexPattern       || '',
          regexErrorMessage:  childCfg.regexErrorMessage  || '',
          childClass:         childCfg.childClass         || '',
        });
      }
    }

    this.expandedChildIndex = null;
    this.setupTab = 'manual';
    this.showJsonImport = false;
    this.jsonInput = '';
    this.uploadedFileName = '';
    this.jsonImportError = '';
    this.saveAttempted = false;
  }

  // ── Manual main-options management ───────────────────────────────────────────

  addOption(): void {
    this.manualOptions.push({ option: '', value: '' });
  }

  removeOption(index: number): void {
    this.manualOptions.splice(index, 1);
  }

  // ── Child field rules management ──────────────────────────────────────────────

  addChildRule(): void {
    this.childFieldConfigs.push({
      optionValue:        '',
      optionLabel:        '',
      enabled:            true,
      fieldType:          '',
      label:              '',
      placeholder:        '',
      isRequired:         'false',
      errorMessage:       'This field is required',
      maxLength:          512,
      optionSource:       'manual',
      apiUrl:             '',
      serviceName:        '',
      labelKey:           'label',
      valueKey:           'value',
      childManualOptions: [],
      regexPattern:       '',
      regexErrorMessage:  '',
      childClass:         '',
    });
    this.expandedChildIndex = this.childFieldConfigs.length - 1;
  }

  removeChildRule(index: number): void {
    this.childFieldConfigs.splice(index, 1);
    if (this.expandedChildIndex === index) {
      this.expandedChildIndex = null;
    } else if (this.expandedChildIndex !== null && this.expandedChildIndex > index) {
      this.expandedChildIndex--;
    }
  }

  toggleChildExpand(index: number): void {
    this.expandedChildIndex = this.expandedChildIndex === index ? null : index;
  }

  syncChildRulesFromManualOptions(): void {
    const existing = new Set(this.childFieldConfigs.map(c => c.optionValue));
    for (const opt of this.manualOptions) {
      if (opt.value && !existing.has(opt.value)) {
        this.childFieldConfigs.push({
          optionValue:        opt.value,
          optionLabel:        opt.option,
          enabled:            false,
          fieldType:          'textbox',
          label:              '',
          placeholder:        '',
          isRequired:         'false',
          errorMessage:       'This field is required',
          maxLength:          512,
          optionSource:       'manual',
          apiUrl:             '',
          serviceName:        '',
          labelKey:           'label',
          valueKey:           'value',
          childManualOptions: [],
          regexPattern:       '',
          regexErrorMessage:  '',
          childClass:         '',
        });
        existing.add(opt.value);
      }
    }
  }

  addChildOption(ruleIndex: number): void {
    this.childFieldConfigs[ruleIndex].childManualOptions.push({ option: '', value: '' });
  }

  removeChildOption(ruleIndex: number, optIndex: number): void {
    this.childFieldConfigs[ruleIndex].childManualOptions.splice(optIndex, 1);
  }

  isOptionBasedField(fieldType: string): boolean {
    return ['dropdown', 'radiobutton', 'checkbox'].includes(fieldType);
  }

  fieldTypeLabel(fieldType: string): string {
    return this.fieldTypeOptions.find(ft => ft.value === fieldType)?.label ?? fieldType;
  }

  fieldTypeIcon(fieldType: string): string {
    const icons: Record<string, string> = {
      textbox:     'pi-pencil',
      textarea:    'pi-align-left',
      dropdown:    'pi-chevron-circle-down',
      radiobutton: 'pi-circle',
      checkbox:    'pi-check-square',
    };
    return icons[fieldType] ?? 'pi-circle';
  }

  // ── JSON import / export ───────────────────────────────────────────────────────

  toggleJsonImport(): void {
    this.showJsonImport = !this.showJsonImport;
    this.jsonInput = '';
    this.jsonImportError = '';
    this.uploadedFileName = '';
    this.importMode = 'upload';
  }

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
      this.jsonImportError = this.importMode === 'upload'
        ? 'Please select a .json file first.'
        : 'Please paste a JSON configuration.';
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
      name:         parsed.name         ?? '',
      optionSource: parsed.optionSource ?? 'api',
      apiUrl:       parsed.apiUrl       ?? '',
      serviceName:  parsed.serviceName  ?? '',
      labelKey:     parsed.labelKey     ?? 'label',
      valueKey:     parsed.valueKey     ?? 'value',
      label:        parsed.label        ?? '',
      subLabel:     parsed.subLabel     ?? '',
      placeholder:  parsed.placeholder  ?? 'Select an option',
      isRequired:   parsed.isRequired   ?? 'false',
      errorMessage: parsed.errorMessage ?? 'Please select an option',
      customClass:  parsed.customClass  ?? '',
      parentClass:  parsed.parentClass  ?? '',
    });

    if (Array.isArray(parsed.manualOptions)) {
      this.manualOptions = parsed.manualOptions.map((o: any) => ({
        option: o.option ?? '',
        value:  o.value  ?? '',
      }));
    }

    this.childFieldConfigs = [];
    if (parsed.childFields && typeof parsed.childFields === 'object') {
      for (const [optVal, childCfg] of Object.entries(parsed.childFields) as [string, any][]) {
        this.childFieldConfigs.push({
          optionValue:        optVal,
          optionLabel:        childCfg.optionLabel        ?? optVal,
          enabled:            childCfg.enabled            ?? true,
          fieldType:          childCfg.fieldType          ?? 'textbox',
          label:              childCfg.label              ?? '',
          placeholder:        childCfg.placeholder        ?? '',
          isRequired:         childCfg.isRequired         ?? 'false',
          errorMessage:       childCfg.errorMessage       ?? 'This field is required',
          maxLength:          childCfg.maxLength          ?? 512,
          optionSource:       childCfg.optionSource       ?? 'manual',
          apiUrl:             childCfg.apiUrl             ?? '',
          serviceName:        childCfg.serviceName        ?? '',
          labelKey:           childCfg.labelKey           ?? 'label',
          valueKey:           childCfg.valueKey           ?? 'value',
          childManualOptions: Array.isArray(childCfg.manualOptions) ? childCfg.manualOptions : [],
          regexPattern:       childCfg.regexPattern       ?? '',
          regexErrorMessage:  childCfg.regexErrorMessage  ?? '',
          childClass:         childCfg.childClass         ?? '',
        });
      }
    }

    this.expandedChildIndex = null;
    this.setupTab = 'manual';
    this.showJsonImport = false;
    this.jsonInput = '';
    this.uploadedFileName = '';
    this.importMode = 'upload';
  }

  exportCurrentConfig(): void {
    if (!this.validateForm('export')) return;
    const raw = this.settingsForm.getRawValue();
    const childFields: Record<string, any> = {};
    for (const cfg of this.childFieldConfigs) {
      if (cfg.optionValue) {
        childFields[cfg.optionValue] = {
          optionLabel:       cfg.optionLabel,
          enabled:           cfg.enabled,
          fieldType:         cfg.fieldType,
          label:             cfg.label,
          placeholder:       cfg.placeholder,
          isRequired:        cfg.isRequired,
          errorMessage:      cfg.errorMessage,
          maxLength:         cfg.maxLength,
          optionSource:      cfg.optionSource,
          apiUrl:            cfg.apiUrl,
          serviceName:       cfg.serviceName,
          labelKey:          cfg.labelKey,
          valueKey:          cfg.valueKey,
          manualOptions:     cfg.childManualOptions,
          regexPattern:      cfg.regexPattern,
          regexErrorMessage: cfg.regexErrorMessage,
          childClass:        cfg.childClass,
        };
      }
    }
    const config = { ...raw, manualOptions: this.manualOptions, childFields };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dwc-config-${raw.name || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Save / close ──────────────────────────────────────────────────────────────

  private validateForm(action: 'save' | 'export' = 'save'): boolean {
    this.saveError = '';
    this.saveAttempted = true;

    const apiUrlCtrl      = this.settingsForm.get('apiUrl')!;
    const serviceNameCtrl = this.settingsForm.get('serviceName')!;
    if (this.isApiMode) {
      apiUrlCtrl.setValidators(Validators.required);
      serviceNameCtrl.setValidators(Validators.required);
    } else {
      apiUrlCtrl.clearValidators();
      serviceNameCtrl.clearValidators();
    }
    apiUrlCtrl.updateValueAndValidity({ emitEvent: false });
    serviceNameCtrl.updateValueAndValidity({ emitEvent: false });

    this.settingsForm.markAllAsTouched();

    if (this.settingsForm.invalid) {
      this.saveError = action === 'export'
        ? 'Please fill all required fields before exporting.'
        : 'Please fill all required fields before saving.';
      return false;
    }

    const raw = this.settingsForm.getRawValue();

    if (raw.optionSource === 'manual' && this.manualOptions.filter(o => o.option || o.value).length === 0) {
      this.saveError = 'Please add at least one option before saving.';
      return false;
    }

    for (let i = 0; i < this.childFieldConfigs.length; i++) {
      const cfg = this.childFieldConfigs[i];
      if (cfg.enabled && (!cfg.optionValue || !cfg.fieldType)) {
        this.expandedChildIndex = i;
        this.saveError = `Child rule ${i + 1} has missing required fields (option value or field type).`;
        return false;
      }
    }

    for (const cfg of this.childFieldConfigs) {
      if (
        cfg.enabled &&
        this.isOptionBasedField(cfg.fieldType) &&
        cfg.optionSource === 'manual' &&
        cfg.childManualOptions.filter(o => o.option || o.value).length === 0
      ) {
        this.saveError = `Child rule "${cfg.optionValue || 'unnamed'}" has no manual options. Add at least one or switch to API.`;
        return false;
      }
    }

    return true;
  }

  saveSettings(): void {
    if (!this.validateForm()) return;

    const raw = this.settingsForm.getRawValue();
    const childFields: Record<string, any> = {};
    for (const cfg of this.childFieldConfigs) {
      if (cfg.optionValue) {
        childFields[cfg.optionValue] = {
          optionLabel:       cfg.optionLabel,
          enabled:           cfg.enabled,
          fieldType:         cfg.fieldType,
          label:             cfg.label,
          placeholder:       cfg.placeholder,
          isRequired:        cfg.isRequired,
          errorMessage:      cfg.errorMessage,
          maxLength:         cfg.maxLength,
          optionSource:      cfg.optionSource,
          apiUrl:            cfg.apiUrl,
          serviceName:       cfg.serviceName,
          labelKey:          cfg.labelKey,
          valueKey:          cfg.valueKey,
          manualOptions:     cfg.childManualOptions,
          regexPattern:      cfg.regexPattern,
          regexErrorMessage: cfg.regexErrorMessage,
          childClass:        cfg.childClass,
        };
      }
    }

    const config = {
      ...raw,
      manualOptions: !this.isApiMode ? [...this.manualOptions] : [],
      childFields,
    };

    const configSetting = this.fxData?.settings?.find((s: any) => s.key === 'dropdown-with-child-config');
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
    this.saveAttempted = false;
    this.saveError = '';
  }
}
