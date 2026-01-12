import { HttpClient } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, inject, Input, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiServiceRegistry } from '@instantsys-labs/core';
import { FxBaseComponent, FxComponent, FxOptionSetting, FxSelectSetting, FxSetting, FxStringSetting, FxValidation, FxValidatorService } from '@instantsys-labs/fx';
import { Subject, takeUntil } from 'rxjs';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { CommonModule } from '@angular/common';
import { CalendarModule } from 'primeng/calendar';
import { RadioButtonModule } from 'primeng/radiobutton';

@Component({
  selector: 'radio-group-custom',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, FxComponent, CalendarModule,RadioButtonModule],
  templateUrl: './radio-group.component.html',
  styleUrl: './radio-group.component.css'
})
export class RadioGroupComponent extends FxBaseComponent implements OnInit, AfterViewInit{
private fb = inject(FormBuilder);
private destroy$ = new Subject<Boolean>();
formObject: object = {};
@Input() showOnSelection: 'yes' | 'no' = 'yes'; // configurable: show textarea on Yes or No
  showTextArea = false;
 public confirmationForm = this.fb.group({
      confirmation: [''],
      remarks: [''],
      valueToShowTextArea: [''],
      label:['']
    });

    options: any[] = [
      { option: 'Yes', value: 'YES' },
      { option: 'No', value: 'NO' },
      { option: 'NA', value: 'NA' }
    ];

    @ViewChild('fxComponent') fxComponent!: FxComponent;
    radoioMap = new Map<string, any>();
    compareValue: any;
    isRequired: boolean = false;
    isChildRequired: boolean = false;
    remarkMaxLength: number = 84;

    constructor(private cdr: ChangeDetectorRef,private http: HttpClient,private fxBuilderWrapperService: FxBuilderWrapperService,private fxApiService: ApiServiceRegistry) {
       super(cdr)
        this.onInit.subscribe(() => {
          this._register(this.confirmationForm);
        });
       
     }

       ngAfterViewInit(): void {
        this.options  = (this.fxComponent?.fxData?.settings?.find((s: any) => s.key === 'items') as any)?.options || [];
       const labelData =
  (this.fxComponent?.fxData?.settings?.find((s: any) => s.key === 'select-label') as any)?.value ??
  '';
this.compareValue = (this.fxComponent?.fxData?.settings?.find((s: any) => s.key === 'value-show-text') as any)?.value
         const label = this.confirmationForm.get('label');
         label?.setValue(labelData);
       setTimeout(() => {
  const key = this.fxComponent?.fxData?.name;

  if (key && this.radoioMap.has(key)) {
    this.confirmationForm.patchValue(this.radoioMap.get(key));
    const data = this.radoioMap.get(key);
    this.onSelectionChange(data.confirmation);
  }
}, 200);

       setTimeout(()=>{
     const mainControl = this.confirmationForm.get('confirmation');
     this.remarkMaxLength = Number(this.setting('remark-maxlength')) || 84;
     if(this.setting('isRadioRequired') === 'true'){
      this.isRequired = true;
      mainControl?.setValidators([Validators.required]);
      mainControl?.updateValueAndValidity();
     }
    },100)

        
       }
     
       ngOnInit(): void {
           this.fxBuilderWrapperService.variables$
          .pipe(takeUntil(this.destroy$))
          .subscribe((variables: any) => {
            if (!variables) return;
        
        
            // for (const [key, value] of Object.entries(variables) as [string, any][]) {
            //   if (key.includes('radio-group-custom')) {
            //    this.formObject = value;
            //   }
            // }

            for (const [key, value] of Object.entries(variables) as [string, any][]) {
  if (
    value &&
    typeof value === 'object' &&
    'confirmation' in value
  ) {
    this.radoioMap.set(key, value);
  }
}

            
       })

        this.options  = (this.fxComponent?.fxData?.settings?.find((s: any) => s.key === 'items') as any)?.options || [];


      //  this.setting('items').length > 0 ? this.options = this.setting('items') : null;
     
      //   this.confirmationForm.get('confirmation')?.valueChanges.subscribe(value => {
      //    const otherControl = this.confirmationForm.get('remarks');
      //    const valueToShowTextArea = this.confirmationForm.get('valueToShowTextArea');
      //    if (value) {
      //      otherControl?.setValidators([Validators.required]);
      //      valueToShowTextArea?.setValue(this.setting('value-show-text'));

      //     } else {
      //      otherControl?.clearValidators();
      //      otherControl?.reset();
      //      valueToShowTextArea?.reset();
      //    }
      //  });
       
     
     }

