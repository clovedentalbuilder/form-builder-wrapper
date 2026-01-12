import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FxBaseComponent, FxSetting, FxStringSetting, FxSelectSetting, FxValidation, FxValidatorService, FxComponent } from '@instantsys-labs/fx';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { Subject, takeUntil, Observable, map, forkJoin } from 'rxjs';
import { v4 as uuidv4} from 'uuid';

interface UploadedFile {
  id: string;
  file: any;
  result: string;
  originalUrl: string;
}
interface UploaderData {
  uploadedFiles: UploadedFile[];
  checkboxEnabled: boolean;
}

@Component({
  selector: 'uploader-checkbox',
  standalone: true,
  imports: [CommonModule, FxComponent, FormsModule, ReactiveFormsModule],
  templateUrl: './uploader-checkbox.component.html',
  styleUrl: './uploader-checkbox.component.css'
})
export class UploaderCheckboxComponent extends FxBaseComponent implements OnInit , AfterViewInit{
   // public uploadFileControl = new UntypedFormControl();
   @ViewChild('fxComponent') fxComponent!: FxComponent;
   public uploadFileControl = new FormControl();
   public uploadedFiles: Array<any> = [];
   public formattedData: any = {
     uploadedFiles: [],
     deletedFiles: [],
    //  checkboxEnabled: false
   };
   uploadedFilesMap: { [key: string]: { uploadedFiles: any[], checkboxEnabled: boolean } } = {};
   private destroy$ = new Subject<Boolean>();
   private http = inject(HttpClient);
   public checkboxEnabled: boolean = false;
   constructor(private cdr: ChangeDetectorRef,private fxBuilderWrapperService: FxBuilderWrapperService) {
     super(cdr)
     this.onInit.subscribe((fxData)=>{
       this._register(this.uploadFileControl);
       console.log("contextid",this.getContextBaseId());
     })
   }
  // ngAfterViewInit(): void {
  //  console.log("fxcomp",this.fxComponent);
  //  this.getContextBaseId();
  // }
 
 
 
 
 
   uploadedImages: { [key: string]: { result: string, file: File | null }[] } = {};
   deletedFiles: any[] = [];
  
 
  //  ngOnInit(): void {
  //    this.fxBuilderWrapperService.variables$
  //      .pipe(takeUntil(this.destroy$))
  //      .subscribe((variables: any) => {
  //        if (!variables) return;
   
  //        const uploadedFilesMap: { [key: string]: string[] } = {};
   
  //        // Extract uploader keys and their corresponding URL arrays
  //        for (const [key, value] of Object.entries(variables)) {
  //          if (key.includes('uploader-checkbox') && Array.isArray(value)) {
  //            uploadedFilesMap[key] = value;
  //          }
  //        }
   
  //        for (const [uploaderKey, urls] of Object.entries(uploadedFilesMap)) {
  //          const imageFetches: Observable<{ result: string; originalUrl: any }>[] = [];
   
  //          urls.forEach((originalUrl:any) => {
  //            if (originalUrl) {
  //              const image$ = this.http.get(originalUrl?.originalUrl, { responseType: 'blob' }).pipe(
  //                map((blob: Blob) => ({
  //                  result: URL.createObjectURL(blob), // for preview
  //                  originalUrl: originalUrl?.originalUrl          // preserve original
  //                }))
  //              );
  //              imageFetches.push(image$);
  //            }
  //          });
   
  //          if (imageFetches.length > 0) {
  //            forkJoin(imageFetches).subscribe({
  //              next: (imageData) => {
  //                const formatted = imageData.map(item => ({
  //                  id: uuidv4(),
  //                  file: null,
  //                  originalUrl: item.originalUrl,
  //                  result: item.result
  //                }));
   
  //                this.uploadedFiles = [...this.uploadedFiles, ...formatted];
  //                this.formattedData.uploadedFiles = this.uploadedFiles;
  //                this.uploadFileControl.setValue(this.formattedData);
  //              },
  //              error: (err) => {
  //                console.error(`Failed to fetch images for ${uploaderKey}:`, err);
  //              }
  //            });
  //          }
  //        }
  //      });
  //  }
   

   
 
   // public onFileSelected(event: Event) {
   //   const input = event.target as HTMLInputElement;
   //   if (input.files) {
   //     for(let i = 0; i < input?.files?.length; i++) {
   //       const file = input.files[i];
   //       const reader = new FileReader();
   //       reader.onload = e => {
   //         this.uploadedFiles.push({
   //           file: file,
   //           result: e.target?.result,
   //           name: file?.name,
   //           id: uuidv4()
   //         })
   //         this.uploadFileControl.setValue(this.uploadedFiles);
   //         console.log(this.uploadFileControl);
   //       }
   //       reader.readAsDataURL(file);
   //     }
   //   }
   // }

