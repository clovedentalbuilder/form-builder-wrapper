import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { ApiServiceRegistry } from '@instantsys-labs/core';
import { FxBaseComponent, FxSetting, FxStringSetting, FxValidation, FxValidatorService } from '@instantsys-labs/fx';
import { Subject, takeUntil } from 'rxjs';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { RadioButtonWithOtherSettingsPanelComponent } from './radio-button-with-other-settings-panel.component';

@Component({
  selector: 'lib-radio-button-with-other',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RadioButtonWithOtherSettingsPanelComponent],
  templateUrl: './radio-button-with-other.component.html',
  styleUrl: './radio-button-with-other.component.css'
})
export class RadioButtonWithOtherComponent extends FxBaseComponent implements OnInit, AfterViewInit {
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<boolean>();

  @ViewChild('fxComponent') fxComponent!: RadioButtonWithOtherSettingsPanelComponent;

  options: any[] = [];
  radioMap = new Map<string, any>();
  isRequired: boolean = false;
  isChildRequired: boolean = false;
  otherMaxLength: number = 768;
  remainingChars: number = 768;
  showOtherInput: boolean = false;

  radioConfig: any = {
    optionSource:      'api',
    apiUrl:            '',
    serviceName:       '',
    labelKey:          'label',
    valueKey:          'value',
    manualOptions:     [],
    label:             '',
    showOtherOption:   'false',
    otherLabel:        'Other',
    otherPlaceholder:  '',
    otherMaxLength:    768,
    isRequired:        'false',
    errorMessage:      'Please select an option',
    errorMessageOther: 'Please fill out this field',
    customClass:       '',
  };

  public radioForm: FormGroup = this.fb.group({
    selectedRadioOption: [''],
    otherInput: [{ value: '', disabled: true }],
  });

  constructor(
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private fxApiService: ApiServiceRegistry,
    private fxBuilderWrapperService: FxBuilderWrapperService
  ) {
    super(cdr);
    this.onInit.subscribe(() => {
      this._register(this.radioForm);
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const savedConfig = this.setting('radio-config');
      if (savedConfig && typeof savedConfig === 'object' && Object.keys(savedConfig).length) {
        this.radioConfig = { ...this.radioConfig, ...savedConfig };
      }
      this.applySettings(this.radioConfig);
    }, 100);

    setTimeout(() => {
      const key = this.fxComponent?.fxData?.name;
      if (key && this.radioMap.has(key)) {
        const data = this.radioMap.get(key);
        const resolvedValue = data.selectedRadioOption ?? data.selectedOption ?? '';
        this.radioForm.patchValue({ selectedRadioOption: resolvedValue, otherInput: data.otherInput ?? '' });
        this.onSelectionChange(resolvedValue);
      }
    }, 200);
  }

  ngOnInit(): void {
    this.fxBuilderWrapperService.variables$
      .pipe(takeUntil(this.destroy$))
      .subscribe((variables: any) => {
        if (!variables) return;
        for (const [key, entry] of Object.entries(variables) as [string, any][]) {
          if (entry && typeof entry === 'object' && ('selectedRadioOption' in entry || 'selectedOption' in entry)) {
            this.radioMap.set(key, entry);
          }
        }
      });

    const otherControl = this.radioForm.get('otherInput');
    otherControl?.valueChanges.subscribe(value => {
      this.remainingChars = this.otherMaxLength - (value?.length || 0);
    });
  }

  onSettingsChanged(config: any): void {
    this.radioConfig = { ...config };
    this.applySettings(this.radioConfig);
    this.cdr.detectChanges();
  }

  private applySettings(config: any): void {
    this.otherMaxLength = Number(config.otherMaxLength) || 768;
    this.remainingChars = this.otherMaxLength;

    const mainControl = this.radioForm.get('selectedRadioOption');
    this.isRequired = config.isRequired === 'true';
    if (this.isRequired) {
      mainControl?.setValidators([Validators.required]);
    } else {
      mainControl?.clearValidators();
    }
    mainControl?.updateValueAndValidity();

    if (config.optionSource === 'manual') {
      const opts = (config.manualOptions || []).map((o: any) => ({ label: o.option, value: o.value }));
      this.options = this.appendOther(opts, config);
    } else {
      const serviceUrl = this.fxApiService.getServiceUrl(config.serviceName);
      this.getOptions(serviceUrl, config.apiUrl, config);
    }
  }

  private readonly mockOptions: any[] = [
    { value: 'option_1', label: 'Option 1' },
    { value: 'option_2', label: 'Option 2' },
    { value: 'option_3', label: 'Option 3' },
  ];

  private mapOptions(raw: any[], config: any): any[] {
    const labelKey = config.labelKey || 'label';
    const valueKey = config.valueKey || 'value';
    return raw.map(item => ({ label: item[labelKey], value: item[valueKey] }));
  }

  private appendOther(opts: any[], config: any): any[] {
    return config.showOtherOption === 'true'
      ? [...opts, { value: 'other', label: 'Other' }]
      : opts;
  }

  getOptions(serviceUrl: string, url: string, config: any): void {
    if (!url) {
      this.options = this.appendOther([...this.mockOptions], config);
      return;
    }

    const finalUrl = serviceUrl + url;
    this.http.get<any>(finalUrl).subscribe({
      next: (response: any) => {
        const raw = Array.isArray(response) ? response : (response?.data || []);
        this.options = this.appendOther(this.mapOptions(raw, config), config);
      },
      error: (err) => {
        console.error('Error fetching options', err);
        this.options = this.appendOther([...this.mockOptions], config);
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

  onSelectionChange(value: string): void {
    const otherControl = this.radioForm.get('otherInput');
    this.showOtherInput = value === 'other';

    if (this.showOtherInput) {
      this.isChildRequired = true;
      otherControl?.enable();

      const validators: ValidatorFn[] = [Validators.required];
      const regexList = this.radioConfig?.regexList;
      if (this.radioConfig?.enableRegex === 'true' && regexList?.length) {
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
      new FxStringSetting({ key: 'radio-config', $title: 'Radio Configuration', value: {} })
    ];
  }

  protected validations(): FxValidation[] {
    return [FxValidatorService.required];
  }
}
