import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { ApiServiceRegistry } from '@instantsys-labs/core';
import { FxBaseComponent, FxSetting, FxStringSetting, FxValidation, FxValidatorService } from '@instantsys-labs/fx';
import { Subject, takeUntil } from 'rxjs';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { RadioWithChildFieldSettingsPanelComponent } from './radio-with-child-field-settings-panel.component';

@Component({
  selector: 'lib-radio-with-child-field',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RadioWithChildFieldSettingsPanelComponent],
  templateUrl: './radio-with-child-field.component.html',
  styleUrl: './radio-with-child-field.component.css',
})
export class RadioWithChildFieldComponent extends FxBaseComponent implements OnInit, AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<boolean>();

  @ViewChild('fxComponent') fxComponent!: RadioWithChildFieldSettingsPanelComponent;

  /** Unique per-instance prefix so parent and child radio groups never share a browser name group. */
  readonly instanceId = `rwc-${Math.random().toString(36).slice(2, 7)}`;

  options: any[] = [];
  childOptionMap = new Map<string, any[]>();
  valueMap = new Map<string, any>();

  /** Caches child field values per option for within-session restore when switching selections. */
  private childValueCache = new Map<string, any>();

  private viewInitialized = false;
  private hasPatched = false;

  activeChildConfig: any = null;
  selectedOption: string = '';

  config: any = {
    optionSource: 'api',
    apiUrl:       '',
    serviceName:  '',
    labelKey:     'label',
    valueKey:     'value',
    manualOptions: [],
    label:        '',
    subLabel:     '',
    displayMode:  'radio',
    radioLayout:  'flex',
    isRequired:   'false',
    errorMessage: 'Please select an option',
    customClass:  '',
    parentClass:  '',
    parentWidth:  50,
    childFields:  {},
  };

  form: FormGroup = this.fb.group({
    rwcParentValue: [''],
    rwcParentLabel: [''],
    rwcChildValue:  [''],
    rwcChildLabel:  [''],
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
    // Guards set up immediately — any patch (including FxBaseComponent's) is overridden at the point it fires
    this.form.get('rwcParentLabel')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.form.get('rwcParentLabel')?.setValue(this.config.label ?? '', { emitEvent: false });
      });

    this.form.get('rwcChildLabel')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.form.get('rwcChildLabel')?.setValue(this.activeChildConfig?.label ?? '', { emitEvent: false });
      });

    setTimeout(() => {
      const savedConfig = this.setting('radio-with-child-config');
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
            'rwcParentValue' in entry &&
            'rwcChildValue' in entry
          ) {
            this.valueMap.set(key, entry);
          }
        }
        // Patch if view is already ready but variables arrived late
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
    const sel = data.rwcParentValue ?? '';
    this.hasPatched = true;
    this.form.get('rwcParentValue')?.setValue(sel);
    if (sel) {
      this.onSelectionChange(sel);
      if (data.rwcChildValue !== undefined && data.rwcChildValue !== null) {
        const childCfg = this.activeChildConfig;
        if (childCfg && this.isOptionBasedField(childCfg.fieldType)) {
          const opts = this.childOptionMap.get(sel) || [];
          if (opts.length > 0) {
            // Options already available (manual source) — validate before patching
            this.childFieldControl.setValue(
              this.validateChildValue(opts, childCfg.fieldType, data.rwcChildValue)
            );
          } else {
            // Options loading async (API source) — set tentatively;
            // loadChildOptions callback will validate and correct after load
            this.childFieldControl.setValue(data.rwcChildValue);
          }
        } else {
          // textbox / textarea — no option validation needed
          this.childFieldControl.setValue(data.rwcChildValue);
        }
      }
    }
    this.cdr.detectChanges();
  }

  private validateChildValue(opts: any[], fieldType: string, rawValue: any): any {
    if (fieldType === 'checkbox') {
      const arr = Array.isArray(rawValue) ? rawValue : [];
      return arr.filter((v: string) => opts.some((o: any) => o.value === v));
    }
    return opts.some((o: any) => o.value === rawValue) ? rawValue : '';
  }

  onSettingsChanged(config: any): void {
    this.config = { ...config };
    this.applySettings(this.config);
    this.cdr.detectChanges();
  }

  private applySettings(config: any): void {
    const mainCtrl = this.form.get('rwcParentValue');
    if (config.isRequired === 'true') {
      mainCtrl?.setValidators([Validators.required]);
    } else {
      mainCtrl?.clearValidators();
    }
    mainCtrl?.updateValueAndValidity();

    // Reset active child before label setters so valueChanges guards read correct state
    this.activeChildConfig = null;
    this.selectedOption = '';
    this.form.get('rwcParentLabel')?.setValue(config.label ?? '');
    this.form.get('rwcChildLabel')?.setValue('');
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
      this.revalidateSelection();
      return;
    }
    this.http.get<any>(serviceUrl + url).subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : (res?.data || []);
        this.options = raw.map((item: any) => ({
          label: item[config.labelKey || 'label'],
          value: item[config.valueKey || 'value'],
        }));
        this.revalidateSelection();
      },
      error: () => {
        this.options = [...this.mockOptions];
        this.revalidateSelection();
      },
    });
  }

  private revalidateSelection(): void {
    const currentValue = this.form.get('rwcParentValue')?.value;
    if (!currentValue) return;
    const opt = this.options.find(o => o.value === currentValue);
    if (!opt) {
      // Saved value no longer exists in options — reset so required error shows
      this.form.get('rwcParentValue')?.setValue('');
      this.selectedOption = '';
      this.activeChildConfig = null;
      this.childFieldControl.clearValidators();
      this.childFieldControl.setValue('');
      this.childFieldControl.updateValueAndValidity();
      this.form.get('rwcChildLabel')?.setValue('');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
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
        const options = raw.map((item: any) => ({
          label: item[childConfig.labelKey || 'label'],
          value: item[childConfig.valueKey || 'value'],
        }));
        this.childOptionMap.set(optionValue, options);
        // If this is the active selection, validate the tentatively-patched value
        // against the now-loaded options, then re-set to force SelectControlValueAccessor
        // to sync the native <select> element after *ngFor renders the <option>s.
        if (this.selectedOption === optionValue) {
          this.childFieldControl.setValue(
            this.validateChildValue(options, childConfig.fieldType, this.childFieldControl.value)
          );
          this.cdr.detectChanges();
        }
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
    // Cache the current child value before switching away
    if (this.selectedOption && this.activeChildConfig !== null) {
      this.childValueCache.set(this.selectedOption, this.childFieldControl.value);
    }

    this.selectedOption = value;

    const childFields = this.config.childFields || {};
    const childCfg = childFields[value];

    if (childCfg?.enabled) {
      this.activeChildConfig = childCfg;

      // Update child label from the active child field configuration
      this.form.get('rwcChildLabel')?.setValue(childCfg.label ?? '');

      // Restore cached value for this option, or reset to default
      const cached = this.childValueCache.get(value);
      const defaultVal = childCfg.fieldType === 'checkbox' ? [] : '';
      this.childFieldControl.setValue(cached !== undefined ? cached : defaultVal);

      const validators: ValidatorFn[] = [];
      if (childCfg.isRequired === 'true') {
        validators.push(
          childCfg.fieldType === 'checkbox' ? this.requiredArrayValidator() : Validators.required,
        );
      }
      if (childCfg.regexPattern && childCfg.fieldType !== 'checkbox') {
        validators.push(Validators.pattern(childCfg.regexPattern));
      }
      if (validators.length) {
        this.childFieldControl.setValidators(validators);
      } else {
        this.childFieldControl.clearValidators();
      }
      this.childFieldControl.enable();
      this.childFieldControl.updateValueAndValidity();

      if (this.isOptionBasedField(childCfg.fieldType) && !this.childOptionMap.has(value)) {
        this.loadChildOptions(value, childCfg);
      }
    } else {
      this.activeChildConfig = null;
      this.form.get('rwcChildLabel')?.setValue('');
      this.childFieldControl.clearValidators();
      this.childFieldControl.setValue('');
      this.childFieldControl.updateValueAndValidity();
    }
  }

  private requiredArrayValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      if (Array.isArray(control.value) && control.value.length > 0) return null;
      return { required: true };
    };
  }

  isOptionBasedField(fieldType: string): boolean {
    return ['dropdown', 'radiobutton', 'checkbox'].includes(fieldType);
  }

  // ── Template helpers ──────────────────────────────────────────────────────────

  isActiveWithChild(optValue: string): boolean {
    return this.selectedOption === optValue && this.activeChildConfig !== null;
  }

  get mainRadioControl(): FormControl {
    return this.form.get('rwcParentValue') as FormControl;
  }

  get childFieldControl(): FormControl {
    return this.form.get('rwcChildValue') as FormControl;
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

  get radioContainerClass(): string {
    return this.config.radioLayout === 'grid'
      ? 'grid grid-cols-4 gap-4 items-start'
      : 'flex flex-wrap gap-4 items-start';
  }

  get isRequired(): boolean {
    return this.config.isRequired === 'true';
  }

  // ── FxBaseComponent hooks ─────────────────────────────────────────────────────

  protected settings(): FxSetting[] {
    return [
      new FxStringSetting({ key: 'radio-with-child-config', $title: 'Radio with Child Config', value: {} }),
    ];
  }

  protected validations(): FxValidation[] {
    return [FxValidatorService.required];
  }
}
