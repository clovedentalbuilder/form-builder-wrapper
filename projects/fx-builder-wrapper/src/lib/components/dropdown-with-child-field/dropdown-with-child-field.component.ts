import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { ApiServiceRegistry } from '@instantsys-labs/core';
import { FxBaseComponent, FxSetting, FxStringSetting, FxValidation, FxValidatorService } from '@instantsys-labs/fx';
import { Subject, takeUntil } from 'rxjs';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { DropdownWithChildFieldSettingsPanelComponent } from './dropdown-with-child-field-settings-panel.component';

@Component({
  selector: 'lib-dropdown-with-child-field',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DropdownWithChildFieldSettingsPanelComponent],
  templateUrl: './dropdown-with-child-field.component.html',
  styleUrl: './dropdown-with-child-field.component.css',
})
export class DropdownWithChildFieldComponent extends FxBaseComponent implements OnInit, AfterViewInit {
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<boolean>();

  @ViewChild('fxComponent') fxComponent!: DropdownWithChildFieldSettingsPanelComponent;

  readonly instanceId = `dwc-${Math.random().toString(36).slice(2, 7)}`;

  options: any[] = [];
  childOptionMap = new Map<string, any[]>();
  valueMap = new Map<string, any>();

  private childValueCache = new Map<string, any>();
  private viewInitialized = false;
  private hasPatched = false;

  activeChildConfig: any = null;
  selectedOption: string = '';

  config: any = {
    optionSource:  'api',
    apiUrl:        '',
    serviceName:   '',
    labelKey:      'label',
    valueKey:      'value',
    manualOptions: [],
    label:         '',
    subLabel:      '',
    placeholder:   'Select an option',
    isRequired:    'false',
    errorMessage:  'Please select an option',
    customClass:   '',
    childFields:   {},
  };

  form: FormGroup = this.fb.group({
    dwcParentValue: [''],
    dwcChildValue:  [''],
  });

  constructor(
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private fxApiService: ApiServiceRegistry,
    private fxBuilderWrapperService: FxBuilderWrapperService,
  ) {
    super(cdr);
    this.onInit.subscribe(() => {
      this._register(this.form);
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const savedConfig = this.setting('dropdown-with-child-config');
      if (savedConfig && typeof savedConfig === 'object' && Object.keys(savedConfig).length) {
        this.config = { ...this.config, ...savedConfig };
      }
      this.applySettings(this.config);
      this.viewInitialized = true;
      this.patchSavedValues();
    }, 100);
  }

  ngOnInit(): void {
    this.fxBuilderWrapperService.variables$
      .pipe(takeUntil(this.destroy$))
      .subscribe((variables: any) => {
        if (!variables) return;
        for (const [key, entry] of Object.entries(variables) as [string, any][]) {
          if (
            entry &&
            typeof entry === 'object' &&
            'dwcParentValue' in entry &&
            'dwcChildValue' in entry
          ) {
            this.valueMap.set(key, entry);
          }
        }
        if (this.viewInitialized) {
          this.patchSavedValues();
        }
      });
  }

  private patchSavedValues(): void {
    if (this.hasPatched) return;
    const key = this.fxComponent?.fxData?.name;
    if (!key || !this.valueMap.has(key)) return;
    const data = this.valueMap.get(key);
    const sel = data.dwcParentValue ?? '';
    this.hasPatched = true;
    this.form.get('dwcParentValue')?.setValue(sel);
    if (sel) {
      this.onSelectionChange(sel);
      if (data.dwcChildValue !== undefined && data.dwcChildValue !== null) {
        this.childFieldControl.setValue(data.dwcChildValue);
      }
    }
    this.cdr.detectChanges();
  }

  onSettingsChanged(config: any): void {
    this.config = { ...config };
    this.applySettings(this.config);
    this.cdr.detectChanges();
  }

  private applySettings(config: any): void {
    const mainCtrl = this.form.get('dwcParentValue');
    if (config.isRequired === 'true') {
      mainCtrl?.setValidators([Validators.required]);
    } else {
      mainCtrl?.clearValidators();
    }
    mainCtrl?.updateValueAndValidity();

    this.childFieldControl.setValue('');
    this.childFieldControl.clearValidators();
    this.childFieldControl.updateValueAndValidity();
    this.childValueCache.clear();

    if (config.optionSource === 'manual') {
      this.options = (config.manualOptions || []).map((o: any) => ({ label: o.option, value: o.value }));
    } else {
      const serviceUrl = this.fxApiService.getServiceUrl(config.serviceName);
      this.loadMainOptions(serviceUrl, config.apiUrl, config);
    }

    if (config.childFields) {
      for (const [optVal, childCfg] of Object.entries(config.childFields) as [string, any][]) {
        if (childCfg.enabled && this.isOptionBasedField(childCfg.fieldType)) {
          this.loadChildOptions(optVal, childCfg);
        }
      }
    }
  }

