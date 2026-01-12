
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FxBaseComponent, FxComponent, FxSetting, FxStringSetting, FxValidation, FxValidatorService } from '@instantsys-labs/fx';
import { CalendarModule } from 'primeng/calendar';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'lib-accordian',
  standalone: true,
  imports: [FxComponent,CommonModule,ReactiveFormsModule,FormsModule,CalendarModule],
  templateUrl: './accordian.component.html',
  styleUrl: './accordian.component.css'
})
export class AccordianComponent extends FxBaseComponent implements OnInit{

sectionOpened: boolean = true;
   constructor(private cdr: ChangeDetectorRef,private http: HttpClient,private fxBuilderWrapperService: FxBuilderWrapperService) {
      super(cdr)
      this.onInit.subscribe(() => {
        // this._register(this.datePickerForm);
      });
     
    }

    ngOnInit(): void {
      
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

       toggleSection() {
    this.sectionOpened = !this.sectionOpened;
  }
}
