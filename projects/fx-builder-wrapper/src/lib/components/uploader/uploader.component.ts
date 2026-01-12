import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, UntypedFormControl, Validators } from '@angular/forms';
import { FxBaseComponent, FxComponent, FxSelectSetting, FxSetting, FxStringSetting, FxValidation, FxValidatorService } from '@instantsys-labs/fx';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { forkJoin, map, Observable, Subject, takeUntil } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { FileUploadModule, UploadEvent } from 'primeng/fileupload';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ThreeViewerComponent } from '../three-viewer/three-viewer.component';
import { ApiServiceRegistry } from '@instantsys-labs/core'

@Component({
  selector: 'fx-uploader',
  standalone: true,
  imports: [CommonModule, FxComponent, FormsModule, ReactiveFormsModule, FileUploadModule, ToastModule, ConfirmDialogModule, DialogModule, ThreeViewerComponent],
  providers: [MessageService, ConfirmationService],
  templateUrl: './uploader.component.html',
  styleUrl: './uploader.component.css'
})
export class UploaderComponent extends FxBaseComponent implements OnInit, AfterViewInit{
  // public uploadFileControl = new UntypedFormControl();
  public uploadFileControl = new FormControl();
  public uploadedFiles: Array<any> = [];
  public formattedData: any = {
    uploadedFiles: [],
    deletedFiles: []
  };
  categories = [
    { label: 'Oral Images', value: 16 },
    { label: 'Past Docs', value: 17 },
    { label: 'X-Rays', value: 14 },
    { label: 'Profile', value: 18 },
  ];

  visible: boolean = false;
  fileVisible: boolean = false;
  selecteImageUrl: string = '';
  fileUrl: SafeResourceUrl | null = null;
  fileType: string | null = null;
  fileName: string | null = null;
  private destroy$ = new Subject<Boolean>();
  private http = inject(HttpClient);
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  constructor(private cdr: ChangeDetectorRef, private fxBuilderWrapperService: FxBuilderWrapperService, private messageService: MessageService, private confirmationService: ConfirmationService, private sanitizer: DomSanitizer,
    private fxApiService: ApiServiceRegistry
  ) {
    super(cdr)
    this.onInit.subscribe((fxData) => {
      this._register(this.uploadFileControl);
    })
  }

  stlFileVisible: boolean = false;
  stlFileUpload: any = null;

  uploadedImages: { [key: string]: { result: string, file: File | null }[] } = {};
  deletedFiles: any[] = [];
  uploadedFilesMap: { [key: string]: any[] } = {};
  @ViewChild('fxComponent') fxComponent!: FxComponent;
  // public ngOnInit(): void {
  //   this.fxBuilderWrapperService.variables$
  //     .pipe(takeUntil(this.destroy$))
  //     .subscribe((variables: any) => {
  //       if (!variables) return;

  //       const uploadedFiles: { [key: string]: string[] } = {};

  //       for (const [key, value] of Object.entries(variables)) {
  //         if (key.includes('uploader') && Array.isArray(value)) {
  //           uploadedFiles[key] = value;
  //         }
  //       }

  //       for (const [uploaderKey, urls] of Object.entries(uploadedFiles)) {
  //         const imageFetches: Observable<string>[] = [];

  //         urls.forEach((url: string) => {
  //           if (url) {
  //             const image$ = this.http.get(url, { responseType: 'blob' }).pipe(
  //               map((blob: Blob) => URL.createObjectURL(blob))
  //             );
  //             imageFetches.push(image$);
  //           }
  //         });

  //         if (imageFetches.length) {
  //           forkJoin(imageFetches).subscribe({
  //             next: (imageUrls: string[]) => {
  //               this.uploadedImages[uploaderKey] = imageUrls.map(result => ({
  //                 result,
  //                 file: null
  //               }));
  //               // this.uploadedFiles = [...this.uploadedImages]
  //               this.uploadedFiles = Object.values(this.uploadedImages).flat();
  //             },
  //             error: (err) => {
  //               console.error(`Failed to fetch images for ${uploaderKey}:`, err);
  //             }
  //           });
  //         }
  //       }
  //     });
  // }

  // ngOnInit(): void {
  //   this.fxBuilderWrapperService.variables$
  //     .pipe(takeUntil(this.destroy$))
  //     .subscribe((variables: any) => {
  //       if (!variables) return;

