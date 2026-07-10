import { HttpClient } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, DoCheck, HostBinding, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FxSetting, FxStringSetting, FxSelectSetting, FxToggleSetting, FxValidation, FxBaseComponent, FxOptionSetting, FxMode } from '@instantsys-labs/fx';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { Subject, takeUntil } from 'rxjs';
import { ApiServiceRegistry } from '@instantsys-labs/core'
import { CommonModule } from '@angular/common';
import { CalendarModule } from 'primeng/calendar';
import { MultiSelectModule } from 'primeng/multiselect';
import { MultiselectDropdownSettingsPanelComponent } from './multiselect-dropdown-settings-panel.component';
import { GateConfig, isApplicable, parseConditions } from '../shared/applicability';
import { resolveSiblingControl } from '../shared/conditional-disable';
import { FieldControlIncludeController } from '../shared/form-control-visibility';

@Component({
  selector: 'lib-multiselect-dropdown',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MultiselectDropdownSettingsPanelComponent, CalendarModule, MultiSelectModule],
  templateUrl: './multiselect-dropdown.component.html',
  styleUrl: './multiselect-dropdown.component.css'
})
export class MultiselectDropdownComponent extends FxBaseComponent implements OnInit, AfterViewInit, DoCheck {

  private fb = inject(FormBuilder);
  private destroy$ = new Subject<Boolean>();
  formObject: object = {};
  multiselectDropdownMap = new Map<string, any>();

  options: any[] = [];
  isRequired: boolean = false;

  public multiselectDropDownForm: FormGroup = this.fb.group({
    multipleSelectedOption: [[]],
  });

  // The field registers ONE control under fxData.name in the parent formGroup —
  // "exclude when hidden" just toggles that one entry. See shared/form-control-visibility.ts.
  private controlToggler = new FieldControlIncludeController(
    () => this.fxData?.$formGroup,
    () => (this.fxData?.name ? [this.fxData.name] : []),
  );

  constructor(private cdr: ChangeDetectorRef, private http: HttpClient, private fxBuilderWrapperService: FxBuilderWrapperService, private fxApiService: ApiServiceRegistry) {
    super(cdr)
    this.onInit.subscribe(() => {
      this._register(this.multiselectDropDownForm);
    });

  }

  ngAfterViewInit(): void {

    if (!this.setting('multiSelectOptionAPIURL')) {
      this.options = (this.fxData?.settings?.find((s: any) => s.key === 'itemsOption') as any)?.options || [];
    }

    setTimeout(() => {
      const key = this.fxData?.name;

      if (key && this.multiselectDropdownMap.has(key)) {
        this.multiselectDropDownForm.patchValue(this.multiselectDropdownMap.get(key));
        // For manual options (already loaded), remove ghost values immediately.
        // For API options, revalidateSelection() fires again after the API responds.
        this.revalidateSelection();
      }
    }, 200);

    setTimeout(() => {
      const mainControl = this.multiselectDropDownForm.get('multipleSelectedOption');
      if (this.setting('isMultiRequired') === 'true') {
        this.isRequired = true;
        mainControl?.setValidators([Validators.required]);
        mainControl?.updateValueAndValidity();
      }
    }, 100)
  }

  ngOnInit(): void {
    this.fxBuilderWrapperService.variables$
      .pipe(takeUntil(this.destroy$))
      .subscribe((variables: any) => {
        if (!variables) return;
        for (const [key, value] of Object.entries(variables) as [string, any][]) {
          if (
            value &&
            typeof value === 'object' &&
            'multipleSelectedOption' in value
          ) {
            this.multiselectDropdownMap.set(key, value);
          }
        }

      })

    const serviceUrl = this.fxApiService.getServiceUrl(this.setting('serviceMultiName'));
    this.getOptions(serviceUrl, this.setting('multiSelectOptionAPIURL'));
  }

