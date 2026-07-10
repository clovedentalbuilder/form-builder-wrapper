import { HttpClient } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, DoCheck, HostBinding, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FxSetting, FxStringSetting, FxSelectSetting, FxToggleSetting, FxValidation, FxBaseComponent, FxOptionSetting, FxMode } from '@instantsys-labs/fx';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { ConditionalDisableController, conditionalDisableSettings } from '../shared/conditional-disable';
import { Subject, takeUntil } from 'rxjs';
import { ApiServiceRegistry } from '@instantsys-labs/core'
import { CommonModule } from '@angular/common';
import { CalendarModule } from 'primeng/calendar';
import { MultiSelectModule } from 'primeng/multiselect';
import { DropdownModule } from 'primeng/dropdown';
import { DropdownWithSearchSettingsPanelComponent } from './dropdown-with-search-settings-panel.component';
import { GateConfig, isApplicable, parseConditions } from '../shared/applicability';
import { resolveSiblingControl } from '../shared/conditional-disable';
import { FieldControlIncludeController } from '../shared/form-control-visibility';

@Component({
  selector: 'lib-dropdown-with-search',
  standalone: true,
  imports: [DropdownModule, CommonModule, FormsModule, ReactiveFormsModule, CalendarModule, MultiSelectModule, DropdownWithSearchSettingsPanelComponent],
  templateUrl: './dropdown-with-search.component.html',
  styleUrl: './dropdown-with-search.component.css'
})
export class DropdownWithSearchComponent extends FxBaseComponent implements OnInit, AfterViewInit, DoCheck {
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<Boolean>();
  formObject: object = {};
  searchDropdownMap = new Map<string, any>();

  options: any[] = [];
  isRequired: boolean = false;
  /** Legacy single-rule disable (pre-existing) — still evaluated, OR'd with the new Enable/Disable gate. */
  public isDisabled = false;

  public searchDropDownForm: FormGroup = this.fb.group({
    searchSelectedOption: [''],
  });

  // Legacy conditional disable: disables the dropdown when a watched control matches.
  // Kept exactly as before for backward compatibility with already-configured fields.
  private disableController = new ConditionalDisableController(
    () => this.fxData,
    () => this.searchDropDownForm.get('searchSelectedOption'),
    (key) => this.setting(key),
  );

  // The field registers ONE control under fxData.name in the parent formGroup —
  // "exclude when hidden" just toggles that one entry. See shared/form-control-visibility.ts.
  private controlToggler = new FieldControlIncludeController(
    () => this.fxData?.$formGroup,
    () => (this.fxData?.name ? [this.fxData.name] : []),
  );

  constructor(private cdr: ChangeDetectorRef, private http: HttpClient, private fxBuilderWrapperService: FxBuilderWrapperService, private fxApiService: ApiServiceRegistry) {
    super(cdr)
    this.onInit.subscribe(() => {
      this._register(this.searchDropDownForm);
    });

  }

  ngDoCheck(): void {
    this.isDisabled = this.disableController.update();

    const exclude = this.setting('excludeControlsWhenHidden') === true;
    const shouldInclude = !this.fieldHidden || !exclude;
    this.controlToggler.update(shouldInclude);
  }

  ngAfterViewInit(): void {

    if (!this.setting('searchSelectOptionAPIURL')) {
      this.options = (this.fxData?.settings?.find((s: any) => s.key === 'itemsSearchOption') as any)?.options || [];
      // this.options.unshift({ option: 'Select', value: '' });
    }

    setTimeout(() => {
      const key = this.fxData?.name;

      if (key && this.searchDropdownMap.has(key)) {
        this.searchDropDownForm.patchValue(this.searchDropdownMap.get(key));
        this.revalidateSelection();
      }
    }, 200);

    setTimeout(() => {
      const mainControl = this.searchDropDownForm.get('searchSelectedOption');
      if (this.setting('isSearchRequired') === 'true') {
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


        //  for (const [key, value] of Object.entries(variables) as [string, any][]) {
        //    if (key.includes('dropdown-with-other')) {
        //     this.formObject = value;
        //    }
        //  }

        for (const [key, value] of Object.entries(variables) as [string, any][]) {
          if (
            value &&
            typeof value === 'object' &&
            'searchSelectedOption' in value
          ) {
            this.searchDropdownMap.set(key, value);
          }
        }

      })

    const serviceUrl = this.fxApiService.getServiceUrl(this.setting('serviceSearchName'));
    this.getOptions(serviceUrl, this.setting('searchSelectOptionAPIURL'));
  }

  protected settings(): FxSetting[] {
    return [
      new FxOptionSetting({ key: 'itemsSearchOption', $title: 'Options', value: [{ option: 'Select', value: '' },{ option: 'Yes', value: 'yes' }, { option: 'No', value: 'no' }] }, [{ option: 'Yes', value: 'yes' }, { option: 'No', value: 'no' }]),
      new FxStringSetting({ key: 'searchSelectOptionAPIURL', $title: 'API Url', value: '' }),
      new FxStringSetting({ key: 'customClassSearch', $title: 'Custom Class Name', value: '' }),
      new FxStringSetting({ key: 'select-label-search', $title: 'Label', value: '' }),
      new FxStringSetting({ key: 'label-key-search', $title: 'Label Key', value: 'option' }),
       new FxStringSetting({ key: 'value-key-search', $title: 'Label Key', value: 'value' }),
      new FxSelectSetting({ key: 'serviceSearchName', $title: 'Service', value: '' }, [{ option: 'User Service', value: 'user_service' }, { option: 'Patient Service', value: 'patient_service' }, { option: 'Workflow Service', value: 'workflow_service' }]),
      new FxSelectSetting({ key: 'isSearchRequired', $title: 'Required', value: 'true' }, [{ option: 'Yes', value: 'true' }, { option: 'No', value: 'false' }]),
      new FxStringSetting({ key: 'multiErrorSearch', $title: 'Error Message', value: 'Please select' }),
      new FxStringSetting({ key: 'placeholderSearch', $title: 'Placeholder', value: 'Select' }),
      ...conditionalDisableSettings(),

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

      // Enable/disable gate: same condition-list-or-code shape as visibility. OR'd at
      // runtime with the legacy disableWhenControl/disableWhenValue rule above.
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

  /** New gate's enable state only — combined with the legacy `isDisabled` in the template via OR. */
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

  onSettingsChanged(_config: any): void {
    this.detectChanges();
  }

  private revalidateSelection(): void {
    const selected: string = this.searchDropDownForm.get('searchSelectedOption')?.value ?? '';
    if (!selected) return;
    if (!this.options?.length) return;
    const validValues = new Set(this.options.map((o: any) => String(o.value)));
    if (!validValues.has(selected)) {
      this.searchDropDownForm.patchValue({ searchSelectedOption: '' }, { emitEvent: false });
    }
  }

  getOptions(serviceUrl: string, url: string) {
    if (url) {
      const finalUrl = serviceUrl + url;
      this.http.get<any[]>(finalUrl).subscribe({
        next: (response: any) => {
          this.options = response?.content || [];
          this.options.unshift({ option: 'Select', value: '' });
          this.revalidateSelection();
        },
        error: (err) => {
          console.error('Error fetching options', err);
        }
      });
    } else {
      this.options = (this.fxData?.settings?.find((s: any) => s.key === 'itemsSearchOption') as any)?.options || [];
      this.revalidateSelection();
    }
  }
}
