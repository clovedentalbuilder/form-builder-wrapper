import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
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
export class DatePickerComponent extends FxBaseComponent implements OnInit, AfterViewInit, OnDestroy {
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

  // Custom validator for date range
  private dateRangeValidator = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Let required validator handle empty values
    }

    const selectedDate = this.formatDate(new Date(control.value));
    
    if (this.minDate && selectedDate < this.minDate) {
      return { minDate: { minDate: this.minDate, actualDate: selectedDate } };
    }
    
    if (this.maxDate && selectedDate > this.maxDate) {
      return { maxDate: { maxDate: this.maxDate, actualDate: selectedDate } };
    }
    
    return null;
  }

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
        const today = new Date();
        const min = new Date();
        min.setDate(today.getDate() - 30);
        this.minDate = this.formatDate(min);
        
        const max = new Date();
        max.setDate(today.getDate());
        this.maxDate = this.formatDate(max);
      }

      // Add date range validator after min/max dates are set
      this.datePickerForm.get('date')?.setValidators([Validators.required, this.dateRangeValidator]);
      this.datePickerForm.get('date')?.updateValueAndValidity();

      this.datePickerForm.patchValue({ date: finalDate });
      
      // Subscribe to date changes to validate manual input (only when date is complete)
      this.datePickerForm.get('date')?.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe((value) => {
          // Only validate if value is a complete date string (YYYY-MM-DD format)
          if (value && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            // Use setTimeout to avoid validation during typing
            setTimeout(() => {
              this.validateAndCorrectDate(value);
            }, 0);
          }
        });
    }
    this.getContextBaseId();
  }

  // Validate and correct date when manually entered
  private validateAndCorrectDate(inputValue: string | Date): void {
    if (!inputValue) return;

    const dateControl = this.datePickerForm.get('date');
    if (!dateControl) return;

    let selectedDate: Date;
    let selectedDateStr: string;

    if (inputValue instanceof Date) {
      selectedDate = inputValue;
      selectedDateStr = this.formatDate(selectedDate);
    } else {
      selectedDateStr = inputValue;
      selectedDate = new Date(selectedDateStr + 'T00:00:00'); // Add time to avoid timezone issues
    }

    // Check if date is valid
    if (isNaN(selectedDate.getTime())) {
      // Invalid date, reset to previous valid value or minDate
      const previousValue = dateControl.value;
      if (previousValue && !isNaN(new Date(previousValue + 'T00:00:00').getTime())) {
        dateControl.setValue(previousValue, { emitEvent: false });
      } else if (this.minDate) {
        dateControl.setValue(this.minDate, { emitEvent: false });
      }
      return;
    }

    // Normalize date string to YYYY-MM-DD format
    selectedDateStr = this.formatDate(selectedDate);

    // Check if date is before minDate
    if (this.minDate && selectedDateStr < this.minDate) {
      dateControl.setValue(this.minDate, { emitEvent: false });
      dateControl.markAsTouched();
      dateControl.updateValueAndValidity({ emitEvent: false });
      this.cdr.detectChanges();
      return;
    }

    // Check if date is after maxDate
    if (this.maxDate && selectedDateStr > this.maxDate) {
      dateControl.setValue(this.maxDate, { emitEvent: false });
      dateControl.markAsTouched();
      dateControl.updateValueAndValidity({ emitEvent: false });
      this.cdr.detectChanges();
      return;
    }

    // Date is valid and within range, ensure it's in correct format
    dateControl.setValue(selectedDateStr, { emitEvent: false });
    dateControl.updateValueAndValidity();
  }

  // Handle blur event to validate date
  onDateBlur(): void {
    const dateControl = this.datePickerForm.get('date');
    if (dateControl && dateControl.value) {
      this.validateAndCorrectDate(dateControl.value);
      dateControl.markAsTouched();
    }
  }

  // Format date for display in error messages
  formatDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString();
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

  private formatDate(date: Date | string): string {
    if (typeof date === 'string') {
      // If it's already a string in YYYY-MM-DD format, return it
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      date = new Date(date);
    }
    return date.toISOString().split('T')[0]; 
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
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
