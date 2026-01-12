import { AfterViewInit, ChangeDetectorRef, Component, inject, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Action, FxBaseComponent, FxMode, FxSetting, FxStringSetting, FxValidation, FxValidatorService } from '@instantsys-labs/fx';
import { SettingsPanelComponent } from '../../panel/settings-panel/settings-panel.component';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import {forkJoin, map, Observable, Subject, takeUntil } from 'rxjs';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';

export interface TableColumnConfig {
  header: string;
  cellType: 'text' | 'input-text' | 'input-number' | 'dropdown' | 'smart-dropdown' | 'checkbox' | 'radio' | 'radio-group' | 'file-upload' | 'textarea' | 'action';
  placeholder?: string;
  options?: string[];
  apiUrl?: string;
  valueKey?: string;
  labelKey?: string;
  className?: string;
  isMultiselect?: boolean;
  checkedValue?: any;
  unCheckedValue?: any;
  checkBoxLabel?: string;
  isRequired?:boolean,
  errorMessage?:string,
  // actionName?: string,
  // actionIconPath?: string,
  // apiType?:string,
  // apiUrlToCall?: string,
  // payloadOptions?: string[]
  action: string[]
}
export interface TableConfig {
  columns: TableColumnConfig[];
  rows: any[];
  // apiDataToDrawTable: any[]
}
@Component({
  selector: 'fx-dynamic-table',
  standalone: true,
  imports: [CommonModule, FormsModule, SettingsPanelComponent, ReactiveFormsModule,MultiSelectModule,InputNumberModule,InputTextModule,DropdownModule,ToastModule,ConfirmDialogModule,DialogModule],
  providers: [MessageService,ConfirmationService],
  templateUrl: './dynamic-table.component.html',
  styleUrl: './dynamic-table.component.scss',
})

export class DynamicTableComponent extends FxBaseComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() tableRows: Array<any> = [];
  @Input() previewType: FxMode = FxMode.VIEW;
  @Input() tableConfig: any = {
    columns: [
      { header: 'Column 1', cellType: 'text' },
      { header: 'Column 2', cellType: 'text' },
      { header: 'Column 3', cellType: 'text' },
      { header: 'Column 4', cellType: 'text' },
      { header: 'Column 5', cellType: 'text' },
    ],
};

  private destroy$ = new Subject<Boolean>();
  // public uploadedImages: Array<Record<string, string | File | null> | null> = [];
  public uploadedImages: Array<Array<{ result: string, file: File | null}>> = [];

