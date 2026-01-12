import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewChecked, ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FxBaseComponent, FxComponent, FxSetting, FxStringSetting, FxValidation, FxValidatorService } from '@instantsys-labs/fx';
import { CalendarModule } from 'primeng/calendar';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'lib-summary',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, FxComponent],
  templateUrl: './summary.component.html',
  styleUrl: './summary.component.css'
})
export class SummaryComponent extends FxBaseComponent implements OnInit, AfterViewChecked{
  private fb = inject(FormBuilder);

minDate!: string;
maxDate!: string;
   today = new Date();
   @ViewChild('fxComponent') fxComponent!: FxComponent;
   private destroy$ = new Subject<Boolean>();
   datePickerMap = new Map<string, any>();
  
   


    public summaryForm: FormGroup = this.fb.group({
       summary: [''],
     })

      dynamicText: string = '';
   constructor(private cdr: ChangeDetectorRef,private http: HttpClient,private fxBuilderWrapperService: FxBuilderWrapperService) {
      super(cdr)
      this.onInit.subscribe(() => {
        this._register(this.summaryForm);
      });
     
    }


  ngOnInit(): void {
    this.dynamicText = this.setting('summaryText') || '';
   this.fxBuilderWrapperService.variables$
  .pipe(takeUntil(this.destroy$))
  .subscribe((variables: any) => {
    if (!variables) return;
  });
  }

   ngAfterViewInit(): void {
    const key = this.fxComponent?.fxData?.name;
    if(key){
    }
    this.getContextBaseId();
  }

  

  private formatDate(date: Date): string {
  return date.toISOString().split('T')[0]; 
}
  


    protected settings(): FxSetting[] {
        return [
          new FxStringSetting({ key: 'summaryText', $title: 'Summary Text', value: '' }),
          new FxStringSetting({ key: 'summaryLabel', $title: 'Label', value: '' }),
        ];
      }
    
      protected validations(): FxValidation[] {
        return [];
      }

    updateTextArea(): void {
    const formValues = this.fxComponent?.fxData?.$formGroup?.value;
    const dynamicText = this.replacePlaceholders(this.dynamicText, formValues);
    this.summaryForm.patchValue({ summary: dynamicText });
    this.cdr.detectChanges();
  }

  replacePlaceholders(template: string, values: any): string {
  return template.replace(/{(.*?)}/g, (match, placeholder) => {
    if (values[placeholder] !== undefined) {
      return values[placeholder];
    } else {
      return match;
    }
  });
}


  ngAfterViewChecked(): void {
    this.updateTextArea();
    this.cdr.detectChanges();
  }
}
