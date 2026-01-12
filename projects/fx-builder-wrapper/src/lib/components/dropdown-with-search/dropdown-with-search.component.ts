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
import { DropdownModule } from 'primeng/dropdown';

@Component({
  selector: 'lib-dropdown-with-search',
  standalone: true,
  imports: [DropdownModule, CommonModule, FormsModule, ReactiveFormsModule, CalendarModule, MultiSelectModule, FxComponent],
  templateUrl: './dropdown-with-search.component.html',
  styleUrl: './dropdown-with-search.component.css'
})
export class DropdownWithSearchComponent extends FxBaseComponent implements OnInit, AfterViewInit{
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<Boolean>();
  formObject: object = {};
  searchDropdownMap = new Map<string, any>();
  @ViewChild('fxComponent') fxComponent!: FxComponent;
 
  options: any[] = [];
  isRequired: boolean = false;

  public searchDropDownForm: FormGroup = this.fb.group({
    searchSelectedOption: [''],
  });

  constructor(private cdr: ChangeDetectorRef, private http: HttpClient, private fxBuilderWrapperService: FxBuilderWrapperService, private fxApiService: ApiServiceRegistry) {
    super(cdr)
    this.onInit.subscribe(() => {
      this._register(this.searchDropDownForm);
    });

  }

  ngAfterViewInit(): void {

    if (!this.setting('searchSelectOptionAPIURL')) {
      this.options = (this.fxComponent?.fxData?.settings?.find((s: any) => s.key === 'itemsSearchOption') as any)?.options || [];
      // this.options.unshift({ option: 'Select', value: '' });
    }

    setTimeout(() => {
      const key = this.fxComponent?.fxData?.name;

      if (key && this.searchDropdownMap.has(key)) {
        this.searchDropDownForm.patchValue(this.searchDropdownMap.get(key));
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
    ];
  }

  protected validations(): FxValidation[] {
    return [];
  }

  getOptions(serviceUrl: string, url: string) {
    if (url) {
      const finalUrl = serviceUrl + url;
      this.http.get<any[]>(finalUrl).subscribe({
        next: (response: any) => {
          this.options = response?.content || [];
          this.options.unshift({ option: 'Select', value: '' });

        },
        error: (err) => {
          console.error('Error fetching options', err);
        }
      });
    } else {
      this.options = (this.fxComponent?.fxData?.settings?.find((s: any) => s.key === 'itemsSearchOption') as any)?.options || [];
      // this.options.unshift({ option: 'Select', value: '' });
    }
  }
}
