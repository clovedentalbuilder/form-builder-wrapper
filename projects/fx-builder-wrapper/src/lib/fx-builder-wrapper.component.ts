import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FxBuilderConfiguration, FxComponentBuilder, FxForm, FxMode, FxScope, FxUtils } from '@instantsys-labs/fx';
import { DispatchToClinicComponent } from './custom-controls/dispatch-to-clinic/dispatch-to-clinic.component';
import { FxBuilderWrapperService } from './fx-builder-wrapper.service';
import { DynamicTableComponent } from './components/dynamic-table/dynamic-table.component';
import { ToggleButtonComponent } from './components/toggle-button/toggle-button.component';
import { UploaderComponent } from './components/uploader/uploader.component';
import { ToggleComponent } from './components/toggle/toggle.component';
import { UploaderCheckboxComponent } from './components/uploader-checkbox/uploader-checkbox.component';
import { DatePickerComponent } from './components/date-picker/date-picker.component';
import { DropdownWithOtherComponent } from './components/dropdown-with-other/dropdown-with-other.component';
import { RadioGroupComponent } from './components/radio-group/radio-group.component';
import { MultiselectDropdownComponent } from './components/multiselect-dropdown/multiselect-dropdown.component';
import { MultiselectDropdownWithChildsComponent } from './components/multiselect-dropdown-with-childs/multiselect-dropdown-with-childs.component';
import { DropdownWithSearchComponent } from './components/dropdown-with-search/dropdown-with-search.component';
import { AccordianComponent } from './components/accordian/accordian.component';
import { SummaryComponent } from './components/summary/summary.component';
import { CustomizeDropdownComponent } from './components/customize-dropdown/customize-dropdown.component';
import { HeadingComponent } from './components/heading/heading.component';
import { CheckboxComponent } from './components/checkbox/checkbox.component';
import { RadioButtonWithOtherComponent } from './components/radio-button-with-other/radio-button-with-other.component';
import { CheckboxGroupComponent } from './components/checkbox-group/checkbox-group.component';
import { RadioWithChildFieldComponent } from './components/radio-with-child-field/radio-with-child-field.component';
import { DropdownWithChildFieldComponent } from './components/dropdown-with-child-field/dropdown-with-child-field.component';
import { SectionComponent } from './components/section/section.component';
import { StepperComponent } from './components/stepper/stepper.component';
import { RepeatableGroupComponent } from './components/repeatable-group/repeatable-group.component';
import { VoucherItemsComponent } from './components/voucher-items/voucher-items.component';
import { ToggleSwitchComponent } from './components/toggle-switch/toggle-switch.component';
// import { CustomizeDropdownComponent } from './components/multiselect-with-form-fields/customize-dropdown.component';

@Component({
  selector: 'fx-builder-wrapper',
  standalone: true,
  imports: [CommonModule, FxComponentBuilder],
  template: `
    <fx-component-builder 
        #componentBuilder 
        [fx-form]="fxForm" 
        [configuration]="fxConfiguration" 
        [scope]="FxScope.BUILDER"
        >
    </fx-component-builder>
  `,
  styleUrl: './form-builder.css',
})
export class FxBuilderWrapperComponent implements OnInit {
  @ViewChild('componentBuilder') componentBuilder!: FxComponentBuilder;
  @Input({ alias: 'fx-form', required: true }) fxForm: FxForm = FxUtils.createNewForm();
  public fxMode: FxMode = FxMode.EDIT;
  public fxConfiguration: FxBuilderConfiguration = {
    settings: true,
    logics: true,
    customControls: true,
  }

  protected readonly FxScope = FxScope;
  protected readonly FxMode = FxMode;

  constructor(private fxWrapperService: FxBuilderWrapperService) { }