  //  ngOnInit(): void {
  //   // Extract uploader keys and their corresponding URL arrays and store them in uploadedFilesMap
  //   this.fxBuilderWrapperService.variables$
  //     .pipe(takeUntil(this.destroy$))
  //     .subscribe((variables: any) => {
  //       if (!variables) return;
  
  //       const uploadedFilesMap: { [key: string]: string[] } = {};
  
  //       // Extract uploader keys and their corresponding URL arrays
  //       for (const [key, value] of Object.entries(variables)) {
  //         if (key.includes('uploader-checkbox') && Array.isArray(value)) {
  //           uploadedFilesMap[key] = value;
  //         }
  //       }
  
  //       this.uploadedFilesMap = uploadedFilesMap; // Store the map for later use
  //     });
  // }

  // ngAfterViewInit(): void {
  //   console.log("fxcomp", this.fxComponent);

  //   const key = this.fxComponent?.fxData?.name;

  //   if (key && this.uploadedFilesMap?.[key]) {
  //     const urls = this.uploadedFilesMap[key];
  //     const imageFetches: Observable<{ result: string; originalUrl: any }>[] = [];

  //     urls.forEach((originalUrl: any) => {
  //       if (originalUrl) {
  //         const image$ = this.http.get(originalUrl?.originalUrl, { responseType: 'blob' }).pipe(
  //           map((blob: Blob) => ({
  //             result: URL.createObjectURL(blob),
  //             originalUrl: originalUrl?.originalUrl
  //           }))
  //         );
  //         imageFetches.push(image$);
  //       }
  //     });

  //     if (imageFetches.length > 0) {
  //       forkJoin(imageFetches).subscribe({
  //         next: (imageData) => {
  //           const formatted = imageData.map(item => ({
  //             id: uuidv4(),
  //             file: null,
  //             originalUrl: item.originalUrl,
  //             result: item.result
  //           }));

  //           this.uploadedFiles = [...this.uploadedFiles, ...formatted];
  //           this.formattedData.uploadedFiles = this.uploadedFiles;
  //           this.uploadFileControl.setValue(this.formattedData);
  //         },
  //         error: (err) => {
  //           console.error(`Failed to fetch images for ${key}:`, err);
  //         }
  //       });
  //     }
  //   } else {
  //     console.error('No files found for the provided key:', key);
  //   }

  //   this.getContextBaseId();
  // }

  ngOnInit(): void {
    // Extract uploader keys and their corresponding file objects and store them in uploadedFilesMap
    this.fxBuilderWrapperService.variables$
      .pipe(takeUntil(this.destroy$))
      .subscribe((variables: any) => {
        if (!variables) return;
  
        // Initialize the map to store the structure of uploaded files and other data
        const uploadedFilesMap: { [key: string]: { uploadedFiles: any[], checkboxEnabled: boolean } } = {};
  
        // Iterate over the variables to extract uploader keys and their corresponding uploaded files data
        // for (const [key, value] of Object.entries(variables)) {
        //   // Check if the key starts with 'uploader-checkbox' and if value is an object containing 'uploadedFiles'
        //   if (key.startsWith('uploader-checkbox') && (value as UploaderData).uploadedFiles) {
        //     uploadedFilesMap[key] = {
        //       uploadedFiles: (value as UploaderData).uploadedFiles,
        //       checkboxEnabled: (value as UploaderData).checkboxEnabled || false
        //     };
        //   }
        // }

        for (const [key, value] of Object.entries(variables) as [string, any][]) {
          if (this.hasUploadedFiles(value)) {
            const otherKey = this.getOtherKey(value);
            const checkboxEnabled = value[otherKey];
        
            uploadedFilesMap[key] = {
              uploadedFiles: value.uploadedFiles,
              checkboxEnabled: checkboxEnabled,
            };
          }
        }
        
  
  
        this.uploadedFilesMap = uploadedFilesMap;
      });
  }

  private hasUploadedFiles(value: any): boolean {
    return value && value.hasOwnProperty('uploadedFiles');
  }
  
  private getOtherKey(value: any): string {
    const keysToIgnore = ['uploadedFiles', 'deletedFiles'];
    const keys = Object.keys(value);
  
    const filteredKeys = keys.filter(key => !keysToIgnore.includes(key));
  
    return filteredKeys.length > 0 ? filteredKeys[0] : '';
  }
  
 
  private getCheckboxEnabled(value: any): boolean {
    return value.hasOwnProperty('checkboxEnabled') ? value.checkboxEnabled : false;
  }
  