     protected settings(): FxSetting[] {
          return [
            // new FxStringSetting({ key: 'clinicalNotesURL', $title: 'API Url', value: '' }),
            new FxStringSetting({ key: 'customClasss', $title: 'Custom Class Name', value: '' }),
             new FxStringSetting({ key: 'select-label', $title: 'Header Label', value: 'Header Label' }), 
              // new FxStringSetting({ key: 'option-value-one', $title: 'Value one', value: 'Value one' }), 
              //  new FxStringSetting({ key: 'option-value-two', $title: 'Value two', value: 'Value two' }), 
              //   new FxStringSetting({ key: 'option-label-one', $title: 'Label one', value: 'Label one' }), 
              //   new FxStringSetting({ key: 'option-label-two', $title: 'Label two', value: 'Label two' }), 
                new FxStringSetting({ key: 'value-show-text', $title: 'Value to show textarea', value: 'Value to show textarea' }),
                new FxOptionSetting({ key: 'items', $title: 'Options', value: [{option: 'Yes', value: 'yes'}, {option: 'No', value: 'no'}]  }, [{option: 'Yes', value: 'yes'}, {option: 'No', value: 'no'}]), 
                new FxStringSetting({ key: 'additional-field-label', $title: 'Additional field label', value: '' }),
                new FxStringSetting({ key: 'additional-field-error-msg', $title: 'Additional field error message', value: 'Please fill out the field' }),
                new FxStringSetting({ key: 'error-msg', $title: 'Error message', value: 'Please select' }),
                new FxStringSetting({ key: 'remark-placeholder', $title: 'Additional field placeholder', value: 'enter here' }),
                new FxSelectSetting({key: 'isRadioRequired', $title: 'Required', value: 'true'}, [{option: 'Yes', value: 'true'}, {option: 'No', value: 'false'}]),    
                new FxStringSetting({ key: 'remark-maxlength', $title: 'Additional field max length', value: 84 }),
            //   new FxStringSetting({ key: 'other-placeholder', $title: 'Other Placeholder', value: '' }),  
            //   new FxSelectSetting({key: 'serviceName', $title: 'Service', value: ''}, [{option: 'User Service', value: 'user_service'}, {option: 'Patient Service', value: 'patient_service'},{option: 'Workflow Service', value: 'workflow_service'}]),
            //   // new FxSelectSetting({key: 'service', $title: 'Service', value: 'local'}, [{option: 'Local', value: 'local'}, {option: 'QA', value: 'qa'},{option: 'UAT', value: 'uat'},{option: 'Production', value: 'prod'}]),   
            //   // new FxSelectSetting({key: 'isRequired', $title: 'Required', value: true}, [{option: 'Yes', value: true}, {option: 'No', value: false}]),    
            //    new FxStringSetting({ key: 'errorMessage', $title: 'Error Message', value: 'Please fill out the field' }),  
          ];
        }
      
        protected validations(): FxValidation[] {
          return [];
        }

        onSelectionChange(selection: string) {

    this.showTextArea = selection === this.compareValue;
    if(this.showTextArea){
const valueToShowTextArea = this.confirmationForm.get('valueToShowTextArea');
 valueToShowTextArea?.setValue(this.setting('value-show-text'));
const otherControl = this.confirmationForm.get('remarks');
this.isChildRequired = true;
otherControl?.setValidators([Validators.required]);
otherControl?.updateValueAndValidity();
    }
    else{
      const otherControl = this.confirmationForm.get('remarks');
      this.isChildRequired = false;
      otherControl?.reset();
      otherControl?.clearValidators();
      otherControl?.updateValueAndValidity();
    }

  }
}
