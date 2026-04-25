import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { ApiServiceRegistry } from '@instantsys-labs/core';
import { FxBaseComponent, FxSetting, FxStringSetting, FxValidation, FxValidatorService } from '@instantsys-labs/fx';
import { Subject, takeUntil } from 'rxjs';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { CheckboxGroupSettingsPanelComponent } from './checkbox-group-settings-panel.component';

@Component({
  selector: 'lib-checkbox-group',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, CheckboxGroupSettingsPanelComponent],
  templateUrl: './checkbox-group.component.html',
  styleUrl: './checkbox-group.component.css'
})
export class CheckboxGroupComponent extends FxBaseComponent implements OnInit, AfterViewInit {
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<boolean>();

  @ViewChild('fxComponent') fxComponent!: CheckboxGroupSettingsPanelComponent;

  options: any[] = [];
  checkboxMap = new Map<string, any>();
  private pendingRestore: any = null;
  isRequired: boolean = false;
  isChildRequired: boolean = false;
  otherMaxLength: number = 768;
  remainingChars: number = 768;
  showOtherInput: boolean = false;

  checkboxGroupConfig: any = {
    optionSource:         'api',
    apiUrl:               '',
    serviceName:          '',
    labelKey:             'label',
    valueKey:             'value',
    manualOptions:        [],
    label:                '',
    subLabel:             '',
    displayMode:          'checkbox',
    showOtherOption:      'false',
    otherLabel:           'Other',
    otherPlaceholder:     '',
    otherMaxLength:       768,
    isRequired:           'false',
    errorMessage:         'Please select at least one option',
    errorMessageOther:    'Please fill out this field',
    customClass:          '',
    enableRegex:          'false',
    regexList:            [],
    textareaOnValues:     '',
    textareaLabel:        'Please specify',
    textareaPlaceholder:  '',
    textareaMaxLength:    768,
    textareaRequired:     'false',
    textareaErrorMessage: 'Please fill out this field',
  };

  public checkboxGroupForm: FormGroup = this.fb.group({
    selectedCheckboxOption: [[] as string[]],
    otherInput:      [{ value: '', disabled: true }],
    textareaValues:  this.fb.group({}),
  });

  private get textareaValuesGroup(): FormGroup {
    return this.checkboxGroupForm.get('textareaValues') as FormGroup;
  }

  constructor(
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private fxApiService: ApiServiceRegistry,
    private fxBuilderWrapperService: FxBuilderWrapperService
  ) {
    super(cdr);
    this.onInit.subscribe(() => {
      this._register(this.checkboxGroupForm);
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const savedConfig = this.setting('checkbox-group-config');
      if (savedConfig && typeof savedConfig === 'object' && Object.keys(savedConfig).length) {
        this.checkboxGroupConfig = { ...this.checkboxGroupConfig, ...savedConfig };
      }
      this.applySettings(this.checkboxGroupConfig);
    }, 100);

    setTimeout(() => {
      const key = this.fxComponent?.fxData?.name;
      if (key && this.checkboxMap.has(key)) {
        this.pendingRestore = this.checkboxMap.get(key);
        this.applyRestore();
      }
    }, 200);
  }

  ngOnInit(): void {
    this.fxBuilderWrapperService.variables$
      .pipe(takeUntil(this.destroy$))
      .subscribe((variables: any) => {
        if (!variables) return;
        for (const [key, entry] of Object.entries(variables) as [string, any][]) {
          if (entry && typeof entry === 'object' && ('selectedCheckboxOption' in entry || 'selectedOption' in entry)) {
            this.checkboxMap.set(key, entry);
          }
        }
      });

    const otherControl = this.checkboxGroupForm.get('otherInput');
    otherControl?.valueChanges.subscribe(value => {
      this.remainingChars = this.otherMaxLength - (value?.length || 0);
    });
  }

  onSettingsChanged(config: any): void {
    this.checkboxGroupConfig = { ...config };
    this.applySettings(this.checkboxGroupConfig);
    this.cdr.detectChanges();
  }