public generalValues: any;
selectedAction: any;
selectedRow: any;
selectedRowIndex: any;
displayConfirmationDialog: boolean = false;
apiDataToDrawTable: any[] =[];

  public tableFormControl = new FormControl();
  public smartDropdownOptions: { [key: string]: Array<{ name: string, value: string }> } = {};
  private http = inject(HttpClient);
  constructor(private cdr: ChangeDetectorRef, private fxBuilderWrapperService: FxBuilderWrapperService,   private messageService: MessageService, private confirmationService: ConfirmationService) {
    super(cdr);
    this.onInit.subscribe((fxData)=>{
      this._register(this.tableFormControl);
    })
  }

  public ngOnInit(): void {
    this.fxBuilderWrapperService.variables$.pipe(
      takeUntil(this.destroy$)).subscribe((variables: any) => {
        if (variables) {
          let dynamicTableValues: any;
          for (const [key, value] of Object.entries(variables)) {
            if (key.includes('dynamic-table')) {
              dynamicTableValues = value;
            }
          }
          if (Object.keys(dynamicTableValues).length) {
            // const fileHeaderName = dynamicTableValues?.columns.find((f: any) => f.cellType === 'file-upload')?.header;
            const fileHeaderName = dynamicTableValues?.columns.find((f: any) => f.cellType === 'file-upload')?.header;
            dynamicTableValues?.rows?.forEach((item: any, index: number) => {
              // // this.uploadedImages[index] = item[fileHeaderName] ? item[fileHeaderName]: null;
              // const fileUrl = item[fileHeaderName]; // Get the file URL

              // this.uploadedImages[index] = fileUrl
              //   ? { result: fileUrl, file: null } // Store the URL as 'result'
              //   : null;
              
              if (item[fileHeaderName]) {
                this.parseUrls(item[fileHeaderName], index,dynamicTableValues?.columns);
              }
            })
           this.tableConfig =  this.initializeCheckboxDefaults(dynamicTableValues);
            // this.tableConfig = dynamicTableValues;
            this.fxData.value = this.tableConfig;
            // this.tableFormControl.reset();
            // this.tableFormControl.setValue(this.tableConfig);
            this.tableFormControl = new FormControl();
            setTimeout(() => {  // Delay to ensure proper patching
              this.tableFormControl.patchValue(this.tableConfig, { emitEvent: true });
              console.log("tableFormControl",this.tableFormControl);
              this.cdr.detectChanges();
            }, 50);
          }
        }
      })
  }

  public ngAfterViewInit(): void {
    setTimeout(() => {
      if(this.fxData?.value && Object.keys(this.fxData?.value)?.length != 0) {
        this.tableConfig = this.fxData.value;
        this.fetchSmartDropdownData();
      }
    }, 100)
  }
  
  protected fetchSmartDropdownData(): void {
    this.tableConfig.columns
      .filter((column: TableColumnConfig) => column.cellType === 'smart-dropdown' && column?.apiUrl)
      .forEach((column: TableColumnConfig) => {
        this.http.get<any>(column.apiUrl!).subscribe((response: any) => {
          this.smartDropdownOptions[column.header] = response.map((item: any) => ({
            value: item[column.valueKey!],
            name: item[column.labelKey!],
          }));
        });
      });
  }

  // public uploadImage(event: Event, rowIndex: number): void {
  //   const file = (event.target as HTMLInputElement).files?.[0];
  //   if (file) {
  //     const reader = new FileReader();
  //     reader.onload = () => {
  //       this.uploadedImages[rowIndex] = {
  //         result: reader.result as string,
  //         file: file
  //       }
  //       this.tableConfig.rows[rowIndex][this.tableConfig.columns.find((f: any) => f.cellType === 'file-upload')?.header] = file;
  //       console.log("tableConfig", this.tableConfig);
  //     };
  //     reader.readAsDataURL(file);
  //   }
  // }

  public uploadImage(event: Event, rowIndex: number): void {
    const files = (event.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      this.uploadedImages[rowIndex] = this.uploadedImages[rowIndex] || [];
  
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
          this.uploadedImages[rowIndex].push({
            result: reader.result as string,
            file: file
          });
  
          // Optionally add to tableConfig if only one file is tracked there
          const columnHeader = this.tableConfig.columns.find((f: any) => f.cellType === 'file-upload')?.header;
          this.tableConfig.rows[rowIndex][columnHeader] = this.uploadedImages[rowIndex].map(img => img.file);
  
          console.log("tableConfig", this.tableConfig);
        };
        reader.readAsDataURL(file);
      });
    }
  }
  

  protected settings(): FxSetting[] {
    return [
      new FxStringSetting({ key: 'column-size', $title: 'No. of columns', value: 1 }),
      new FxStringSetting({ key: 'table-config', $title: 'Table Configuration', value: {} }),
    ];
  }

  protected validations(): FxValidation[] {
    return [FxValidatorService.required];
  }

  public getArray(count: number): number[] {
    return Array.from({ length: count });
  }

  public onChangeConfiguration(event: any): void { 
     this.generalValues = {
      enableAPI: event?.enableAPI,
      api: event?.api
    }
    const columns = event.columns.map((col: any) => {
      return {
        header: col?.header,
        cellType: col?.cellType,
        placeholder: col?.placeholder,
        options: col?.options,
        apiUrl: col?.apiUrl,
        valueKey: col?.valueKey,
        labelKey: col?.labelKey,
        className: col?.className,
        apiKey: col?.apiKey,
        isMultiselect: col?.isMultiselect,
        checkedValue: col?.checkedValue,
        unCheckedValue: col?.unCheckedValue,
        checkBoxLabel:col?.checkBoxLabel,
        isRequired:col?.isRequired,
        errorMessage:col?.errorMessage,
        // actionName: col?.actionName,
        // actionIconPath: col?.actionIconPath,
        // apiType:col?.apiType,
        // apiUrlToCall: col?.apiUrlToCall,
        // payloadOptions: col?.payloadOptions
        action: col?.action 
      }
    });
    if(!event?.enableAPI) {
      this.tableConfig.columns = columns;
      // this.tableConfig.rows = Array.from({ length: +event?.rows }, (e, index) => ({ name: `SKU-${index + 1}`, age: index % 2 !== 0, gender: 'male' }))
      // this.tableConfig.rows = Array.from({ length: +event?.rows }, (e, index) => {
      //   const rows = columns.map((c: any) => {
      //     return {
      //       c?.header: null
      //     }
      //   })
      //   return rows
      // })
      this.tableConfig.rows = Array.from({ length: +event?.rows }, (_, index) => {
        return columns.reduce((acc: any, c: any) => {
          acc[c?.header] = ''; // Initialize each column key with null
          return acc;
        }, {});
      });
      
      this.fetchSmartDropdownData();
    }
    if(event?.enableAPI) {
      this.drawTable(event, columns)
      this.tableConfig = {
        columns: columns,
        rows: []
      };
    }
   this.tableConfig =  this.initializeCheckboxDefaults(this.tableConfig);
   this.tableConfig.apiDataToDrawTable = this.apiDataToDrawTable;
    this.tableConfig.generalValues = this.generalValues;
    this.fxData.value = this.tableConfig;
    this.tableFormControl.reset();
    this.tableFormControl.setValue(this.tableConfig);
  }

  private updateSettings(): void{
    if(this.fxData.settings){
      for(let setting of this.fxData.settings){
      if(setting.key === 'table-config'){
        setting.value = this.tableConfig;
        }
      }
    }
  }

  // public drawTable(event: any, columns: any): void {
  //   let rows;
  //   this.http.get(event.api).subscribe((res: any) => {
  //     if(res) {
  //       rows = res.map((item: any) => {
  //         const newObj: Record<string, any> = {};
  //         columns.forEach((col: any) => {
  //           newObj[col.header] = item[col.apiKey];
  //         });
  //         return newObj;
  //       });
  //       this.tableConfig = {
  //         columns,
  //         rows
  //       }
  //       this.tableConfig.generalValues = this.generalValues;
  //       this.fxData.value = this.tableConfig;
  //       this.tableFormControl.reset();
  //       this.tableFormControl.setValue(this.tableConfig);
  //     }
  //   })
  // }

    public drawTable(event: any, columns: any): void {
    let rows;
    this.http.get(event.api).subscribe((res: any) => {
      if(res) {
        this.apiDataToDrawTable = res;
       
        rows = res.map((item: any) => {
          const newObj: Record<string, any> = {};
          columns.forEach((col: any) => {
            newObj[col.header] = item[col.apiKey] || '';
          });
          return newObj;
        });
        this.tableConfig = {
          columns,
          rows
        }
        this.tableConfig.generalValues = this.generalValues;
        this.tableConfig.apiDataToDrawTable = this.apiDataToDrawTable;
        this.fxData.value = this.tableConfig;
        this.tableFormControl.reset();
        this.tableFormControl.setValue(this.tableConfig);
      }
    })
  }

  // public deleteFile(file: any, index: number): void {
  //   this.uploadedImages.splice(index, 1, null);
  //   this.tableConfig.rows[index][this.tableConfig.columns.find((f: any) => f.cellType === 'file-upload')?.header] = null;
  //   console.log("tableConfig", this.tableConfig);
  //   this.tableFormControl.setValue(this.tableConfig);
  // }

  // public deleteFile(rowIndex: number, imageIndex: number): void {
  //   if (this.uploadedImages[rowIndex]) {
  //     this.uploadedImages[rowIndex].splice(imageIndex, 1);
  
  //     const columnHeader = this.tableConfig.columns.find((f: any) => f.cellType === 'file-upload')?.header;
  //     this.tableConfig.rows[rowIndex][columnHeader] = this.uploadedImages[rowIndex].map(img => img.file);
  //     this.tableFormControl.setValue(this.tableConfig);
  //   }
  // }

  public deleteFile(rowIndex: number, imageIndex: number): void {
    if (this.uploadedImages[rowIndex]) {
      const removedFile = this.uploadedImages[rowIndex][imageIndex];
  
      // Track the file to delete if it's an uploaded file (i.e., has URL and no File object)
      if (removedFile?.result && typeof removedFile.result === 'string' && removedFile.file === null) {
        this.tableConfig.rows[rowIndex].filesToDelete = this.tableConfig.rows[rowIndex].filesToDelete || [];
        this.tableConfig.rows[rowIndex].filesToDelete.push(removedFile.result);
      }
  
      // Remove the file from the UI
      this.uploadedImages[rowIndex].splice(imageIndex, 1);
  
      const columnHeader = this.tableConfig.columns.find((f: any) => f.cellType === 'file-upload')?.header;
      this.tableConfig.rows[rowIndex][columnHeader] = this.uploadedImages[rowIndex].map(img => img.file);
  
      this.tableFormControl.setValue(this.tableConfig);
    }
  }
  
  

  // public parseUrls(url: string, index: number): void {
  //   this.http.get(url, { responseType: 'blob' }).subscribe({
  //     next: (imageBlob: Blob) => {
  //       const imageURL = URL.createObjectURL(imageBlob);
  //       this.uploadedImages[index] = {
  //         result: imageURL,
  //         file: null
  //       };
  //     },
  //     error: (error) => {
  //       console.error('Error fetching image:', error);
  //     }
  //   });
  // }

  // public parseUrls(url: string, rowIndex: number): void {
  //   this.http.get(url, { responseType: 'blob' }).subscribe({
  //     next: (imageBlob: Blob) => {
  //       const imageURL = URL.createObjectURL(imageBlob);
  
  //       this.uploadedImages[rowIndex] = this.uploadedImages[rowIndex] || [];
  //       this.uploadedImages[rowIndex].push({
  //         result: imageURL,
  //         file: null
  //       });
  
  //       const columnHeader = this.tableConfig.columns.find((f: any) => f.cellType === 'file-upload')?.header;
  //       this.tableConfig.rows[rowIndex][columnHeader] = this.uploadedImages[rowIndex].map(img => img.file);
  
  //       this.tableFormControl.setValue(this.tableConfig);
  //     },
  //     error: (error) => {
  //       console.error('Error fetching image:', error);
  //     }
  //   });
  // }

  public parseUrls(urls: string[], rowIndex: number, columns: any): void {
    if (!Array.isArray(urls) || !urls.length) return;
  
    this.uploadedImages[rowIndex] = this.uploadedImages[rowIndex] || [];
  
    const columnHeader = columns.find((f: any) => f.cellType === 'file-upload')?.header;
    if (!columnHeader) return;
  
    const imageFetches: Observable<string>[] = [];
  
    urls.forEach((url: string) => {
      if (url) {
        const image$ = this.http.get(url, { responseType: 'blob' }).pipe(
          map((imageBlob: Blob) => URL.createObjectURL(imageBlob))
        );
        imageFetches.push(image$);
      }
    });
  
    if (!imageFetches.length) return;
  
    forkJoin(imageFetches).subscribe({
      next: (imageURLs: string[]) => {
        imageURLs.forEach((imageURL: string) => {
          this.uploadedImages[rowIndex].push({
            result: imageURL,
            file: null
          });
        });
  
        // this.tableConfig.rows[rowIndex][columnHeader] = this.uploadedImages[rowIndex].map(img => img.result);
  
        // this.tableFormControl.setValue(this.tableConfig);
      },
      error: (error) => {
        console.error('Error fetching one or more images:', error);
      }
    });
  }
  
  onCheckboxChange(event: Event, row: any, column: any): void {
    const input = event.target as HTMLInputElement;
    row[column.header] = input.checked ? column.checkedValue : column.unCheckedValue;
  }
  

  initializeCheckboxDefaults(tableData: any): void {
    tableData.rows.forEach((row: any) => {
      tableData.columns.forEach((column: any) => {
        if (column.cellType === 'checkbox' && column.unCheckedValue && !row[column.header]) {
          row[column.header] = column.unCheckedValue;
        }
      });
    });
    return tableData;
  }

  handleAction(row: any, action: any,rowIndex:any): void {
    if (action.isConfirmationRequired) {
      this.selectedAction = action;
      this.selectedRow = row;
      this.selectedRowIndex = rowIndex
      this.displayConfirmationDialog = true;
    } else {
      this.executeAction(row, action,rowIndex);
    }
  }
  
  confirmAction(): void {
    this.executeAction(this.selectedRow, this.selectedAction,this.selectedRowIndex);
    this.displayConfirmationDialog = false;
  }
  
  cancelAction(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Cancelled',
      detail: 'Action was cancelled',
      life: 2000
    });
    this.displayConfirmationDialog = false;
  }
  
  // handleAction(row: any, action: any): void {
  //   if (!action || !action.apiType || !action.payloadOptions) {
  //     console.warn('Invalid action config:', action);
  //     return;
  //   }
  
  //   const payload: { [key: string]: any } = {};
  
  //   action.payloadOptions.forEach((option: any) => {
  //     const key = option.payloadOptionName;
  //     const value = option.payloadOptionValue ?? row[option.payloadOptionName];
  //     if (key) {
  //       payload[key] = value;
  //     }
  //   });
  
  //   const handleSuccess = (res: any) => {
  //     const actionKey = action.actionName || 'defaultAction';

  //     if (!row.response || typeof row.response !== 'object' || Array.isArray(row.response)) {
  //       row.response = {};
  //     }
    
  //     row.response[actionKey] = res;
    
  //     this.messageService.add({
  //       severity: 'success',
  //       summary: 'Success',
  //       detail: `Action "${actionKey}" completed successfully`,
  //       life: 3000
  //     });
  //   };
    

  //   const handleError = (err: any) => {
  //     row.response = { error: err };
  //     this.messageService.add({
  //       severity: 'error',
  //       summary: 'Error',
  //       detail: 'Something went wrong',
  //       life: 3000
  //     });
  //   };
  
  //   switch (action.apiType) {
  //     case 'POST':
  //       this.http.post(action.apiUrlToCall, payload).subscribe({ next: handleSuccess, error: handleError });
  //       break;
  
  //     case 'PUT':
  //       this.http.put(action.apiUrlToCall, payload).subscribe({ next: handleSuccess, error: handleError });
  //       break;
  
  //     case 'DELETE':
  //       this.http.delete(action.apiUrlToCall, { body: payload }).subscribe({ next: handleSuccess, error: handleError });
  //       break;
  
  //     case 'GET':
  //       this.http.get(action.apiUrlToCall, { params: payload }).subscribe({ next: handleSuccess, error: handleError });
  //       break;
  
  //     default:
  //       console.warn('Unknown API type:', action.apiType);
  //   }
  // }
  
  // handleAction(row: any, action: any): void {
  //   if (action.isConfirmationRequired) {
  //     this.confirmationService.confirm({
  //       message: `Are you sure you want to perform "${action.actionName}"?`,
  //       header: 'Confirmation',
  //       icon: 'pi pi-exclamation-triangle',
  //       accept: () => this.executeAction(row, action),
  //       reject: () => {
  //         this.messageService.add({
  //           severity: 'info',
  //           summary: 'Cancelled',
  //           detail: 'Action was cancelled',
  //           life: 2000
  //         });
  //       }
  //     });
  //   } else {
  //     this.executeAction(row, action);
  //   }
  // }
  

  executeAction(row: any, action: any,rowIndex:any): void {
    const payload: { [key: string]: any } = {};
  
    action.payloadOptions.forEach((option: any) => {
      const key = option.payloadOptionName;
      const value = option.payloadOptionValue || this.tableConfig?.apiDataToDrawTable[rowIndex][key];
      if (key) {
        payload[key] = value;
      }
    });
  
    const actionKey = action.actionName || 'defaultAction';
  
    const handleSuccess = (res: any) => {
      if (!row.response || typeof row.response !== 'object' || Array.isArray(row.response)) {
        row.response = {};
      }
  
      row.response[actionKey] = res;
  
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Action "${actionKey}" completed successfully`,
        life: 3000
      });
    };
  
    const handleError = (err: any) => {
      if (!row.response || typeof row.response !== 'object' || Array.isArray(row.response)) {
        row.response = {};
      }
  
      row.response[actionKey] = { error: err };
  
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Action "${actionKey}" failed`,
        life: 3000
      });
    };
  
    switch (action.apiType) {
      case 'POST':
        this.http.post(action.apiUrlToCall, payload).subscribe({ next: handleSuccess, error: handleError });
        break;
      case 'PUT':
        this.http.put(action.apiUrlToCall, payload).subscribe({ next: handleSuccess, error: handleError });
        break;
      case 'DELETE':
        this.http.delete(action.apiUrlToCall, { body: payload }).subscribe({ next: handleSuccess, error: handleError });
        break;
      case 'GET':
        this.http.get(action.apiUrlToCall, { params: payload }).subscribe({ next: handleSuccess, error: handleError });
        break;
      default:
        console.warn('Unknown API type:', action.apiType);
    }
  }
  
  
  

  public ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