  //       const uploadedFiles: { [key: string]: string[] } = {};

  //       for (const [key, value] of Object.entries(variables)) {
  //         if (key.includes('uploader') && Array.isArray(value)) {
  //           uploadedFiles[key] = value;
  //         }
  //       }

  //       for (const [uploaderKey, urls] of Object.entries(uploadedFiles)) {
  //         const imageFetches: Observable<{ result: string, originalUrl: string }>[] = [];

  //         urls.forEach((url: string) => {
  //           if (url) {
  //             const image$ = this.http.get(url, { responseType: 'blob' }).pipe(
  //               map((blob: Blob) => ({
  //                 result: URL.createObjectURL(blob), // just for preview
  //                 originalUrl: url
  //               }))
  //             );
  //             imageFetches.push(image$);
  //           }
  //         });

  //         if (imageFetches.length) {
  //           forkJoin(imageFetches).subscribe({
  //             next: (imageData) => {
  //               const formatted = imageData.map(item => ({
  //                 id: uuidv4(),
  //                 file: null,
  //                 originalUrl: item.originalUrl,
  //                 result: item.result
  //               }));

  //               this.uploadedFiles = [...this.uploadedFiles, ...formatted];
  //               this.uploadFileControl.setValue(this.uploadedFiles);
  //             },
  //             error: (err) => {
  //               console.error(`Failed to fetch images for ${uploaderKey}:`, err);
  //             }
  //           });
  //         }
  //       }
  //     });
  // }

  //   ngOnInit(): void {
  //     this.fxBuilderWrapperService.variables$
  //       .pipe(takeUntil(this.destroy$))
  //       .subscribe((variables: any) => {
  //         if (!variables) return;

  //         const uploadedFilesMap: { [key: string]: string[] } = {};

  //         // Extract uploader keys and their corresponding URL arrays
  //         for (const [key, value] of Object.entries(variables)) {
  //           if (key.includes('uploader') && Array.isArray(value)) {
  //             uploadedFilesMap[key] = value;
  //           }
  //         }

  //         for (const [uploaderKey, urls] of Object.entries(uploadedFilesMap)) {
  //           // const imageFetches: Observable<{ result: string; originalUrl: any; title:string ; notes:string }>[] = [];

  //           // urls.forEach((originalUrl:any) => {
  //           //   if (originalUrl) {
  //           //     const image$ = this.http.get(originalUrl?.originalUrl, { responseType: 'blob' }).pipe(
  //           //       map((blob: Blob) => ({
  //           //         result: URL.createObjectURL(blob), // for preview
  //           //         originalUrl: originalUrl?.originalUrl          // preserve original
  //           //       }))
  //           //     );
  //           //     imageFetches.push(image$);
  //           //   }
  //           // });

  //           const imageFetches: Observable<{ result: string; originalUrl: any; title: string; notes: string }>[] = [];

  // urls.forEach((originalUrl: any) => {
  //   if (originalUrl) {
  //     const image$ = this.http.get(originalUrl?.originalUrl, { responseType: 'blob' }).pipe(
  //       map((blob: Blob) => ({
  //         result: URL.createObjectURL(blob), // for preview
  //         originalUrl: originalUrl?.originalUrl, // preserve original
  //         title: originalUrl?.title || '', // default empty if not present
  //         notes: originalUrl?.notes || ''
  //       }))
  //     );
  //     imageFetches.push(image$);
  //   }
  // });


  //           if (imageFetches.length > 0) {
  //             forkJoin(imageFetches).subscribe({
  //               next: (imageData) => {
  //                 const formatted = imageData.map(item => ({
  //                   id: uuidv4(),
  //                   file: null,
  //                   originalUrl: item.originalUrl,
  //                   result: item.result,
  //                   title: item.title,
  //                   notes: ''
  //                 }));

  //                 this.uploadedFiles = [...this.uploadedFiles, ...formatted];
  //                 this.formattedData.uploadedFiles = this.uploadedFiles;
  //                 this.uploadFileControl.setValue(this.formattedData);
  //               },
  //               error: (err) => {
  //                 console.error(`Failed to fetch images for ${uploaderKey}:`, err);
  //               }
  //             });
  //           }
  //         }
  //       });
  //   }

