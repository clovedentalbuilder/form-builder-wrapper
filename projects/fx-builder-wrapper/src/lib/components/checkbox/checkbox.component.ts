import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FxBaseComponent, FxSetting, FxStringSetting, FxValidation } from '@instantsys-labs/fx';
import { CheckboxModule } from 'primeng/checkbox';
import { Subject, takeUntil } from 'rxjs';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { CheckboxSettingsPanelComponent } from './checkbox-settings-panel.component';

@Component({
  selector: 'lib-checkbox',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, CheckboxSettingsPanelComponent, CheckboxModule],
  templateUrl: './checkbox.component.html',
  styleUrl: './checkbox.component.css'
})
export class CheckboxComponent extends FxBaseComponent implements OnInit, AfterViewInit {
  @ViewChild('fxComponent') fxComponent!: CheckboxSettingsPanelComponent;

  private fb = inject(FormBuilder);
  private destroy$ = new Subject<boolean>();

  // ── User-interaction form (what gets submitted) ──────────────────
  public checkboxForm = this.fb.group({
    checked:               [false],
    useUserDefinedMapping: [false],
    checkedValue:          [''],
    uncheckedValue:        ['']
  });

  // ── Display/behaviour config (driven by the settings panel) ─────
  public checkboxConfig: any = {
    label:                 'Checkbox Label',
    isRequired:            'false',
    errorMsg:              'This field is required',
    customClass:           '',
    useUserDefinedMapping: 'false',
    checkedValue:          '',
    uncheckedValue:        ''
  };

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
    // Restore display config from the single saved setting key
    setTimeout(() => {
      const savedConfig = this.setting('checkbox-config');
      if (savedConfig && typeof savedConfig === 'object' && Object.keys(savedConfig).length) {
        this.checkboxConfig = { ...this.checkboxConfig, ...savedConfig };
      }
      this.applySettings(this.checkboxConfig);
    }, 100);

    // Restore previously saved form values (patching pattern)
    setTimeout(() => {
      const key = this.fxComponent?.fxData?.name;
      if (key && this.checkboxMap.has(key)) {
        this.checkboxForm.patchValue(this.checkboxMap.get(key));
      }
    }, 200);
  }

  /** Called by the settings panel every time the user clicks Save Settings */
  onSettingsChanged(config: any): void {
    this.checkboxConfig = { ...config };
    this.applySettings(this.checkboxConfig);
    this.cdr.detectChanges();
  }

  private applySettings(config: any): void {
    const required   = config.isRequired            === 'true';
    const useMapping = config.useUserDefinedMapping === 'true';
    const mainControl = this.checkboxForm.get('checked');

    this.isRequired = required;
    if (required) {
      mainControl?.setValidators([Validators.requiredTrue]);
    } else {
      mainControl?.clearValidators();
    }
    mainControl?.updateValueAndValidity();

    this.checkboxForm.get('useUserDefinedMapping')?.setValue(useMapping);
    this.checkboxForm.get('checkedValue')?.setValue(useMapping ? (config.checkedValue || '') : '');
    this.checkboxForm.get('uncheckedValue')?.setValue(useMapping ? (config.uncheckedValue || '') : '');
  }

  // ── ONE key — stores the full config object (same as table-config in dynamic-table)
  protected settings(): FxSetting[] {
    return [
      new FxStringSetting({ key: 'checkbox-config', $title: 'Checkbox Configuration', value: {} })
    ];
  }

  protected validations(): FxValidation[] {
    return [];
  }
}
