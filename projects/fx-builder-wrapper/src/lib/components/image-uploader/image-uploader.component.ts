import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FxBaseComponent, FxComponent, FxSelectSetting, FxSetting, FxStringSetting, FxValidation } from '@instantsys-labs/fx';
import { DialogModule } from 'primeng/dialog';
import { Subject, takeUntil } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';

/**
 * Image Uploader: a single-purpose, local-file-only image upload field.
 *
 * Deliberately mirrors lib `uploader`'s (fx-uploader) DATA FORMAT and
 * PATCHING LOGIC exactly, so a saved value round-trips identically between
 * the two components:
 *   - Value shape: `{ uploadedFiles: [...], deletedFiles: [...] }`, each
 *     entry `{ id, file, originalUrl, result, name, title, notes,
 *     categoryId, fileMetaId, type }` — see uploader.component.ts.
 *   - Patching: subscribes to wrapperService.variables$, collects every
 *     key whose value carries an `uploadedFiles` array, then (after view
 *     init) rehydrates THIS field's own entries from
 *     `originalUrl.{fileName,previewUrl}` into the same shape.
 *
 * Unlike fx-uploader, this component only supports picking a LOCAL file
 * (plain `<input type="file">` + FileReader) — no "attach from files"
 * iframe gallery, no PDF/STL/DCM viewers, no category picker. Restricted to
 * images (`accept="image/*"`, image/* MIME check on select).
 */
@Component({
  selector: 'lib-image-uploader',
  standalone: true,
  imports: [CommonModule, FxComponent, FormsModule, ReactiveFormsModule, DialogModule],
  templateUrl: './image-uploader.component.html',
  styleUrl: './image-uploader.component.css',
})
export class ImageUploaderComponent extends FxBaseComponent implements OnInit, AfterViewInit, OnDestroy {
  public uploadFileControl = new FormControl();
  public uploadedFiles: Array<any> = [];
  public formattedData: any = {
    uploadedFiles: [],
    deletedFiles: [],
  };

  isUploaderRequired = false;
  uploadError = '';
  visible = false;
  selecteImageUrl = '';

  deletedFiles: any[] = [];
  uploadedFilesMap: { [key: string]: any[] } = {};
  private destroy$ = new Subject<boolean>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fxComponent') fxComponent!: FxComponent;

  constructor(private cdr: ChangeDetectorRef, private wrapperService: FxBuilderWrapperService) {
    super(cdr);
    this.onInit.subscribe(() => {
      this._register(this.uploadFileControl);
    });
  }

