import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'fx-configuration-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, DialogModule, InputTextModule, FormsModule, DropdownModule, ButtonModule],
  templateUrl: './configuration-panel.component.html',
  styleUrl: './configuration-panel.component.css',
})
export class ConfigurationPanelComponent implements OnInit , OnChanges{
  @Input() visible: boolean = false;
  @Input() configs: any;
  @Output() isVisible = new EventEmitter<boolean>();
  @Output() configuration = new EventEmitter<any>();
  @Input() tableConfigData:any;

  public rows: number = 1;
  public enableAPI: boolean = false;
  public api: string = '';

  public dynamicForm: FormGroup;
  public columnTypes: string[] = ['text', 'input-text', 'input-number', 'dropdown', 'smart-dropdown', 'checkbox', 'radio', 'radio-group', 'file-upload', 'textarea', 'action'];

  constructor(private fb: FormBuilder) {
    this.dynamicForm = this.fb.group({
      columns: this.fb.array([])
    });
  }
  ngOnChanges(changes: SimpleChanges): void {
 
  }
  ngOnInit(): void {
    if (this.tableConfigData?.value?.columns) {
      this.patchData();  // If data exists, patch it into the form
    } else {
      this.addColumn();  // Otherwise, add a default column
    }
  }

  get columns(): FormArray {
    return this.dynamicForm.get('columns') as FormArray;
  }

  // **🔹 Add Column Dynamically**
  public addColumn(): void {
    const columnFormGroup = this.fb.group({
      header: ['', Validators.required],
      cellType: ['', Validators.required],
      placeholder: '',
      options: this.fb.array([]),
      apiUrl: '',
      valueKey: '',
      labelKey: '',
      className: '',
      apiKey: '',
      isMultiselect: false,
      checkedValue: '',
      unCheckedValue: '',
      checkBoxLabel: '',
      isRequired:false,
      errorMessage:'',
      // actionName: '',
      // actionIconPath: '',
      // apiType:'',
      // apiUrlToCall: '',
      action: this.fb.array([]),
      payloadOptions: this.fb.array([])
    });
    this.columns.push(columnFormGroup);
  }

 
  public removeColumn(index: number): void {
    if (this.columns.length > 1) {
      this.columns.removeAt(index);
    }
  }

  // **🔹 Duplicate Column**
  public duplicateColumn(index: number): void {
    const currentColumn = this.columns.at(index).value;
    const duplicateColumn = this.fb.group({
      header: [currentColumn.header, Validators.required],
      cellType: [currentColumn.cellType, Validators.required],
      placeholder: [currentColumn.placeholder],
      apiUrl: [currentColumn.apiUrl],
      valueKey: [currentColumn.valueKey],
      labelKey: [currentColumn.labelKey],
      className: [currentColumn.className],
      apiKey: [currentColumn.apiKey],
      isMultiselect: false,
      checkedValue: [currentColumn.checkedValue],
      unCheckedValue: [currentColumn.unCheckedValue],
      checkBoxLabel:[currentColumn.checkBoxLabel],
      isRequired:[currentColumn.isRequired],
      errorMessage:[currentColumn.errorMessage],
      // actionName: [currentColumn.actionName],
      // actionIconPath: [currentColumn.actionIconPath],
      // apiType:[currentColumn.apiType],
      // apiUrlToCall: [currentColumn.apiUrlToCall],
      // payloadOptions:this.fb.array(
      //   currentColumn.payloadOptions.map((option: any) => this.fb.group({
      //     payloadOptionName: [option.payloadOptionName, Validators.required],
      //     payloadOptionValue: [option.payloadOptionValue, Validators.required]
      //   }))
      // ),
      action: this.fb.array([]),
      options: this.fb.array(
        currentColumn.options.map((option: any) => this.fb.group({
          optionName: [option.optionName, Validators.required],
          optionValue: [option.optionValue, Validators.required]
        }))
      )
    });
    this.columns.insert(index + 1, duplicateColumn);
  }

  // **🔹 Add Options Dynamically**
  public addOption(columnIndex: number): void {
    const optionGroup = this.fb.group({
      optionName: ['', Validators.required],
      optionValue: ['', Validators.required]
    });

    this.getOptions(columnIndex).push(optionGroup);
  }

  // public addPayloadOption(columnIndex: number): void {
  //   const optionGroup = this.fb.group({
  //     payloadOptionName: ['', Validators.required],
  //     payloadOptionValue: ['', Validators.required]
  //   });

  //   this.getPayloadOptions(columnIndex).push(optionGroup);
  // }


  

  // **🔹 Get Options FormArray for a Specific Column**
  public getOptions(columnIndex: number): FormArray {
    return this.columns.at(columnIndex).get('options') as FormArray;
  }

  // public getPayloadOptions(columnIndex: number): FormArray {
  //   return this.columns.at(columnIndex).get('payloadOptions') as FormArray;
  // }

  // **🔹 Close Dialog**
  public closeDialog(): void {
    this.isVisible.emit(false);
  }