  private applySettings(config: any): void {
    this.otherMaxLength = Number(config.otherMaxLength) || 768;
    this.remainingChars = this.otherMaxLength;

    const mainControl = this.checkboxGroupForm.get('selectedCheckboxOption');
    this.isRequired = config.isRequired === 'true';
    if (this.isRequired) {
      mainControl?.setValidators([this.atLeastOneSelectedValidator()]);
    } else {
      mainControl?.clearValidators();
    }
    mainControl?.updateValueAndValidity();

    if (config.optionSource === 'manual') {
      const opts = (config.manualOptions || []).map((o: any) => ({
        label:        o.option,
        value:        o.value,
        hasTextarea:  o.hasTextarea ?? false,
      }));
      this.options = this.appendOther(opts, config);
      this.initTextareaControls(this.options);
    } else {
      const serviceUrl = this.fxApiService.getServiceUrl(config.serviceName);
      this.getOptions(serviceUrl, config.apiUrl, config);
    }
  }

  private initTextareaControls(options: any[]): void {
    Object.keys(this.textareaValuesGroup.controls).forEach(key => {
      this.textareaValuesGroup.removeControl(key);
    });

    options
      .filter(o => o.value !== 'other' && o.hasTextarea)
      .forEach(opt => {
        this.textareaValuesGroup.addControl(
          opt.value,
          new FormControl({ value: '', disabled: true })
        );
      });

    this.applyRestore();
  }

  private applyRestore(): void {
    if (!this.pendingRestore) return;
    const data = this.pendingRestore;
    const rawSelected = data.selectedCheckboxOption ?? data.selectedOption ?? [];
    const selectedOptions: string[] = Array.isArray(rawSelected) ? rawSelected : (rawSelected ? [rawSelected] : []);

    this.checkboxGroupForm.patchValue({ selectedCheckboxOption: selectedOptions, otherInput: data.otherInput ?? '' });

    this.showOtherInput = selectedOptions.includes('other');
    if (this.showOtherInput) {
      const otherControl = this.checkboxGroupForm.get('otherInput');
      otherControl?.enable();
      this.isChildRequired = true;
      const validators: ValidatorFn[] = [Validators.required];
      const regexList = this.checkboxGroupConfig?.regexList;
      if (this.checkboxGroupConfig?.enableRegex === 'true' && regexList?.length) {
        validators.push(this.buildRegexValidator(regexList));
      }
      otherControl?.setValidators(validators);
      otherControl?.updateValueAndValidity();
    }

    if (data.textareaValues) {
      let allApplied = true;
      for (const [optVal, textVal] of Object.entries(data.textareaValues) as [string, string][]) {
        if (!selectedOptions.includes(optVal)) continue;
        const ctrl = this.textareaValuesGroup.controls[optVal];
        if (ctrl) {
          ctrl.enable();
          ctrl.setValue(textVal);
        } else {
          allApplied = false;
        }
      }
      if (!allApplied) return;
    }

    this.pendingRestore = null;
    this.cdr.detectChanges();
  }