  ngOnInit(): void {
    this.wrapperService.variables$
      .pipe(takeUntil(this.destroy$))
      .subscribe((variables: any) => {
        if (!variables) return;

        for (const [key, value] of Object.entries(variables)) {
          if (value && typeof value === 'object' && 'uploadedFiles' in value) {
            this.uploadedFilesMap[key] = (value as any).uploadedFiles;
          }
        }
      });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
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
            const type = fileObj?.type || 'image';

            return {
              id: uuidv4(),
              file: null,
              originalUrl: originalUrlObj,
              result: previewUrl,
              name: fileName,
              title: fileObj?.title || '',
              notes: fileObj?.notes || '',
              categoryId: fileObj?.categoryId || '',
              fileMetaId: fileObj?.fileMetaId || null,
              type,
            };
          });

        if (formatted.length > 0) {
          this.uploadedFiles = [...this.uploadedFiles, ...formatted];
          this.formattedData.uploadedFiles = this.uploadedFiles;
          this.uploadFileControl.setValue(this.formattedData);
        }
      }
    }, 200);

    setTimeout(() => {
      this.isUploaderRequired = this.setting('isUploaderRequired') === 'true';

      this.uploadFileControl.addValidators((ctrl) => {
        const files: any[] = ctrl.value?.uploadedFiles || [];
        if (files.length === 0) {
          return this.isUploaderRequired ? { required: true } : null;
        }
        return null;
      });

      this.uploadFileControl.updateValueAndValidity();
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }

  get canAddMore(): boolean {
    const max = Number(this.setting('maxFileNo')) || 1;
    return this.uploadedFiles.length < max;
  }

  openFileDialog(): void {
    if (!this.canAddMore) return;
    this.fileInput.nativeElement.value = '';
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    const maxFileSize = Number(this.setting('maxFileSize')) || 10;
    this.uploadError = '';

    Array.from(input.files).forEach((file) => {
      if (!this.canAddMore) return;

      if (!file.type.startsWith('image/')) {
        this.uploadError = `"${file.name}" is not an image.`;
        return;
      }

      const fileSizeInMB = file.size / (1024 * 1024);
      if (fileSizeInMB > maxFileSize) {
        this.uploadError = `"${file.name}" exceeds the maximum size of ${maxFileSize} MB.`;
        return;
      }

      const newFile: any = {
        id: uuidv4(),
        file,
        originalUrl: null,
        result: null,
        name: file.name,
        title: file.name,
        notes: '',
        categoryId: '',
        fileMetaId: null,
        type: 'image',
      };

      const reader = new FileReader();
      reader.onload = (e) => {
        newFile.result = e.target?.result;
        this.uploadedFiles.push(newFile);
        this.formattedData.uploadedFiles = this.uploadedFiles;
        this.uploadFileControl.setValue(this.formattedData);
        if (this.uploadFileControl.touched) {
          this.uploadFileControl.markAsUntouched({ onlySelf: true });
        }
      };
      reader.readAsDataURL(file);
    });
    input.value = '';
  }

  deleteFile(index: number): void {
    const deletedFile = this.uploadedFiles?.[index];
    if (!deletedFile) return;

    this.formattedData = this.formattedData || { uploadedFiles: [], deletedFiles: [] };

    if (!(deletedFile?.file instanceof File)) {
      this.deletedFiles = [...this.deletedFiles, deletedFile];
    }

    this.uploadedFiles = this.uploadedFiles.filter((_, i) => i !== index);

    this.formattedData = {
      ...this.formattedData,
      uploadedFiles: this.uploadedFiles,
      deletedFiles: this.deletedFiles,
    };

    this.uploadFileControl.setValue(this.formattedData);

    if (this.isUploaderRequired && this.uploadedFiles.length === 0) {
      this.uploadFileControl.setErrors({ required: true });
      this.uploadFileControl.markAsTouched();
    } else {
      this.uploadFileControl.setErrors(null);
    }
  }

  onImageSelect(url: string): void {
    if (!url) return;
    this.selecteImageUrl = url;
    this.visible = true;
  }

  closeDialog(): void {
    this.visible = false;
    this.selecteImageUrl = '';
  }

  protected settings(): FxSetting[] {
    return [
      new FxStringSetting({ key: 'label', $title: 'Label', value: 'Image' }),
      new FxStringSetting({ key: 'uploadText', $title: 'Upload Box Text', value: 'Click to upload' }),
      new FxStringSetting({ key: 'uploaderErrorMessage', $title: 'Error Message', value: 'Please upload an image' }),
      new FxSelectSetting({ key: 'multiple-upload', $title: 'Multiple Uploads', value: false }, [{ option: 'Enable', value: true }, { option: 'Disable', value: false }]),
      new FxStringSetting({ key: 'maxFileNo', $title: 'Maximum File Upload Allowed', value: 1 }),
      new FxStringSetting({ key: 'maxFileSize', $title: 'Maximum File Size Allowed (MB)', value: 10 }),
      new FxSelectSetting({ key: 'isUploaderRequired', $title: 'Required', value: 'false' }, [{ option: 'Yes', value: 'true' }, { option: 'No', value: 'false' }]),
    ];
  }

  protected validations(): FxValidation[] {
    return [];
  }
}
