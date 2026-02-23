import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FxBaseComponent, FxComponent, FxSelectSetting, FxSetting, FxStringSetting, FxValidation } from '@instantsys-labs/fx';
import { CheckboxModule } from 'primeng/checkbox';
import { Subject, takeUntil } from 'rxjs';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';

@Component({
  selector: 'lib-checkbox',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, FxComponent, CheckboxModule],
  templateUrl: './checkbox.component.html',
  styleUrl: './checkbox.component.css'
})
export class CheckboxComponent extends FxBaseComponent implements OnInit, AfterViewInit {
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<boolean>();

  @ViewChild('fxComponent') fxComponent!: FxComponent;

  public checkboxForm = this.fb.group({
    checked: [false],
    useUserDefinedMapping: [false],
    checkedValue: [''],
    uncheckedValue: ['']
  });

  isRequired: boolean = false;
  private checkboxMap = new Map<string, any>();

  constructor(private cdr: ChangeDetectorRef, private fxBuilderWrapperService: FxBuilderWrapperService) {
    super(cdr);
    this.onInit.subscribe(() => {
      this._register(this.checkboxForm);
    });
  }

  ngOnInit(): void {
    this.fxBuilderWrapperService.variables$
      .pipe(takeUntil(this.destroy$))
      .subscribe((variables: any) => {
        if (!variables) return;

        for (const [key, value] of Object.entries(variables) as [string, any][]) {
          if (value && typeof value === 'object' && 'checked' in value) {
            this.checkboxMap.set(key, value);
          }
        }
      });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const mainControl = this.checkboxForm.get('checked');

      if (this.setting('isRequired') === 'true') {
        this.isRequired = true;
        mainControl?.setValidators([Validators.requiredTrue]);
        mainControl?.updateValueAndValidity();
      }

      if (this.setting('useUserDefinedMapping') === 'true') {
        this.checkboxForm.get('useUserDefinedMapping')?.setValue(true);
        this.checkboxForm.get('checkedValue')?.setValue(this.setting('checkedValue'));
        this.checkboxForm.get('uncheckedValue')?.setValue(this.setting('uncheckedValue'));
      }
    }, 100);

    setTimeout(() => {
      const key = this.fxComponent?.fxData?.name;
      if (key && this.checkboxMap.has(key)) {
        this.checkboxForm.patchValue(this.checkboxMap.get(key));
      }
    }, 200);
  }

  protected settings(): FxSetting[] {
    return [
      new FxStringSetting({ key: 'label', $title: 'Label', value: 'Checkbox Label' }),
      new FxSelectSetting({ key: 'isRequired', $title: 'Required', value: 'false' }, [{ option: 'Yes', value: 'true' }, { option: 'No', value: 'false' }]),
      new FxStringSetting({ key: 'error-msg', $title: 'Error Message', value: 'This field is required' }),
      new FxStringSetting({ key: 'customClass', $title: 'Custom Class Name', value: '' }),
      new FxSelectSetting({ key: 'useUserDefinedMapping', $title: 'Use user defined mapping', value: 'false', $description: 'If enabled, the checkbox will be mapped to user defined values'}, [{ option: 'Yes', value: 'true' }, { option: 'No', value: 'false' }]),
      new FxStringSetting({ key: 'checkedValue', $title: 'Value for checked', value: '' ,$description:'The value which will be emitted when the checkbox is checked. This setting is only applicable if "Use user defined mapping" is set to "Yes".'}),
      new FxStringSetting({ key: 'uncheckedValue', $title: 'Value for unchecked', value: '', $description:'The value which will be emitted when the checkbox is unchecked. This setting is only applicable if "Use user defined mapping" is set to "Yes".' }),
    ];
  }

  protected validations(): FxValidation[] {
    return [];
  }
}