  private atLeastOneSelectedValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const value = control.value;
      return Array.isArray(value) && value.length > 0 ? null : { required: true };
    };
  }

  private readonly mockOptions: any[] = [
    { value: 'option_1', label: 'Option 1', hasTextarea: false },
    { value: 'option_2', label: 'Option 2', hasTextarea: false },
    { value: 'option_3', label: 'Option 3', hasTextarea: false },
  ];

  private mapOptions(raw: any[], config: any): any[] {
    const labelKey = config.labelKey || 'label';
    const valueKey = config.valueKey || 'value';
    const textareaOnValues = (config.textareaOnValues || '')
      .split(',').map((v: string) => v.trim()).filter(Boolean);
    return raw.map(item => ({
      label:       item[labelKey],
      value:       item[valueKey],
      hasTextarea: textareaOnValues.includes(item[valueKey]),
    }));
  }

  private appendOther(opts: any[], config: any): any[] {
    return config.showOtherOption === 'true'
      ? [...opts, { value: 'other', label: 'Other', hasTextarea: false }]
      : opts;
  }

  getOptions(serviceUrl: string, url: string, config: any): void {
    if (!url) {
      this.options = this.appendOther([...this.mockOptions], config);
      this.initTextareaControls(this.options);
      return;
    }

    const finalUrl = serviceUrl + url;
    this.http.get<any>(finalUrl).subscribe({
      next: (response: any) => {
        const raw = Array.isArray(response) ? response : (response?.data || []);
        this.options = this.appendOther(this.mapOptions(raw, config), config);
        this.initTextareaControls(this.options);
      },
      error: (err) => {
        console.error('Error fetching options', err);
        this.options = this.appendOther([...this.mockOptions], config);
        this.initTextareaControls(this.options);
      }
    });
  }

  private buildRegexValidator(regexList: { label: string; pattern: string }[]): ValidatorFn {
    return (control: AbstractControl) => {
      if (!control.value || !regexList?.length) return null;
      const errors: { [key: string]: string } = {};
      regexList.forEach((item, index) => {
        try {
          if (!new RegExp(item.pattern).test(control.value)) {
            errors[`regex_${index}`] = item.label || `Pattern ${index + 1} failed`;
          }
        } catch { }
      });
      return Object.keys(errors).length ? { regexErrors: errors } : null;
    };
  }

  get regularOptions(): any[] {
    return this.options.filter(o => o.value !== 'other');
  }

  get otherOption(): any {
    return this.options.find(o => o.value === 'other');
  }

  get colOfOther(): number {
    if (!this.options.length) return 0;
    return ((this.options.length - 1) % 4) + 1;
  }

  get combineOtherWithTextarea(): boolean {
    return this.showOtherInput && !!this.otherOption && this.colOfOther !== 4;
  }

  get textareaGridColumn(): string {
    if (this.colOfOther === 4) return '4 / span 1';
    return 'span 1';
  }

  isChecked(value: string): boolean {
    const selected = this.checkboxGroupForm.get('selectedCheckboxOption')?.value as string[];
    return selected?.includes(value) ?? false;
  }

  hasTextareaOption(value: string): boolean {
    return this.options.find(o => o.value === value)?.hasTextarea ?? false;
  }

  isTextareaVisible(value: string): boolean {
    return this.isChecked(value) && this.hasTextareaOption(value) && !!this.textareaValuesGroup.controls[value];
  }

  getTextareaControl(value: string): FormControl {
    return this.textareaValuesGroup.controls[value] as FormControl;
  }

  onCheckboxChange(value: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const control = this.checkboxGroupForm.get('selectedCheckboxOption');
    const current = [...((control?.value as string[]) || [])];

    if (checked) {
      if (!current.includes(value)) current.push(value);
    } else {
      const idx = current.indexOf(value);
      if (idx > -1) current.splice(idx, 1);
    }

    control?.setValue(current);
    control?.markAsTouched();

    if (value === 'other') {
      this.handleOtherToggle(checked);
    } else if (this.hasTextareaOption(value)) {
      this.handleOptionTextareaToggle(value, checked);
    }
  }

  onButtonToggle(value: string): void {
    const control = this.checkboxGroupForm.get('selectedCheckboxOption');
    const current = [...((control?.value as string[]) || [])];
    const idx = current.indexOf(value);
    const isNowSelected = idx === -1;

    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      current.push(value);
    }

    control?.setValue(current);
    control?.markAsTouched();

    if (value === 'other') {
      this.handleOtherToggle(isNowSelected);
    } else if (this.hasTextareaOption(value)) {
      this.handleOptionTextareaToggle(value, isNowSelected);
    }
  }

  private handleOptionTextareaToggle(optionValue: string, selected: boolean): void {
    const ctrl = this.textareaValuesGroup.controls[optionValue];
    if (!ctrl) return;

    if (selected) {
      ctrl.enable();
      if (this.checkboxGroupConfig?.textareaRequired === 'true') {
        ctrl.setValidators([Validators.required]);
      }
    } else {
      ctrl.disable();
      ctrl.reset();
      ctrl.clearValidators();
    }
    ctrl.updateValueAndValidity();
    ctrl.markAsTouched();
  }

  private handleOtherToggle(selected: boolean): void {
    const otherControl = this.checkboxGroupForm.get('otherInput');
    this.showOtherInput = selected;

    if (selected) {
      this.isChildRequired = true;
      otherControl?.enable();

      const validators: ValidatorFn[] = [Validators.required];
      const regexList = this.checkboxGroupConfig?.regexList;
      if (this.checkboxGroupConfig?.enableRegex === 'true' && regexList?.length) {
        validators.push(this.buildRegexValidator(regexList));
      }
      otherControl?.setValidators(validators);
    } else {
      this.isChildRequired = false;
      otherControl?.disable();
      otherControl?.reset();
      otherControl?.clearValidators();
    }

    otherControl?.updateValueAndValidity();
    otherControl?.markAsTouched();
  }

  protected settings(): FxSetting[] {
    return [
      new FxStringSetting({ key: 'checkbox-group-config', $title: 'Checkbox Group Configuration', value: {} })
    ];
  }

  protected validations(): FxValidation[] {
    return [FxValidatorService.required];
  }
}
