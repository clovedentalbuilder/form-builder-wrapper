import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FxBaseComponent, FxComponent, FxOptionSetting, FxSelectSetting, FxSetting, FxStringSetting, FxValidation, FxValidatorService } from '@instantsys-labs/fx';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { CalendarModule } from 'primeng/calendar';
import { Subject, takeUntil } from 'rxjs';
import { ApiServiceRegistry } from '@instantsys-labs/core'
import { TitleStrategy } from '@angular/router';

@Component({
  selector: 'dropdown-with-other',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, FxComponent, CalendarModule],
  templateUrl: './dropdown-with-other.component.html',
  styleUrl: './dropdown-with-other.component.css'
})
export class DropdownWithOtherComponent extends FxBaseComponent implements OnInit, AfterViewInit {
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<Boolean>();
  formObject: object = {};
  dropdownMap = new Map<string, any>();
  @ViewChild('fxComponent') fxComponent!: FxComponent;
  // options = [
  //       { optionValue: 'Clinical Notes 1', optionName: 'Clinical Notes 1' },
  //       { optionValue: 'Clinical Notes 2', optionName: 'Clinical Notes 2' },
  //       { optionValue: 'Clinical Notes 3', optionName: 'Clinical Notes 3' },
  //       { optionValue: 'other', optionName: 'Other' }
  // ];

  options: any[] = [];
  isRequired: boolean = false;
  isChildRequired: boolean = false;
  otherMaxLength: number = 768;

  public dropDownForm: FormGroup = this.fb.group({
    selectedOption: [''],
    otherInput: [{ value: '', disabled: true }],
  });

  constructor(private cdr: ChangeDetectorRef, private http: HttpClient, private fxBuilderWrapperService: FxBuilderWrapperService, private fxApiService: ApiServiceRegistry) {
    super(cdr)
    this.onInit.subscribe(() => {
      this._register(this.dropDownForm);
    });

  }

  ngAfterViewInit(): void {

    setTimeout(() => {
      const key = this.fxComponent?.fxData?.name;

      if (key && this.dropdownMap.has(key)) {
        this.dropDownForm.patchValue(this.dropdownMap.get(key));
      }
    }, 200);

    setTimeout(() => {
      this.otherMaxLength = Number(this.setting('other-maxLength')) || 768;
      const mainControl = this.dropDownForm.get('selectedOption');
      if (this.setting('isRequired') === 'true') {
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
            'selectedOption' in value
          ) {
            this.dropdownMap.set(key, value);
          }
        }

      })

    //  this.dropDownForm.get('selectedOption')?.valueChanges.subscribe(value => {
    //   const otherControl = this.dropDownForm.get('otherInput');
    //   if (value === 'other') {
    //     otherControl?.enable();
    //   } else {
    //     otherControl?.disable();
    //     otherControl?.reset();
    //   }
    // });
    const serviceUrl = this.fxApiService.getServiceUrl(this.setting('serviceName'));
    this.getOptions(serviceUrl, this.setting('clinicalNotesURL'));

    this.dropDownForm.get('selectedOption')?.valueChanges.subscribe(value => {
      const otherControl = this.dropDownForm.get('otherInput');

      if (value === 'other') {
        otherControl?.enable();
        this.isChildRequired = true;
        otherControl?.setValidators([Validators.required]);
      } else {
        this.isChildRequired = false;
        otherControl?.disable();
        otherControl?.reset();
        otherControl?.clearValidators();
      }

      otherControl?.updateValueAndValidity();
      otherControl?.markAsTouched();
    });

  }

  protected settings(): FxSetting[] {
    return [
      new FxStringSetting({ key: 'clinicalNotesURL', $title: 'API Url', value: '' }),
      new FxStringSetting({ key: 'customClass', $title: 'Custom Class Name', value: '' }),
      new FxStringSetting({ key: 'select-label', $title: 'Label', value: '' }),
      new FxStringSetting({ key: 'other-label', $title: 'Other Label', value: '' }),
      new FxStringSetting({ key: 'other-placeholder', $title: 'Other Placeholder', value: '' }),
      new FxStringSetting({ key: 'other-maxLength', $title: 'Other Max Length', value: 768 }),
      new FxSelectSetting({ key: 'serviceName', $title: 'Service', value: '' }, [{ option: 'User Service', value: 'user_service' }, { option: 'Patient Service', value: 'patient_service' }, { option: 'Workflow Service', value: 'workflow_service' }]),
      new FxSelectSetting({ key: 'isRequired', $title: 'Required', value: 'true' }, [{ option: 'Yes', value: 'true' }, { option: 'No', value: 'false' }]),
      new FxStringSetting({ key: 'errorMessage', $title: 'Error Message', value: 'Please fill out the field' }),
      new FxStringSetting({ key: 'errorMessageOther', $title: 'Other Error Message', value: 'Other is required' }),
    ];
  }

  protected validations(): FxValidation[] {
    return [FxValidatorService.required];
  }

  getOptions(serviceUrl: string, url: string) {
    const finalUrl = serviceUrl + url;
    this.http.get<any[]>(finalUrl).subscribe({
      next: (response: any) => {
        this.options = response?.data;
        this.options.push({ value: 'other', label: 'Other' });
      },
      error: (err) => {
        console.error('Error fetching options', err);
      }
    });
  }
}


