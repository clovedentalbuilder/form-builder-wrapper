import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FxForm, FxFormComponent } from '@instantsys-labs/fx';
import { DispatchToClinicComponent } from '../../custom-controls/dispatch-to-clinic/dispatch-to-clinic.component';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { COMPONENT_VALUE_ADAPTERS, findAdapterForValue } from './value-adapter-registry';
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
import { RadioButtonWithOtherComponent } from '../radio-button-with-other/radio-button-with-other.component';
import { CheckboxGroupComponent } from '../checkbox-group/checkbox-group.component';
// import { CustomizeDropdownComponent } from '../multiselect-with-form-fields/customize-dropdown.component';

@Component({
  selector: 'fx-form-component',
  standalone: true,
  imports: [CommonModule, FxFormComponent],
  template: `
    <fx-form
      [fxForm]="fxForm"
      [value]="normalizedVariables"
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

  get normalizedVariables(): any {
    if (!this.variables) return this.variables;
    const fieldElementMap = this.buildFieldElementMap();
    const result: any = {};
    for (const [key, val] of Object.entries(this.variables)) {
      const el = fieldElementMap.get(key);
      const currentAdapter = el?.selector ? COMPONENT_VALUE_ADAPTERS[el.selector] : undefined;

      if (currentAdapter) {
        // Custom component field: pass through as-is — it self-patches via variables$
        result[key] = val;
      } else {
        // Native field: extract primitive from any known custom-component object, then
        // apply a final safety net so a plain object/array never reaches a native input.
        const storedAdapter = findAdapterForValue(val);
        const extracted = storedAdapter ? storedAdapter.extractPrimitive(val) : val;
        result[key] = this.safeNativeValue(extracted);
      }
    }
    return result;
  }

  /**
   * Returns a copy of variables where each value is shaped to match the format
   * the current component expects. Pushed to variables$ so custom components
   * receive correctly-structured data even when the stored value came from a
   * different component type (e.g. native string → lib-checkbox boolean object).
   * resolveWrapOpts is called per-adapter so component-specific settings (e.g.
   * whether showOtherOption is enabled) influence how the value is wrapped.
   */
  private buildAdaptedVariables(): any {
    if (!this.variables) return this.variables;
    const fieldElementMap = this.buildFieldElementMap();
    const adapted: any = {};
    for (const [key, val] of Object.entries(this.variables)) {
      const el = fieldElementMap.get(key);
      const currentAdapter = el?.selector ? COMPONENT_VALUE_ADAPTERS[el.selector] : undefined;

      if (currentAdapter) {
        const storedAdapter = findAdapterForValue(val);
        if (storedAdapter === currentAdapter) {
          // Same type — no transformation needed
          adapted[key] = val;
        } else {
          // Either stored by a different custom component or a plain native value —
          // extract to primitive first, then wrap into the current component's shape.
          const primitive = storedAdapter ? storedAdapter.extractPrimitive(val) : val;
          const opts = currentAdapter.resolveWrapOpts ? currentAdapter.resolveWrapOpts(el) : {};
          adapted[key] = currentAdapter.wrapFromPrimitive(primitive, opts);
        }
      } else {
        adapted[key] = val;
      }
    }
    return adapted;
  }

  /** Ensures a value destined for a native form control is always a primitive. */
  private safeNativeValue(val: any): any {
    if (val !== null && typeof val === 'object') {
      // Covers both plain objects { } and arrays [ ] — neither is patchable
      // into a native fx element (fx-text-field, fx-select-list, fx-radio, etc.)
      return '';
    }
    return val;
  }

  private buildFieldElementMap(): Map<string, any> {
    const map = new Map<string, any>();
    if (this.fxForm?.elements) {
      this.collectFieldElements(this.fxForm.elements, map);
    }
    return map;
  }

  private collectFieldElements(elements: any[], map: Map<string, any>): void {
    for (const el of elements) {
      if (el.name) map.set(el.name, el);
      if (el.elements?.length) this.collectFieldElements(el.elements, map);
    }
  }

  constructor(private fxWrapperService: FxBuilderWrapperService) {
    this.registerCustomComponents();
   }

  public ngOnChanges(changes: SimpleChanges): void {
    if ('variables' in changes) {
      this.fxWrapperService.variables$.next(this.buildAdaptedVariables());
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
      { name: 'Dynamic Radio Button with Other', key: 'radio-button-with-other', component: RadioButtonWithOtherComponent },
      {name:'Checkbox Group', key:'lib-checkbox-group', component: CheckboxGroupComponent}
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
