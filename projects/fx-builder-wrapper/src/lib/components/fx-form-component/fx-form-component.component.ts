import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FxForm, FxFormComponent } from '@instantsys-labs/fx';
import { DispatchToClinicComponent } from '../../custom-controls/dispatch-to-clinic/dispatch-to-clinic.component';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { DynamicTableComponent } from '../dynamic-table/dynamic-table.component';
import { ToggleButtonComponent } from '../toggle-button/toggle-button.component';
import { UploaderComponent } from '../uploader/uploader.component';
import { ToggleComponent } from '../toggle/toggle.component';
import { UploaderCheckboxComponent } from '../uploader-checkbox/uploader-checkbox.component';
import { DatePickerComponent } from '../date-picker/date-picker.component';
import { DropdownWithOtherComponent } from '../dropdown-with-other/dropdown-with-other.component';
import { RadioGroupComponent } from '../radio-group/radio-group.component';
import { MultiselectDropdownComponent } from '../multiselect-dropdown/multiselect-dropdown.component';
import { MultiselectDropdownWithChildsComponent } from '../multiselect-dropdown-with-childs/multiselect-dropdown-with-childs.component';
import { DropdownWithSearchComponent } from '../dropdown-with-search/dropdown-with-search.component';
import { AccordianComponent } from '../accordian/accordian.component';
import { SummaryComponent } from '../summary/summary.component';
import { CustomizeDropdownComponent } from '../customize-dropdown/customize-dropdown.component';
import { HeadingComponent } from '../heading/heading.component';
import { CheckboxComponent } from '../checkbox/checkbox.component';
// import { CustomizeDropdownComponent } from '../multiselect-with-form-fields/customize-dropdown.component';

@Component({
  selector: 'fx-form-component',
  standalone: true,
  imports: [CommonModule, FxFormComponent],
  template: `
    <fx-form 
      [fxForm]="fxForm" 
      [value]="variables" 
      (onSubmit)="onSubmit($event)" 
      #form
    >
    </fx-form>
  `,
})
export class FxFormWrapperComponent implements OnChanges, OnInit {
  @ViewChild('form') form!: FxFormComponent;
  @Input() fxForm!: FxForm;
  @Input() variables: any;
  @Output() fxFormSubmit = new EventEmitter<any>();

  constructor(private fxWrapperService: FxBuilderWrapperService) {
    this.registerCustomComponents();
   }

  public ngOnChanges(changes: SimpleChanges): void { 
    // if('variables' in changes && !changes['fxForm']) {
    //   this.fxWrapperService.variables$.next(this.variables);
    // }
    if ('variables' in changes) {
      this.fxWrapperService.variables$.next(this.variables);
    }
  }

  public ngOnInit(): void {
    // if (!Boolean(this.fxWrapperService.getComponent('dispatch-to-clinic'))) {
    //   this.fxWrapperService.registerCustomComponent('Dispatch To Clinic', 'dispatch-to-clinic', DispatchToClinicComponent);
    // }
    // if (!Boolean(this.fxWrapperService.getComponent('dynamic-table'))) {
    //   this.fxWrapperService.registerCustomComponent('Dynamic Table', 'dynamic-table', DynamicTableComponent);
    // }
    // if (!Boolean(this.fxWrapperService.getComponent('toggle-button'))) {
    //   this.fxWrapperService.registerCustomComponent('Toggle Button', 'toggle-button', ToggleButtonComponent);
    // }
    // if (!Boolean(this.fxWrapperService.getComponent('uploader'))) {
    //   this.fxWrapperService.registerCustomComponent('Uploader', 'uploader', UploaderComponent);
    // }
    // if (!Boolean(this.fxWrapperService.getComponent('toggle'))) {
    //   this.fxWrapperService.registerCustomComponent('Toggle', 'toggle', ToggleComponent);
    // }
  }


  private registerCustomComponents(): void {
    const components = [
      { name: 'Dispatch To Clinic', key: 'dispatch-to-clinic', component: DispatchToClinicComponent },
      { name: 'Dynamic Table', key: 'dynamic-table', component: DynamicTableComponent },
      { name: 'Toggle Button', key: 'toggle-button', component: ToggleButtonComponent },
      { name: 'Uploader', key: 'uploader', component: UploaderComponent },
      { name: 'Toggle', key: 'toggle', component: ToggleComponent },
      { name: 'Uploader with Checkbox', key: 'uploader-checkbox', component: UploaderCheckboxComponent },
      { name: 'Date Picker', key: 'lib-date-picker', component: DatePickerComponent },
      { name: 'Smartlist with Other', key: 'dropdown-with-other', component: DropdownWithOtherComponent },
      { name: 'Radio Group with Other', key: 'radio-group-custom', component: RadioGroupComponent },
      { name: 'Multiselect Dropdown', key: 'lib-multiselect-dropdown', component: MultiselectDropdownComponent },
      { name: 'Multiselect Dropdown with Childs', key: 'lib-multiselect-dropdown-with-childs', component: MultiselectDropdownWithChildsComponent },
      { name: 'Dropdown with Search', key: 'lib-dropdown-with-search', component: DropdownWithSearchComponent },
      { name: 'Multiselect with Form ', key: 'lib-customize-dropdown', component: CustomizeDropdownComponent },
      { name: 'Summary', key: 'lib-summary', component: SummaryComponent },
      { name: 'Header', key: 'lib-heading', component: HeadingComponent },
      { name: 'Checkbox', key: 'lib-checkbox', component: CheckboxComponent },
    ];
    
    components.forEach(({ name, key, component }) => {
      if (!this.fxWrapperService.getComponent(key)) {
        this.fxWrapperService.registerCustomComponent(name, key, component);
      }
    });
  }

  public onSubmit(event: any): void {
    this.fxFormSubmit.emit(event);
  }

  public submit(): void {
    this.form.submit();
  }
}