  protected settings(): FxSetting[] {
    return [
      new FxOptionSetting({ key: 'itemsOption', $title: 'Options', value: [{ option: 'Yes', value: 'yes' }, { option: 'No', value: 'no' }] }, [{ option: 'Yes', value: 'yes' }, { option: 'No', value: 'no' }]),
      new FxStringSetting({ key: 'multiSelectOptionAPIURL', $title: 'API Url', value: '' }),
      new FxStringSetting({ key: 'customClassMulti', $title: 'Custom Class Name', value: '' }),
      new FxStringSetting({ key: 'select-label-multi', $title: 'Label', value: '' }),
      new FxStringSetting({ key: 'label-key', $title: 'Label Key', value: 'option' }),
      new FxSelectSetting({ key: 'serviceMultiName', $title: 'Service', value: '' }, [{ option: 'User Service', value: 'user_service' }, { option: 'Patient Service', value: 'patient_service' }, { option: 'Workflow Service', value: 'workflow_service' }]),
      new FxSelectSetting({ key: 'isMultiRequired', $title: 'Required', value: 'true' }, [{ option: 'Yes', value: 'true' }, { option: 'No', value: 'false' }]),
      new FxStringSetting({ key: 'multiErrorMessage', $title: 'Error Message', value: 'Please select' }),
      new FxStringSetting({ key: 'placeholderMulti', $title: 'Placeholder', value: 'Select' }),

      // Visibility gate: a condition list (privilege/supportingData/field rows, freely
      // combined via any/all) OR custom code — see shared/applicability.ts.
      new FxToggleSetting({ key: 'visibilityUseCode', $title: 'Visibility: Use Custom Code', value: false }),
      new FxStringSetting({ key: 'visibilityConditions', $title: 'Visibility Conditions', value: '[]' }),
      new FxStringSetting({ key: 'visibilityConditionsMatch', $title: 'Visibility Conditions Match', value: 'any' }),
      new FxStringSetting({ key: 'visibilityCode', $title: 'Visibility Code', value: '' }),
      // Default MUST be false — deepMergeObjects in the fx library silently reverts a saved
      // `false` back to the class default whenever the default is `true` (treats falsy saved
      // values as "unset"). Keying this as an opt-in flag (default false) survives reloads.
      new FxToggleSetting({ key: 'excludeControlsWhenHidden', $title: 'Exclude Form Control When Hidden', value: false }),

      // Enable/disable gate: same condition-list-or-code shape as visibility.
      new FxToggleSetting({ key: 'enableUseCode', $title: 'Enable: Use Custom Code', value: false }),
      new FxStringSetting({ key: 'enableConditions', $title: 'Enable Conditions', value: '[]' }),
      new FxStringSetting({ key: 'enableConditionsMatch', $title: 'Enable Conditions Match', value: 'any' }),
      new FxStringSetting({ key: 'enableCode', $title: 'Enable Code', value: '' }),
    ];
  }

  protected validations(): FxValidation[] {
    return [];
  }

  get isEditing(): boolean {
    return this.fxData?.$fxForm?.$mode !== FxMode.VIEW;
  }

  /** Computes { visible, enabled } from privileges + supportingData + another field's live value. See shared/applicability.ts. */
  private get applicability(): { visible: boolean; enabled: boolean } {
    const visibility: GateConfig = {
      useCode: this.setting('visibilityUseCode') === true,
      code: this.setting('visibilityCode'),
      conditions: parseConditions(this.setting('visibilityConditions')),
      conditionsMatch: this.setting('visibilityConditionsMatch'),
    };
    const enable: GateConfig = {
      useCode: this.setting('enableUseCode') === true,
      code: this.setting('enableCode'),
      conditions: parseConditions(this.setting('enableConditions')),
      conditionsMatch: this.setting('enableConditionsMatch'),
    };
    return isApplicable(
      { visibility, enable },
      {
        privileges: this.fxBuilderWrapperService.privileges,
        supportingData: this.fxBuilderWrapperService.supportingData,
        resolveField: (name) => resolveSiblingControl(this.fxData, name)?.value,
      },
    );
  }

  /** Runtime-only: always visible/editable in the builder. */
  get fieldHidden(): boolean {
    if (this.isEditing) return false;
    return !this.applicability.visible;
  }

  get fieldDisabled(): boolean {
    if (this.isEditing) return false;
    return !this.applicability.enabled;
  }

  /** Bound on this component's OWN host element so hiding collapses the whole field, label included. */
  @HostBinding('hidden')
  get hostHidden(): boolean {
    return this.fieldHidden;
  }

  @HostBinding('attr.inert')
  get hostInert(): string | null {
    return this.fieldHidden ? '' : null;
  }

  ngDoCheck(): void {
    const exclude = this.setting('excludeControlsWhenHidden') === true;
    const shouldInclude = !this.fieldHidden || !exclude;
    this.controlToggler.update(shouldInclude);
  }

  onSettingsChanged(_config: any): void {
    this.detectChanges();
  }

  private revalidateSelection(): void {
    if (!this.options?.length) return;
    const control = this.multiselectDropDownForm.get('multipleSelectedOption');
    const current: string[] = control?.value ?? [];
    if (!current.length) return;
    const valid = new Set(this.options.map((o: any) => String(o.value)));
    const validated = current.filter(v => valid.has(String(v)));
    if (validated.length !== current.length) {
      control?.setValue(validated, { emitEvent: false });
    }
  }

  getOptions(serviceUrl: string, url: string) {
    if (url) {
      const finalUrl = serviceUrl + url;
      this.http.get<any[]>(finalUrl).subscribe({
        next: (response: any) => {
          this.options = response?.data;
          // Re-validate any pre-patched values against loaded API options so
          // ghost values (options no longer present) are removed from the control.
          this.revalidateSelection();
        },
        error: (err) => {
          console.error('Error fetching options', err);
        }
      });
    } else {
      this.options = (this.fxData?.settings?.find((s: any) => s.key === 'itemsOption') as any)?.options || [];
    }
  }

}