  // ngOnInit(): void {
  //   this.fxBuilderWrapperService.variables$
  //     .pipe(takeUntil(this.destroy$))
  //     .subscribe((variables: any) => {
  //       if (!variables) return;

  //       const uploadedFilesMap: { [key: string]: { originalUrl: string }[] } = variables.uploadedFiles;

  //       for (const [uploaderKey, urls] of Object.entries(uploadedFilesMap)) {
  //         const imageFetches: Observable<{ result: string; originalUrl: string }>[] = [];

  //         urls.forEach((fileObj: any) => {
  //           const originalUrl = fileObj?.originalUrl;
  //           if (originalUrl) {
  //             const image$ = this.http.get(originalUrl, { responseType: 'blob' }).pipe(
  //               map((blob: Blob) => ({
  //                 result: URL.createObjectURL(blob), // for preview
  //                 originalUrl
  //               }))
  //             );
  //             imageFetches.push(image$);
  //           }
  //         });

  //         if (imageFetches.length > 0) {
  //           forkJoin(imageFetches).subscribe({
  //             next: (imageData) => {
  //               const formatted = imageData.map(item => ({
  //                 id: uuidv4(),
  //                 file: null,
  //                 originalUrl: item.originalUrl,
  //                 result: item.result
  //               }));

  //               this.uploadedFiles = [...this.uploadedFiles, ...formatted];
  //               this.formattedData.uploadedFiles = this.uploadedFiles;
  //               this.uploadFileControl.setValue(this.formattedData);
  //             },
  //             error: (err) => {
  //               console.error(`Failed to fetch images for ${uploaderKey}:`, err);
  //             }
  //           });
  //         }
  //       }
  //     });
  // }


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

  // onFileSelected(event: Event) {
  //   const input = event.target as HTMLInputElement;
  //   if (input.files) {
  //     for (let i = 0; i < input.files.length; i++) {
  //       const file = input.files[i];
  //       const reader = new FileReader();

  //       reader.onload = e => {
  //         const newFile = {
  //           id: uuidv4(),
  //           file: file,
  //           originalUrl: null,
  //           result: e.target?.result,
  //           name: file.name,
  //           title: '',
  //           notes: '',
  //           category: '',
  //           type: this.detectFileType(file),
  //         };

  //         this.uploadedFiles.push(newFile);
  //         this.formattedData.uploadedFiles = this.uploadedFiles;
  //         this.uploadFileControl.setValue(this.formattedData);
  //       };

  //       reader.readAsDataURL(file);
  //     }
  //   }
  // }

  //   ngOnInit(): void {
  //   this.fxBuilderWrapperService.variables$
  //     .pipe(takeUntil(this.destroy$))
  //     .subscribe((variables: any) => {
  //       if (!variables) return;

  //       const uploadedFilesMap: { [key: string]: any[] } = {};


  //       for (const [key, value] of Object.entries(variables)) {
  //         if (key.includes('uploader') && Array.isArray(value)) {
  //           uploadedFilesMap[key] = value;
  //         }
  //       }

  //       for (const [uploaderKey, urls] of Object.entries(uploadedFilesMap)) {
  //         const formatted = urls
  //           .filter((fileObj: any) => !!fileObj) 
  //           .map((fileObj: any) => {
  //             // const fileType = this.detectFileTypeFromUrl(fileObj?.originalUrl || fileObj?.name);

  //             return {
  //               id: uuidv4(),
  //               file: null,                         
  //               originalUrl: fileObj.originalUrl,    
  //               result: fileObj?.type === 'image' ? fileObj.originalUrl.previewUrl : null,
  //               name: fileObj?.name || '',
  //               title: fileObj?.title || '',
  //               notes: fileObj?.notes || '',
  //               category: fileObj?.category || '',
  //               type: fileObj?.type,                
  //             };
  //           });

  //         if (formatted.length > 0) {
  //           this.uploadedFiles = [...this.uploadedFiles, ...formatted];
  //           this.formattedData.uploadedFiles = this.uploadedFiles;
  //           this.uploadFileControl.setValue(this.formattedData);
  //         }
  //       }
  //     });
  // }

