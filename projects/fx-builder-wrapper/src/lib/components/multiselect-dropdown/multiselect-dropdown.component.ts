import { HttpClient } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FxComponent, FxSetting, FxStringSetting, FxSelectSetting, FxValidation, FxValidatorService, FxBaseComponent, FxOptionSetting } from '@instantsys-labs/fx';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { Subject, takeUntil } from 'rxjs';
import { ApiServiceRegistry } from '@instantsys-labs/core'
import { CommonModule } from '@angular/common';
import { CalendarModule } from 'primeng/calendar';
import { MultiSelectModule } from 'primeng/multiselect';

@Component({
  selector: 'lib-multiselect-dropdown',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, FxComponent, CalendarModule, MultiSelectModule],
  templateUrl: './multiselect-dropdown.component.html',
  styleUrl: './multiselect-dropdown.component.css'
})
export class MultiselectDropdownComponent extends FxBaseComponent implements OnInit, AfterViewInit {

  private fb = inject(FormBuilder);
  private destroy$ = new Subject<Boolean>();
  formObject: object = {};
  multiselectDropdownMap = new Map<string, any>();
  @ViewChild('fxComponent') fxComponent!: FxComponent;
 
  options: any[] = [];
  isRequired: boolean = false;

  public multiselectDropDownForm: FormGroup = this.fb.group({
    multipleSelectedOption: [[]],
  });

  constructor(private cdr: ChangeDetectorRef, private http: HttpClient, private fxBuilderWrapperService: FxBuilderWrapperService, private fxApiService: ApiServiceRegistry) {
    super(cdr)
    this.onInit.subscribe(() => {
      this._register(this.multiselectDropDownForm);
    });

  }

  ngAfterViewInit(): void {

    if (!this.setting('multiSelectOptionAPIURL')) {
      this.options = (this.fxComponent?.fxData?.settings?.find((s: any) => s.key === 'itemsOption') as any)?.options || [];
    }

    setTimeout(() => {
      const key = this.fxComponent?.fxData?.name;

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


        //  for (const [key, value] of Object.entries(variables) as [string, any][]) {
        //    if (key.includes('dropdown-with-other')) {
        //     this.formObject = value;
        //    }
        //  }

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
    ];
  }

  protected validations(): FxValidation[] {
    return [];
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
      this.options = (this.fxComponent?.fxData?.settings?.find((s: any) => s.key === 'itemsOption') as any)?.options || [];
    }
  }

}
