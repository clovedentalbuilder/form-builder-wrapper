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
  selector: 'lib-multiselect-dropdown-with-childs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, FxComponent, CalendarModule, MultiSelectModule],
  templateUrl: './multiselect-dropdown-with-childs.component.html',
  styleUrl: './multiselect-dropdown-with-childs.component.css'
})
export class MultiselectDropdownWithChildsComponent extends FxBaseComponent implements OnInit, AfterViewInit{
   private fb = inject(FormBuilder);
  private destroy$ = new Subject<Boolean>();
  formObject: object = {};
  multiChildDropdownMap = new Map<string, any>();
  @ViewChild('fxComponent') fxComponent!: FxComponent;
 
  options: any[] = [];
  isRequired: boolean = false;
  isChild1Required: boolean = false;
  isChild2Required: boolean = false;

  public multiChildDropDownForm: FormGroup = this.fb.group({
    multipleChildSelectedOption: [[]],
    child1: [''],
    child2: [''],
    child1Label: [''],
    child2Label: [''],
  });

  constructor(private cdr: ChangeDetectorRef, private http: HttpClient, private fxBuilderWrapperService: FxBuilderWrapperService, private fxApiService: ApiServiceRegistry) {
    super(cdr)
    this.onInit.subscribe(() => {
      this._register(this.multiChildDropDownForm);
    });

  }

  ngAfterViewInit(): void {

    if (!this.setting('multiChildOptionAPIURL')) {
      this.options = (this.fxComponent?.fxData?.settings?.find((s: any) => s.key === 'itemsChildOption') as any)?.options || [];
    }

     const child1LabelControl = this.multiChildDropDownForm.get('child1Label');
     const child2LabelControl = this.multiChildDropDownForm.get('child2Label');
      child1LabelControl?.setValue(this.setting('child-1-label'));  
      child2LabelControl?.setValue(this.setting('child-2-label'));
      child1LabelControl?.updateValueAndValidity();
      child2LabelControl?.updateValueAndValidity(); 


    setTimeout(() => {
      const key = this.fxComponent?.fxData?.name;

      if (key && this.multiChildDropdownMap.has(key)) {
        this.multiChildDropDownForm.patchValue(this.multiChildDropdownMap.get(key));
      }
    }, 200);

    setTimeout(() => {
      const mainControl = this.multiChildDropDownForm.get('multipleChildSelectedOption');
      const child1Control = this.multiChildDropDownForm.get('child1');
      const child2Control = this.multiChildDropDownForm.get('child2');
      if (this.setting('isMultiChildRequired') === 'true') {
        this.isRequired = true;
        mainControl?.setValidators([Validators.required]);
        mainControl?.updateValueAndValidity();
      }
      if (this.setting('isChild1Required') === 'true') {
        this.isChild1Required = true;
        child1Control?.setValidators([Validators.required]);
        child1Control?.updateValueAndValidity();
      }
      if (this.setting('isChild2Required') === 'true') {
        this.isChild2Required = true;
        child2Control?.setValidators([Validators.required]);
        child2Control?.updateValueAndValidity();
      }
    }, 1000)
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
            'multipleChildSelectedOption' in value
          ) {
            this.multiChildDropdownMap.set(key, value);
          }
        }

      })

    const serviceUrl = this.fxApiService.getServiceUrl(this.setting('serviceMultiName'));
    this.getOptions(serviceUrl, this.setting('multiChildOptionAPIURL'));
  }

  protected settings(): FxSetting[] {
    return [
      new FxOptionSetting({ key: 'itemsChildOption', $title: 'Options', value: [{ option: 'Yes', value: 'yes' }, { option: 'No', value: 'no' }] }, [{ option: 'Yes', value: 'yes' }, { option: 'No', value: 'no' }]),
      new FxStringSetting({ key: 'multiChildOptionAPIURL', $title: 'API Url', value: '' }),
      new FxStringSetting({ key: 'customClassMultiChild', $title: 'Custom Class Name', value: '' }),
      new FxStringSetting({ key: 'select-label-multi-child', $title: 'Label', value: '' }),
      new FxStringSetting({ key: 'label-key-child', $title: 'Label Key', value: 'option' }),
      new FxSelectSetting({ key: 'serviceMultiName', $title: 'Service', value: '' }, [{ option: 'User Service', value: 'user_service' }, { option: 'Patient Service', value: 'patient_service' }, { option: 'Workflow Service', value: 'workflow_service' }]),
      new FxSelectSetting({ key: 'isMultiChildRequired', $title: 'Required', value: 'true' }, [{ option: 'Yes', value: 'true' }, { option: 'No', value: 'false' }]),
      new FxStringSetting({ key: 'multiChildErrorMessage', $title: 'Error Message', value: 'Please select' }),
      new FxStringSetting({ key: 'placeholderMultiChild', $title: 'Placeholder', value: 'Select' }),

       new FxStringSetting({ key: 'child-1-label', $title: 'Child 1 Label', value: '' }),
       new FxStringSetting({ key: 'child-1-placeholder', $title: 'Child 1 Placeholder', value: 'enter here' }),
       new FxSelectSetting({ key: 'isChild1Required', $title: 'Required', value: 'true' }, [{ option: 'Yes', value: 'true' }, { option: 'No', value: 'false' }]),
       new FxStringSetting({ key: 'child1ErrorMessage', $title: 'Error Message', value: 'Please fill out the field' }),

        new FxStringSetting({ key: 'child-2-label', $title: 'Child 2 Label', value: '' }),
        new FxStringSetting({ key: 'child-2-placeholder', $title: 'Child 2 Placeholder', value: 'enter here' }),
        new FxSelectSetting({ key: 'isChild2Required', $title: 'Required', value: 'true' }, [{ option: 'Yes', value: 'true' }, { option: 'No', value: 'false' }]),
        new FxStringSetting({ key: 'child2ErrorMessage', $title: 'Error Message', value: 'Please fill out the field' }),
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
          this.options = response?.data;
        },
        error: (err) => {
          console.error('Error fetching options', err);
        }
      });
    } else {
      this.options = (this.fxComponent?.fxData?.settings?.find((s: any) => s.key === 'itemsChildOption') as any)?.options || [];
    }
  }

}