  ngOnInit(): void {
    this.fxBuilderWrapperService.variables$
      .pipe(takeUntil(this.destroy$))
      .subscribe((variables: any) => {
        if (!variables) return;

        // const uploadedFilesMap: { [key: string]: any[] } = {};


        // for (const [key, value] of Object.entries(variables)) {
        //   if (key.includes('uploader') && (value as any)?.uploadedFiles) {
        //     uploadedFilesMap[key] = (value as any).uploadedFiles;
        //   }
        // }

        for (const [key, value] of Object.entries(variables)) {
  if (
    value &&
    typeof value === 'object' &&
    'uploadedFiles' in value
  ) {
    this.uploadedFilesMap[key] = (value as any).uploadedFiles;
  }
}


        // for (const [uploaderKey, files] of Object.entries(this.uploadedFilesMap)) {
        //   const formatted = files
        //     .filter((fileObj: any) => !!fileObj)
        //     .map((fileObj: any) => {
        //       const originalUrlObj = fileObj.originalUrl;
        //       const fileName = originalUrlObj?.fileName || '';
        //       const fileUrl = originalUrlObj?.fileUrl || '';
        //       const previewUrl = originalUrlObj?.previewUrl;
        //       const type = fileObj?.type;

        //       // detect type based on file extension
        //       // const fileType = this.detectFileTypeFromUrl(fileName || fileUrl);

        //       return {
        //         id: uuidv4(),
        //         file: null,                        // nothing local
        //         originalUrl: originalUrlObj,       // keep whole object
        //         result: type === 'image'
        //           ? (previewUrl)        // prefer previewUrl, fallback to fileUrl
        //           : previewUrl,
        //         name: fileName,
        //         title: fileObj?.title || '',
        //         notes: fileObj?.notes || '',
        //         categoryId: fileObj?.categoryId || '',
        //         type: type,                    // computed type
        //       };
        //     });

        //   if (formatted.length > 0) {
        //     this.uploadedFiles = [...this.uploadedFiles, ...formatted];
        //     this.formattedData.uploadedFiles = this.uploadedFiles;
        //     this.uploadFileControl.setValue(this.formattedData);
        //   }
        // }
      });
  }

ngAfterViewInit(): void {
  setTimeout(()=>{
  const key = this.fxComponent?.fxData?.name;
  const files = this.uploadedFilesMap?.[key];

  // Strong check — ensures patching happens only when files actually exist
  if (key && Array.isArray(files) && files.length > 0) {

    const formatted = files
      .filter((fileObj: any) => !!fileObj)
      .map((fileObj: any) => {
        const originalUrlObj = fileObj.originalUrl;
        const fileName = originalUrlObj?.fileName || '';
        const previewUrl = originalUrlObj?.previewUrl;
        const type = fileObj?.type;

        return {
          id: uuidv4(),
          file: null,
          originalUrl: originalUrlObj,
          result: previewUrl,
          name: fileName,
          title: fileObj?.title || '',
          notes: fileObj?.notes || '',
          categoryId: fileObj?.categoryId || '',
          type: type,
        };
      });
    if (formatted.length > 0) {
      this.uploadedFiles = [...this.uploadedFiles, ...formatted];
      this.formattedData.uploadedFiles = this.uploadedFiles;
      this.uploadFileControl.setValue(this.formattedData);
    }
  }
  },200)

  // setTimeout(() => {
        
  //       if (this.setting('isUploaderRequired') === 'true') {
  //         // this.isRequired = true;
  //         this.uploadFileControl?.setValidators([Validators.required]);
  //         this.uploadFileControl?.updateValueAndValidity();
  //       }
  //     }, 100)

}


  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    const maxFileSize = this.setting('maxFileSize');

    Array.from(input.files).forEach(file => {
      const fileType = this.detectFileType(file);

      const fileSizeInMB = file.size / (1024 * 1024);
      const allowedTypes = ['.pdf', '.stl', 'image/*','.DCM','.htl','HTL'];

      if (fileSizeInMB > maxFileSize) {
        setTimeout(() => {
          this.messageService.add({
            severity: 'error',
            summary: 'File Too Large',
            detail: `The file "${file.name}" exceeds the maximum size limit of ${maxFileSize} MB.`,
            life: 4000,
          });
        }, 200);
        return;
      }

      const isValidFileType = allowedTypes.some(type => {
    if (type === 'image/*') {
      return file.type.startsWith('image/');
    } else {
      return file.name.endsWith(type);
    }
  });

  if (!isValidFileType) {
    setTimeout(() => {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid File Type',
        detail: `File format not supported!`,
        life: 4000,
      });
    }, 200);
    return;
  }