  // **🔹 Save Configuration**
  public saveConfiguration(): void {
    this.configuration.emit({
      rows: this.rows,
      columns: this.dynamicForm.value?.columns,
      enableAPI: this.enableAPI,
      api: this.api
    });
    this.isVisible.emit(false);
  }

  public onSubmit(): void {
    console.log("Value columns formArray", this.dynamicForm.value);
  }

  // public patchData(): void {
  //   this.enableAPI = this.tableConfigData?.value?.generalValues?.enableAPI;
  //   this.api = this.tableConfigData?.value?.generalValues?.api;
  //   this.tableConfigData?.value?.columns.forEach((column: any) => {
  //     // Creating the FormGroup for each column
  //     const columnFormGroup = this.fb.group({
  //       header: [column.header || '', Validators.required],
  //       cellType: [column.cellType || '', Validators.required],
  //       placeholder: [column.placeholder || ''],
  //       options: this.fb.array(
  //         column.options ? column.options.map((option: any) => 
  //           this.fb.group({
  //             optionName: [option.optionName, Validators.required],
  //             optionValue: [option.optionValue, Validators.required]
  //           })
  //         ) : []
  //       ),
  //       apiUrl: [column.apiUrl || ''],
  //       valueKey: [column.valueKey || ''],
  //       labelKey: [column.labelKey || ''],
  //       className: [column.className || ''],
  //       apiKey: [column.apiKey || ''],
  //       isMultiselect: [column.isMultiselect || false],
  //       checkBoxLabel:  [column.checkBoxLabel || ''],
  //       checkedValue: [column.checkedValue || ''],
  //       unCheckedValue: [column.unCheckedValue || ''],
  //       isRequired:[column.isRequired || false],
  //       errorMessage:[column.errorMessage || ''],
  //     });
  
      
  //     this.columns.push(columnFormGroup);
  //   });
  // }

  public patchData(): void {
    this.enableAPI = this.tableConfigData?.value?.generalValues?.enableAPI;
    this.api = this.tableConfigData?.value?.generalValues?.api;
  
    this.tableConfigData?.value?.columns.forEach((column: any) => {
      const actionArray = this.fb.array(
        column.action
          ? column.action.map((action: any) =>
              this.fb.group({
                actionName: [action.actionName || ''],
                actionIconPath: [action.actionIconPath || ''],
                apiType: [action.apiType || ''],
                apiUrlToCall: [action.apiUrlToCall || ''],
                isConfirmationRequired: [action.isConfirmationRequired || ''],
                payloadOptions: this.fb.array(
                  action.payloadOptions
                    ? action.payloadOptions.map((payload: any) =>
                        this.fb.group({
                          payloadOptionName: [payload.payloadOptionName || '', Validators.required],
                          payloadOptionValue: [payload.payloadOptionValue || '', Validators.required]
                        })
                      )
                    : []
                )
              })
            )
          : []
      );
  
      const columnFormGroup = this.fb.group({
        header: [column.header || '', Validators.required],
        cellType: [column.cellType || '', Validators.required],
        placeholder: [column.placeholder || ''],
        options: this.fb.array(
          column.options
            ? column.options.map((option: any) =>
                this.fb.group({
                  optionName: [option.optionName, Validators.required],
                  optionValue: [option.optionValue, Validators.required]
                })
              )
            : []
        ),
        apiUrl: [column.apiUrl || ''],
        valueKey: [column.valueKey || ''],
        labelKey: [column.labelKey || ''],
        className: [column.className || ''],
        apiKey: [column.apiKey || ''],
        isMultiselect: [column.isMultiselect || false],
        checkBoxLabel: [column.checkBoxLabel || ''],
        checkedValue: [column.checkedValue || ''],
        unCheckedValue: [column.unCheckedValue || ''],
        isRequired: [column.isRequired || false],
        errorMessage: [column.errorMessage || ''],
        action: actionArray // ✅ add the FormArray of actions here
      });
  
      this.columns.push(columnFormGroup);
    });
  }
  


  getActions(columnIndex: number): FormArray {
    return this.columns.at(columnIndex).get('action') as FormArray;
  }
  
  addActionToColumn(columnIndex: number): void {
    const actions = this.getActions(columnIndex);
    actions.push(this.fb.group({
      actionName: [''],
      actionIconPath: [''],
      apiType: [''],
      apiUrlToCall: [''],
      isConfirmationRequired: [''],
      payloadOptions: this.fb.array([])
    }));
  }
  
  removeActionFromColumn(columnIndex: number, actionIndex: number): void {
    const actions = this.getActions(columnIndex);
    actions.removeAt(actionIndex);
  }
  
  getPayloadOptions(columnIndex: number, actionIndex: number): FormArray {
    return this.getActions(columnIndex)
               .at(actionIndex)
               .get('payloadOptions') as FormArray;
  }
  
  addPayloadOption(columnIndex: number, actionIndex: number): void {
    const payloadOptions = this.getPayloadOptions(columnIndex, actionIndex);
    payloadOptions.push(this.fb.group({
      payloadOptionName: [''],
      payloadOptionValue: ['']
    }));
  }
  
}