  ngAfterViewInit(): void {
    console.log("fxcomp", this.fxComponent);
  
    const key = this.fxComponent?.fxData?.name;
  
    if (key && this.uploadedFilesMap?.[key]) {
      const uploadedFiles = this.uploadedFilesMap[key]?.uploadedFiles; 
      this.checkboxEnabled = this.uploadedFilesMap[key]?.checkboxEnabled; // Get the uploadedFiles array
      const imageFetches: Observable<{ result: string; originalUrl: any }>[] = [];
  
      // Iterate over the uploaded files and fetch the images
      uploadedFiles.forEach((file: any) => {
        const originalUrl = file?.originalUrl;
        if (originalUrl) {
          const image$ = this.http.get(originalUrl, { responseType: 'blob' }).pipe(
            map((blob: Blob) => ({
              result: URL.createObjectURL(blob),  // Blob URL for preview
              originalUrl: file?.originalUrl     // Preserve the original URL
            }))
          );
          imageFetches.push(image$);
        }
      });
  
      // Fetch all images concurrently using forkJoin
      if (imageFetches.length > 0) {
        forkJoin(imageFetches).subscribe({
          next: (imageData) => {
            const formatted = imageData.map(item => ({
              id: uuidv4(),
              file: null,
              originalUrl: item.originalUrl,
              result: item.result
            }));
  
            this.uploadedFiles = [...this.uploadedFiles, ...formatted];
            this.formattedData.uploadedFiles = this.uploadedFiles;
            this.formattedData[this.setting('checkbox-label') || 'checkboxEnabled'] = this.checkboxEnabled;
            this.uploadFileControl.setValue(this.formattedData);
          },
          error: (err) => {
            console.error(`Failed to fetch images for ${key}:`, err);
          }
        });
      }
    } else {
      console.error('No files found for the provided key:', key);
    }
  
    this.getContextBaseId();
  }
  
 
   onFileSelected(event: Event) {
     const input = event.target as HTMLInputElement;
     if (input.files) {
       for (let i = 0; i < input.files.length; i++) {
         const file = input.files[i];
         const reader = new FileReader();
 
         reader.onload = e => {
           const newFile = {
             id: uuidv4(),
             file: file,
             originalUrl: null,
             result: e.target?.result,
             name: file.name
           };
 
           this.uploadedFiles.push(newFile);
           this.formattedData.uploadedFiles = this.uploadedFiles;
           this.formattedData[this.setting('checkbox-label') || 'checkboxEnabled'] = this.checkboxEnabled;
           this.uploadFileControl.setValue(this.formattedData);
         };
 
         reader.readAsDataURL(file);
       }
     }
   }
 
 
   // public deleteFile(id: string): void {
   //   this.uploadedFiles = this.uploadedFiles.filter(file => file?.id !== id);
   // }
 
   // deleteFile(index: number): void {
   //   const [deletedFile] = this.uploadedFiles.splice(index, 1);
   
   //   if (deletedFile) {
   //     this.deletedFiles.push(deletedFile);
   //     this.formattedData = {
   //       ...this.formattedData,
   //       uploadedFiles: [...this.uploadedFiles],
   //       deletedFiles: [...this.deletedFiles]
   //     };
   //     this.uploadFileControl.setValue(this.formattedData);
   //   }
   // }
 
   deleteFile(index: number): void {
     const deletedFile = this.uploadedFiles?.[index];
     if (!deletedFile) return;
   
     // Ensure formattedData exists and initialize if undefined
     this.formattedData = this.formattedData || { uploadedFiles: [], deletedFiles: [] };
   
     // Add the deleted file to the deletedFiles array
     this.deletedFiles = [...this.deletedFiles, deletedFile];
   
     // Remove the file from uploadedFiles using filter for immutability
     this.uploadedFiles = this.uploadedFiles.filter((_, i) => i !== index);
   
     // Update formattedData
     this.formattedData = {
       ...this.formattedData,
       uploadedFiles: this.uploadedFiles,
       deletedFiles: this.deletedFiles,
       [this.setting('checkbox-label') || 'checkboxEnabled']:this.checkboxEnabled
     };
   
     // Set the value of the uploadFileControl
     this.uploadFileControl.setValue(this.formattedData);
   }
   
   onCheckboxChange(){
    this.formattedData = {
      ...this.formattedData,
      uploadedFiles: this.uploadedFiles,
      deletedFiles: this.deletedFiles,
      [this.setting('checkbox-label') || 'checkboxEnabled']:this.checkboxEnabled
    };
    this.uploadFileControl.setValue(this.formattedData);
   }
   
 
   protected settings(): FxSetting[] {
     return [
       new FxStringSetting({ key: 'upload-text', $title: 'Upload Text', value: 'Upload File'}),
       new FxStringSetting({ key: 'checkbox-label', $title: 'Checkbox Label', value: ''}),
       new FxSelectSetting({key: 'multiple-upload', $title: 'Multiple Upload', value: false}, [{option: 'Enable', value: true}, {option: 'Disable', value: false}])
     ];
   }
 
   protected validations(): FxValidation[] {
     return [FxValidatorService.required];
   }

}