      const newFile: any = {
        id: uuidv4(),
        file: file,
        originalUrl: null,
        result: null,
        name: file.name,
        title: '',
        notes: '',
        categoryId: '',
        type: fileType
      };

      if (fileType === 'image') {
        const reader = new FileReader();
        reader.onload = e => {
          newFile.result = e.target?.result;
          this.uploadedFiles.push(newFile);
          this.formattedData.uploadedFiles = this.uploadedFiles;
          this.uploadFileControl.setValue(this.formattedData);
          this.uploadFileControl.setErrors({ requiredMeta: true });
          
        };
        reader.readAsDataURL(file); // only images need preview
      } else {
        // non-image → push directly
        this.uploadedFiles.push(newFile);
        this.formattedData.uploadedFiles = this.uploadedFiles;
        this.uploadFileControl.setValue(this.formattedData);
        this.uploadFileControl.setErrors({ requiredMeta: true });
        
      }
    });
    input.value = '';
  }


  // onMetaChange() {
  //   this.formattedData.uploadedFiles = this.uploadedFiles;
  //   this.uploadFileControl.setValue(this.formattedData);
  // }

  onMetaChange() {
    this.formattedData.uploadedFiles = this.uploadedFiles;
    this.uploadFileControl.setValue(this.formattedData);

    // ❌ Invalid if any file is missing required fields
    const allValid = this.uploadedFiles.every(
      f => f.title?.trim() && f.notes?.trim() && f.categoryId?.toString().trim()
    );

    if (!allValid) {
      this.uploadFileControl.setErrors({ requiredMeta: true });
    } else {
      this.uploadFileControl.markAsUntouched();
      this.uploadFileControl.setErrors(null);
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


    // this.deletedFiles = [...this.deletedFiles, deletedFile];

    if (!(deletedFile?.file instanceof File)) {
      this.deletedFiles = [...this.deletedFiles, deletedFile];
    }

    // Remove the file from uploadedFiles using filter for immutability
    this.uploadedFiles = this.uploadedFiles.filter((_, i) => i !== index);

    // Update formattedData
    this.formattedData = {
      ...this.formattedData,
      uploadedFiles: this.uploadedFiles,
      deletedFiles: this.deletedFiles
    };

    // Set the value of the uploadFileControl
    this.uploadFileControl.setValue(this.formattedData);
  }



  protected settings(): FxSetting[] {
    return [
      new FxStringSetting({ key: 'upload-text', $title: 'Upload Text', value: 'Upload File' }),
      // new FxStringSetting({ key: 'uploaderErrorMessage', $title: 'Error Message', value: 'Please upload files' }),
      new FxSelectSetting({ key: 'multiple-upload', $title: 'Multiple Uploads', value: false }, [{ option: 'Enable', value: true }, { option: 'Disable', value: false }]),
      new FxStringSetting({ key: 'maxFileNo', $title: 'Maximum File Upload Allowed', value: 8 }),
      new FxStringSetting({ key: 'maxFileSize', $title: 'Maximum File Size Allowed', value: 10 }),
       new FxStringSetting({ key: 'maxFileSize', $title: 'Maximum File Size Allowed', value: 10 }),
        // new FxSelectSetting({ key: 'isUploaderRequired', $title: 'Required', value: 'true' }, [{ option: 'Yes', value: 'true' }, { option: 'No', value: 'false' }]),
    ];
  }

  protected validations(): FxValidation[] {
    return [];
  }

  detectFileType(file: File): 'image' | 'csv' | 'text' | 'pdf' | 'excel' | 'word' | 'stl' | 'other' | 'dcm' | 'htl' {
    const mime = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();

    // Images
    // if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)) {
    //   return 'image';
    // }

    if (
  mime.startsWith('image/') || 
  /\.(png|jpe?g|gif|webp|bmp|svg|tiff?|ico|heif|heic|avif)$/i.test(name)
) {
  return 'image';
}


    // CSV
    if (mime === 'text/csv' || name.endsWith('.csv')) {
      return 'csv';
    }

    // Text files
    if (mime === 'text/plain' || name.endsWith('.txt')) {
      return 'text';
    }

    // PDF
    if (mime === 'application/pdf' || name.endsWith('.pdf')) {
      return 'pdf';
    }

    // Excel
    if (
      mime === 'application/vnd.ms-excel' ||
      mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      /\.(xls|xlsx)$/i.test(name)
    ) {
      return 'excel';
    }

    // Word
    if (
      mime === 'application/msword' ||
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      /\.(doc|docx)$/i.test(name)
    ) {
      return 'word';
    }

   
    if (
      mime === 'model/stl' ||
      mime === 'application/sla' || // Some browsers use this for STL
      /\.stl$/i.test(name)
    ) {
      return 'stl';
    }

    if (
  /\.dcm$/i.test(name)
) {
  return 'dcm';
}

    if (
  /\.htl$/i.test(name)
) {
  return 'htl';
}




    return 'other';
  }


  // openFileDialog(fileInput: HTMLInputElement) {
  //   // reset the value so change always triggers
  //   fileInput.value = '';
  //   fileInput.click();
  // }

  openFileDialog() {
    // if (this.uploadedFiles.length > this.setting('maxFileNo')) {
    //     // this.messageService.add({
    //     //   severity: 'success',
    //     //   summary: 'Success',
    //     //   detail: `Maximum"${this.setting('maxFileNo')}" can be uploaded`,
    //     //   life: 3000
    //     // });
    //   return;
    // }
    this.fileInput.nativeElement.value = '';
    this.fileInput.nativeElement.click();
  }

  onBasicUploadAuto(event: UploadEvent) {
    
  }

  closeDialog() {
    this.visible = false;
    this.selecteImageUrl = '';
  }

  onImageSelect(url: string) {
    this.selecteImageUrl = url;
    this.visible = true;
  }

  onFileClick(file: any, name: any): void {

    if (!file) return;

    // this.fileName = file.name;
    let localUrl = '';

    if (file?.file) {
      localUrl = URL.createObjectURL(file.file);
    } else {
      localUrl = file?.result || '';
    }
    // const localUrl = URL.createObjectURL(file);


    this.loadFile(localUrl, name);
    this.fileVisible = true;
  }

  onOpenSTLFile(file: any): void {
    if (!file) {
      console.error('Invalid file structure:', file);
      return;
    }

    const actualFile = file.file;
    if(actualFile) {
      const blob = new Blob([actualFile], { type: 'application/octet-stream' });
      this.stlFileVisible = true;
      this.stlFileUpload = blob;
    } else {
      this.fetchAndLoadModel(file.originalUrl);
    }
  }

  private fetchAndLoadModel(originalUrl: any): void {
    const payload = {
      region: originalUrl.region,
      bucketName: originalUrl.bucketName,
      fileUrl: originalUrl.fileUrl,
      objectKey: originalUrl.objectKey,
    };
    const serviceUrl = `${this.fxApiService.getServiceUrl('workflow_service')}/workflow/files/download`;
    this.http.post(
      serviceUrl,
      payload,
      { responseType: 'arraybuffer' }
    ).subscribe(response => {
      const blob = new Blob([response], { type: 'application/octet-stream' });
      this.stlFileVisible = true;
      this.stlFileUpload = blob;
    });
  }

  private loadFile(url: string, fileName: string): void {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    this.fileType = extension;

    if (extension === 'pdf') {
      // Native PDF rendering
      this.fileUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
    else if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', '.stl'].includes(extension)) {
      // Microsoft Office Viewer for Office files
      // const officeViewer = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
      // console.log(officeViewer);
      const googleViewerUrl = 'https://docs.google.com/gview?url=' + encodeURIComponent(url) + '&embedded=true';
      this.fileUrl = this.sanitizer.bypassSecurityTrustResourceUrl(googleViewerUrl);

      // this.fileUrl = this.sanitizer.bypassSecurityTrustResourceUrl(officeViewer);
    }
    else {
      // Unsupported type
      this.fileUrl = null;
      this.fileType = 'unsupported';
    }
  }

  closeFileDialog() {
    this.fileVisible = false;
    this.fileUrl = null;
    this.fileType = null;
    this.fileName = null;
  }

  closeStlDialog() {
    this.stlFileVisible = false;
    this.stlFileUpload = null;
  }

}