  private loadMainOptions(serviceUrl: string, url: string, config: any): void {
    if (!url) {
      this.options = [...this.mockOptions];
      return;
    }
    this.http.get<any>(serviceUrl + url).subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : (res?.data || []);
        this.options = raw.map((item: any) => ({
          label: item[config.labelKey || 'label'],
          value: item[config.valueKey || 'value'],
        }));
      },
      error: () => { this.options = [...this.mockOptions]; },
    });
  }

  private loadChildOptions(optionValue: string, childConfig: any): void {
    if (childConfig.optionSource === 'manual') {
      this.childOptionMap.set(
        optionValue,
        (childConfig.manualOptions || []).map((o: any) => ({ label: o.option, value: o.value })),
      );
      return;
    }
    const serviceUrl = this.fxApiService.getServiceUrl(childConfig.serviceName);
    if (!childConfig.apiUrl) {
      this.childOptionMap.set(optionValue, [...this.mockOptions]);
      return;
    }
    this.http.get<any>(serviceUrl + childConfig.apiUrl).subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : (res?.data || []);
        this.childOptionMap.set(optionValue, raw.map((item: any) => ({
          label: item[childConfig.labelKey || 'label'],
          value: item[childConfig.valueKey || 'value'],
        })));
      },
      error: () => { this.childOptionMap.set(optionValue, [...this.mockOptions]); },
    });
  }

  private readonly mockOptions: any[] = [
    { value: 'option_1', label: 'Option 1' },
    { value: 'option_2', label: 'Option 2' },
    { value: 'option_3', label: 'Option 3' },
  ];

  onSelectionChange(value: string): void {
    if (this.selectedOption && this.activeChildConfig !== null) {
      this.childValueCache.set(this.selectedOption, this.childFieldControl.value);
    }

    this.selectedOption = value;
    const childCfg = (this.config.childFields || {})[value];

    if (childCfg?.enabled) {
      this.activeChildConfig = childCfg;

      const cached = this.childValueCache.get(value);
      const defaultVal = childCfg.fieldType === 'checkbox' ? [] : '';
      this.childFieldControl.setValue(cached !== undefined ? cached : defaultVal);

      const validators: ValidatorFn[] = [];
      if (childCfg.isRequired === 'true') {
        validators.push(childCfg.fieldType === 'checkbox' ? this.requiredArrayValidator() : Validators.required);
      }
      if (childCfg.regexPattern && childCfg.fieldType !== 'checkbox') {
        validators.push(Validators.pattern(childCfg.regexPattern));
      }
      this.childFieldControl.setValidators(validators.length ? validators : null);
      this.childFieldControl.enable();
      this.childFieldControl.updateValueAndValidity();

      if (this.isOptionBasedField(childCfg.fieldType) && !this.childOptionMap.has(value)) {
        this.loadChildOptions(value, childCfg);
      }
    } else {
      this.activeChildConfig = null;
      this.childFieldControl.clearValidators();
      this.childFieldControl.setValue('');
      this.childFieldControl.updateValueAndValidity();
    }
  }

  private requiredArrayValidator(): ValidatorFn {
    return (control: AbstractControl) =>
      Array.isArray(control.value) && control.value.length > 0 ? null : { required: true };
  }

  isOptionBasedField(fieldType: string): boolean {
    return ['dropdown', 'radiobutton', 'checkbox'].includes(fieldType);
  }

  get mainDropdownControl(): FormControl {
    return this.form.get('dwcParentValue') as FormControl;
  }

  get childFieldControl(): FormControl {
    return this.form.get('dwcChildValue') as FormControl;
  }

  getChildOptions(optionValue: string): any[] {
    return this.childOptionMap.get(optionValue) || [];
  }

  isCheckboxSelected(optValue: string): boolean {
    const val = this.childFieldControl.value;
    return Array.isArray(val) && val.includes(optValue);
  }

  onCheckboxChange(optValue: string, checked: boolean): void {
    const current: string[] = Array.isArray(this.childFieldControl.value) ? [...this.childFieldControl.value] : [];
    if (checked) {
      if (!current.includes(optValue)) current.push(optValue);
    } else {
      const idx = current.indexOf(optValue);
      if (idx > -1) current.splice(idx, 1);
    }
    this.childFieldControl.setValue(current);
    this.childFieldControl.markAsTouched();
  }

  get isRequired(): boolean {
    return this.config.isRequired === 'true';
  }

  protected settings(): FxSetting[] {
    return [
      new FxStringSetting({ key: 'dropdown-with-child-config', $title: 'Dropdown with Child Config', value: {} }),
    ];
  }

  protected validations(): FxValidation[] {
    return [FxValidatorService.required];
  }
}
