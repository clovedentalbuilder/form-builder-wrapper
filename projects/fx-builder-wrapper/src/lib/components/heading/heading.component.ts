import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FxBaseComponent, FxComponent, FxSelectSetting, FxSetting, FxStringSetting, FxValidation, FxValidatorService } from '@instantsys-labs/fx';
import { CalendarModule } from 'primeng/calendar';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';

@Component({
  selector: 'lib-heading',
  standalone: true,
  imports: [FxComponent,CommonModule],
  templateUrl: './heading.component.html',
  styleUrl: './heading.component.css'
})
export class HeadingComponent extends FxBaseComponent implements OnInit {
  selectedLevel: number = 1;
  headingText: string = '';
sectionOpened: boolean = true;
   constructor(private cdr: ChangeDetectorRef,private http: HttpClient,private fxBuilderWrapperService: FxBuilderWrapperService) {
      super(cdr)
      this.onInit.subscribe(() => {
        // this._register(this.datePickerForm);
      });
     
    }

    ngOnInit(): void {

      this.selectedLevel = this.setting('hType') || 1;
      this.headingText = this.setting('hLabel') || 'Header';
      
    }


   protected settings(): FxSetting[] {
        return [
          new FxStringSetting({ key: 'hLabel', $title: 'Label', value: 'Header' }),
          // new FxSelectSetting({ key: 'hType', $title: 'Heading Type', value: 1 }, [{ option: 'H1', value: 1 }, { option: 'H2', value: 2 }, { option: 'H3', value: 3 }, { option: 'H4', value: 4 }, { option: 'H5', value: 5 }, { option: 'H6', value: 6 }]),
         new FxStringSetting({ key: 'hClass', $title: 'Custom Class Name', value: '' }),
        ];
      }
    
      protected validations(): FxValidation[] {
        return [];
      }

}
