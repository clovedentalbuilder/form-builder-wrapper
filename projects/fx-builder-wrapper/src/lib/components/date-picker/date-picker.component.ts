import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FxBaseComponent, FxComponent, FxSetting, FxStringSetting, FxValidation, FxValidatorService } from '@instantsys-labs/fx';
import { CalendarModule } from 'primeng/calendar';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { Subject, takeUntil } from 'rxjs';
@Component({
  selector: 'lib-date-picker',
  standalone: true,
 imports: [CommonModule, ReactiveFormsModule, FormsModule, FxComponent, CalendarModule],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.css'
})
export class DatePickerComponent extends FxBaseComponent implements OnInit{
   private fb = inject(FormBuilder);
  //  minDate = new Date();
  //  maxDate  = new Date();
minDate!: string;
maxDate!: string;
   today = new Date();
   @ViewChild('fxComponent') fxComponent!: FxComponent;
   private destroy$ = new Subject<Boolean>();
    datePickerMap = new Map<string, any>();
   trtStartDatePatch!: string;


    public datePickerForm: FormGroup = this.fb.group({
       date: [new Date(),[Validators.required]],
     })

   constructor(private cdr: ChangeDetectorRef,private http: HttpClient,private fxBuilderWrapperService: FxBuilderWrapperService) {
      super(cdr)
      this.onInit.subscribe(() => {
        this._register(this.datePickerForm);
      });
     
    }


  ngOnInit(): void {

   this.fxBuilderWrapperService.variables$
  .pipe(takeUntil(this.destroy$))
  .subscribe((variables: any) => {
    if (!variables) return;

    this.datePickerMap = new Map<string, any>();

    // for (const [key, value] of Object.entries(variables) as [string, any][]) {
    //   if (key.includes('lib-date-picker')) {
    //     this.datePickerMap.set(key, value);
    //   }
    // }

    for (const [key, value] of Object.entries(variables) as [string, any][]) {
  if (
    value &&
    typeof value === 'object' &&
    'date' in value
  ) {
    this.datePickerMap.set(key, value);
  }

  if (key === 'trtStartDatePatch' && typeof value === 'string') {
  const formattedDate = value.split('T')[0];
  this.trtStartDatePatch = formattedDate;
}

}
  });


    // const today = new Date();
    // this.minDate = new Date(today);
    // this.minDate.setDate(today.getDate() - 30);

    // this.maxDate = new Date(today);
    // this.maxDate.setDate(today.getDate() + 30);

  // this.minDate = this.formatDate(new Date(this.today.setDate(new Date().getDate() - 30)));
  // this.maxDate = this.formatDate(new Date(this.today.setDate(new Date().getDate() + 31)));

  const today = new Date();

const min = new Date();
min.setDate(today.getDate() - 30);

const max = new Date();
max.setDate(today.getDate());

// this.minDate = this.formatDate(min);
// this.maxDate = this.formatDate(max);

    // this.getRangeValues();


  }

  get dateControl() {
    return this.datePickerForm.get('date');
  }

  ngAfterViewInit(): void {
    const key = this.fxComponent?.fxData?.name;
    if (key) {
      const datePatch = this.datePickerMap.get(key)
      const finalDate = datePatch || this.formatDate(new Date())
      if (this.trtStartDatePatch) {
        this.minDate = this.trtStartDatePatch;
        const today = new Date();
        const max = new Date();
        max.setDate(today.getDate());
        this.maxDate = this.formatDate(max);

      }
      else {
        this.minDate = this.formatDate(new Date(this.today.setDate(new Date().getDate() - 30)));

        this.minDate = this.trtStartDatePatch;
        const today = new Date();
        const max = new Date();
        max.setDate(today.getDate());
        this.maxDate = this.formatDate(max);

      }


      this.datePickerForm.patchValue({ date: finalDate });
    }
    this.getContextBaseId();
  }

  getRangeValues() {
    this.http.get<any>(this.setting('apiURL')).subscribe(response => {
      const today = new Date();
  
      const minOffset = response[this.setting('minDateKey')] || this.setting('minValidation');
      const maxOffset = response[this.setting('maxDateKey')] || this.setting('maxValidation');
  
      // this.minDate = new Date(today);
      // this.minDate.setDate(today.getDate() + minOffset);
  
      // this.maxDate = new Date(today);
      // this.maxDate.setDate(today.getDate() + maxOffset);

    this.minDate = this.formatDate(new Date(this.today.setDate(new Date().getDate() + minOffset)));
  this.maxDate = this.formatDate(new Date(this.today.setDate(new Date().getDate() + maxOffset)));
    });
  }

  private formatDate(date: Date): string {
  return date.toISOString().split('T')[0]; 
}
  


    protected settings(): FxSetting[] {
        return [
          new FxStringSetting({ key: 'minValidation', $title: 'Min Validation', value: '' }),
          new FxStringSetting({ key: 'maxValidation', $title: 'Max Validation', value: '' }),
          new FxStringSetting({ key: 'apiURL', $title: 'API Url', value: '' }),
          new FxStringSetting({ key: 'minDateKey', $title: 'Min Range API Key', value: '' }),
          new FxStringSetting({ key: 'maxDateKey', $title: 'Max Range API Key', value: '' }),
          new FxStringSetting({ key: 'placeHolder', $title: 'Placeholder', value: 'Select Date' }),
          new FxStringSetting({ key: 'label', $title: 'Label', value: '' }),
          new FxStringSetting({ key: 'datePickerErrorMessage', $title: 'Error Message', value: 'Please fill out the field' }),
         
        ];
      }
    
      protected validations(): FxValidation[] {
        return [FxValidatorService.required];
      }
}