  public ngOnInit(): void {
    if (!Boolean(this.fxWrapperService.getComponent('dispatch-to-clinic'))) {
      this.fxWrapperService.registerCustomComponent('Dispatch To Clinic', 'dispatch-to-clinic', DispatchToClinicComponent);
    }
    if (!Boolean(this.fxWrapperService.getComponent('dynamic-table'))) {
      this.fxWrapperService.registerCustomComponent('Dynamic Table', 'dynamic-table', DynamicTableComponent);
    }
    if (!Boolean(this.fxWrapperService.getComponent('toggle-button'))) {
      this.fxWrapperService.registerCustomComponent('Toggle Button', 'toggle-button', ToggleButtonComponent);
    }
    if (!Boolean(this.fxWrapperService.getComponent('uploader'))) {
      this.fxWrapperService.registerCustomComponent('Uploader', 'uploader', UploaderComponent);
    }
    if (!Boolean(this.fxWrapperService.getComponent('uploader-checkbox'))) {
      this.fxWrapperService.registerCustomComponent('Uploader with Checkbox', 'uploader-checkbox', UploaderCheckboxComponent);
    }
    if (!Boolean(this.fxWrapperService.getComponent('toggle'))) {
      this.fxWrapperService.registerCustomComponent('Toggle', 'toggle', ToggleComponent);
    }
    if (!Boolean(this.fxWrapperService.getComponent('lib-date-picker'))) {
      this.fxWrapperService.registerCustomComponent('Date Picker', 'lib-date-picker', DatePickerComponent);
    }
        if (!Boolean(this.fxWrapperService.getComponent('dropdown-with-other'))) {
      this.fxWrapperService.registerCustomComponent('Smartlist with Other', 'dropdown-with-other', DropdownWithOtherComponent);
    }
       if (!Boolean(this.fxWrapperService.getComponent('radio-group-custom'))) {
      this.fxWrapperService.registerCustomComponent('Radio Group with Other', 'radio-group-custom', RadioGroupComponent);
    }
     if (!Boolean(this.fxWrapperService.getComponent('lib-multiselect-dropdown'))) {
      this.fxWrapperService.registerCustomComponent('Multiselect Dropdown', 'lib-multiselect-dropdown', MultiselectDropdownComponent);
    }
     if (!Boolean(this.fxWrapperService.getComponent('lib-multiselect-dropdown-with-childs'))) {
      this.fxWrapperService.registerCustomComponent('Multiselect Dropdown with Childs', 'lib-multiselect-dropdown-with-childs', MultiselectDropdownWithChildsComponent);
    }
     if (!Boolean(this.fxWrapperService.getComponent('lib-dropdown-with-search'))) {
      this.fxWrapperService.registerCustomComponent('Dropdown with Search', 'lib-dropdown-with-search', DropdownWithSearchComponent);
    }
    if (!Boolean(this.fxWrapperService.getComponent('lib-customize-dropdown'))) {
      this.fxWrapperService.registerCustomComponent('Multiselect with Form', 'lib-customize-dropdown', CustomizeDropdownComponent);
    }
    //   if (!Boolean(this.fxWrapperService.getComponent('lib-accordian'))) {
    //   this.fxWrapperService.registerCustomComponent('Accordian', 'lib-accordian', AccordianComponent);
    // }
     if (!Boolean(this.fxWrapperService.getComponent('lib-summary'))) {
      this.fxWrapperService.registerCustomComponent('Summary', 'lib-summary', SummaryComponent);
    }
         if (!Boolean(this.fxWrapperService.getComponent('lib-heading'))) {
      this.fxWrapperService.registerCustomComponent('Header', 'lib-heading', HeadingComponent);
    }
    if (!Boolean(this.fxWrapperService.getComponent('lib-checkbox'))) {
      this.fxWrapperService.registerCustomComponent('Checkbox', 'lib-checkbox', CheckboxComponent);
    }
    if (!Boolean(this.fxWrapperService.getComponent('radio-button-with-other'))) {
      this.fxWrapperService.registerCustomComponent('Dynamic Radio Button with Other', 'radio-button-with-other', RadioButtonWithOtherComponent);
    }
    if (!Boolean(this.fxWrapperService.getComponent('lib-checkbox-group'))) {
      this.fxWrapperService.registerCustomComponent('Checkbox Group', 'lib-checkbox-group', CheckboxGroupComponent);
    }
    if (!Boolean(this.fxWrapperService.getComponent('radio-with-child-field'))) {
      this.fxWrapperService.registerCustomComponent('Radio with Child Field', 'radio-with-child-field', RadioWithChildFieldComponent);
    }
    if (!Boolean(this.fxWrapperService.getComponent('dropdown-with-child-field'))) {
      this.fxWrapperService.registerCustomComponent('Dropdown with Child Field', 'dropdown-with-child-field', DropdownWithChildFieldComponent);
    }
    if (!Boolean(this.fxWrapperService.getComponent('lib-section'))) {
      this.fxWrapperService.registerCustomComponent('Section', 'lib-section', SectionComponent);
    }
    if (!Boolean(this.fxWrapperService.getComponent('lib-stepper'))) {
      this.fxWrapperService.registerCustomComponent('Stepper', 'lib-stepper', StepperComponent);
    }
    if (!Boolean(this.fxWrapperService.getComponent('lib-repeatable-group'))) {
      this.fxWrapperService.registerCustomComponent('Repeatable Group', 'lib-repeatable-group', RepeatableGroupComponent);
    }
    if (!Boolean(this.fxWrapperService.getComponent('lib-voucher-items'))) {
      this.fxWrapperService.registerCustomComponent('Voucher Items', 'lib-voucher-items', VoucherItemsComponent);
    }
    if (!Boolean(this.fxWrapperService.getComponent('lib-toggle-switch'))) {
      this.fxWrapperService.registerCustomComponent('Toggle Switch', 'lib-toggle-switch', ToggleSwitchComponent);
    }
  };

 
  public getParsedForm(): FxForm {
    return this.componentBuilder.getParsedForm();
  }

  public getInitializedFxForm(): FxForm {
    return FxUtils.createNewForm(); 
  }
}


