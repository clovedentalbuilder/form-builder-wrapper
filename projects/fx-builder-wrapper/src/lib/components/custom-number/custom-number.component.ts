import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostBinding } from '@angular/core';
import { AbstractControl, FormControl, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import {
  FxBaseComponent,
  FxMode,
  FxSelectSetting,
  FxSetting,
  FxStringSetting,
  FxToggleSetting,
  FxValidation,
} from '@instantsys-labs/fx';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { CustomNumberSettingsPanelComponent } from './custom-number-settings-panel.component';
import { GateConfig, isApplicable, parseConditions } from '../shared/applicability';
import { resolveSiblingControl } from '../shared/conditional-disable';

/**
 * Custom number: a self-contained numeric-input field (own FormControl, own
 * validation UI) modelled on lib-custom-textbox so its validators never touch
 * the fx library's shared FxValidatorService statics — sidesteps the
 * cross-field validation-message bleed native fields are prone to.
 *
 * Value shape: a primitive number (FormControl<number | null>) stored directly
 * under fxData.name — no wrapper object, so no value-adapter entry is needed
 * (a bare number is already native-friendly for cross-type migration/unwrap).
 *
 * Settings (own dialog, same chrome pattern as custom-textbox):
 *   - Basic: label, placeholder, help text, default value, allow-decimals vs
 *     integer-only, decimal places, step increment.
 *   - Validation: required / min / max / integer-only / decimal-places /
 *     step (multiple-of), each with its own message, enforced via plain Angular
 *     Validators + small local numeric validators.
 *   - Enable/Disable & Visibility: each a condition list — privilege /
 *     supportingData / another-field's-value rows combined via per-condition
 *     AND/OR grouping. See shared/applicability.ts.
 *
 * allow-decimals and validate-step are Yes/No selects storing the STRINGS
 * 'true'/'false' (not toggles) so a "No" survives the fx deepMergeObjects
 * boolean quirk. isRequired mirrors custom-textbox: a FxToggleSetting whose
 * default is false, which is merge-safe.
 */
@Component({
  selector: 'lib-custom-number',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CustomNumberSettingsPanelComponent],
  templateUrl: './custom-number.component.html',
  styleUrl: './custom-number.component.css',
})
export class CustomNumberComponent extends FxBaseComponent {
  public control = new FormControl<number | null>(null);

  constructor(private cdr: ChangeDetectorRef, private wrapperService: FxBuilderWrapperService) {
    super(cdr);
    this.onInit.subscribe(() => {
      this._register(this.control);
      this.applyDefaultValue();
      this.applyValidators();
    });
  }

  protected settings(): FxSetting[] {
    return [
      new FxStringSetting({ key: 'label', $title: 'Label', value: 'Label' }),
      new FxStringSetting({ key: 'placeholder', $title: 'Placeholder', value: '' }),
      new FxStringSetting({ key: 'helpText', $title: 'Help Text', value: '' }),
      new FxStringSetting({ key: 'showInListing', $title: 'Show In Listing', value: false }),
      new FxStringSetting({ key: 'defaultValue', $title: 'Default Value', value: '' }),
      // Yes/No selects storing 'true'/'false' strings — survive the deepMergeObjects
      // boolean quirk (a boolean default of true could never be saved as false).
      new FxSelectSetting({ key: 'allowDecimals', $title: 'Allow Decimals', value: 'true' }, [
        { option: 'Yes', value: 'true' },
        { option: 'No', value: 'false' },
      ]),
      new FxStringSetting({ key: 'decimalPlaces', $title: 'Decimal Places', value: '' }),
      new FxStringSetting({ key: 'step', $title: 'Step Increment', value: '' }),

      // isRequired: FxToggleSetting is only merge-safe because its default is false.
      new FxToggleSetting({ key: 'isRequired', $title: 'Required', value: false }),
      new FxStringSetting({ key: 'requiredMessage', $title: 'Required Message', value: 'This field is required' }),
      new FxStringSetting({ key: 'min', $title: 'Min Value', value: '' }),
      new FxStringSetting({ key: 'minMessage', $title: 'Min Message', value: 'Value is too small' }),
      new FxStringSetting({ key: 'max', $title: 'Max Value', value: '' }),
      new FxStringSetting({ key: 'maxMessage', $title: 'Max Message', value: 'Value is too large' }),
      new FxStringSetting({ key: 'integerMessage', $title: 'Integer Message', value: 'Only whole numbers are allowed' }),
      new FxStringSetting({ key: 'decimalPlacesMessage', $title: 'Decimal Places Message', value: 'Too many decimal places' }),
      new FxSelectSetting({ key: 'validateStep', $title: 'Validate Step (multiple of)', value: 'false' }, [
        { option: 'Yes', value: 'true' },
        { option: 'No', value: 'false' },
      ]),
      new FxStringSetting({ key: 'stepMessage', $title: 'Step Message', value: 'Value must be a valid step' }),

      // Enable/disable gate: a condition list (privilege/supportingData/field rows, freely
      // combined via grouping) OR custom code — see shared/applicability.ts.
      new FxToggleSetting({ key: 'enableUseCode', $title: 'Enable: Use Custom Code', value: false }),
      new FxStringSetting({ key: 'enableConditions', $title: 'Enable Conditions', value: '[]' }),
      new FxStringSetting({ key: 'enableConditionsMatch', $title: 'Enable Conditions Match', value: 'any' }),
      new FxStringSetting({ key: 'enableCode', $title: 'Enable Code', value: '' }),

      // Visibility gate: same condition-list-or-code shape as enable.
      new FxToggleSetting({ key: 'visibilityUseCode', $title: 'Visibility: Use Custom Code', value: false }),
      new FxStringSetting({ key: 'visibilityConditions', $title: 'Visibility Conditions', value: '[]' }),
      new FxStringSetting({ key: 'visibilityConditionsMatch', $title: 'Visibility Conditions Match', value: 'any' }),
      new FxStringSetting({ key: 'visibilityCode', $title: 'Visibility Code', value: '' }),
    ];
  }

  protected validations(): FxValidation[] {
    return [];
  }

  get isEditing(): boolean {
    return this.fxData?.$fxForm?.$mode !== FxMode.VIEW;
  }

  get allowDecimals(): boolean {
    return this.setting('allowDecimals') !== 'false';
  }

  /** step attribute for the native input: the configured step, or 'any' when decimals are allowed. */
  get stepAttr(): string {
    const step = this.numOrNull(this.setting('step'));
    if (step != null && step > 0) return String(step);
    return this.allowDecimals ? 'any' : '1';
  }

  get minAttr(): number | null {
    return this.numOrNull(this.setting('min'));
  }

  get maxAttr(): number | null {
    return this.numOrNull(this.setting('max'));
  }

  /** Computes { visible, enabled } from privileges + supportingData + another field's live value. See shared/applicability.ts. */
  private get applicability(): { visible: boolean; enabled: boolean } {
    const visibility: GateConfig = {
      useCode: this.setting('visibilityUseCode') === true,
      code: this.setting('visibilityCode'),
      conditions: parseConditions(this.setting('visibilityConditions')),
      conditionsMatch: this.setting('visibilityConditionsMatch'),
    };
    const enable: GateConfig = {
      useCode: this.setting('enableUseCode') === true,
      code: this.setting('enableCode'),
      conditions: parseConditions(this.setting('enableConditions')),
      conditionsMatch: this.setting('enableConditionsMatch'),
    };
    return isApplicable(
      { visibility, enable },
      {
        privileges: this.wrapperService.privileges,
        supportingData: this.wrapperService.supportingData,
        resolveField: (name) => resolveSiblingControl(this.fxData, name)?.value,
      },
    );
  }

  /** Runtime-only: always visible/editable in the builder. */
  get fieldHidden(): boolean {
    if (this.isEditing) return false;
    return !this.applicability.visible;
  }

  get fieldDisabled(): boolean {
    if (this.isEditing) return false;
    return !this.applicability.enabled;
  }

  /** Bound on this component's OWN host element so hiding collapses the whole field, label included. */
  @HostBinding('hidden')
  get hostHidden(): boolean {
    return this.fieldHidden;
  }

  @HostBinding('attr.inert')
  get hostInert(): string | null {
    return this.fieldHidden ? '' : null;
  }

  onSettingsChanged(_config: any): void {
    this.applyValidators();
    this.detectChanges();
  }

  get errorMessage(): string | null {
    if (!this.control.touched || this.control.valid) return null;
    if (this.control.hasError('required')) return this.setting('requiredMessage') || 'This field is required';
    if (this.control.hasError('min')) return this.setting('minMessage') || 'Value is too small';
    if (this.control.hasError('max')) return this.setting('maxMessage') || 'Value is too large';
    if (this.control.hasError('integer')) return this.setting('integerMessage') || 'Only whole numbers are allowed';
    if (this.control.hasError('maxDecimals')) return this.setting('decimalPlacesMessage') || 'Too many decimal places';
    if (this.control.hasError('stepMismatch')) return this.setting('stepMessage') || 'Value must be a valid step';
    return null;
  }

  /** Seeds the configured default value only when the field is still empty/pristine (never clobbers a loaded value). */
  private applyDefaultValue(): void {
    if (this.control.value != null || this.control.dirty) return;
    const def = this.numOrNull(this.setting('defaultValue'));
    if (def != null) this.control.setValue(def, { emitEvent: false });
  }

  private applyValidators(): void {
    const validators: ValidatorFn[] = [];
    if (this.setting('isRequired') === true) validators.push(Validators.required);

    const min = this.numOrNull(this.setting('min'));
    if (min != null) validators.push(Validators.min(min));

    const max = this.numOrNull(this.setting('max'));
    if (max != null) validators.push(Validators.max(max));

    if (!this.allowDecimals) {
      validators.push(this.integerValidator());
    } else {
      const dp = this.numOrNull(this.setting('decimalPlaces'));
      if (dp != null && dp >= 0) validators.push(this.maxDecimalsValidator(dp));
    }

    if (this.setting('validateStep') === 'true') {
      const step = this.numOrNull(this.setting('step'));
      if (step != null && step > 0) validators.push(this.stepValidator(step, min ?? 0));
    }

    this.control.setValidators(validators);
    this.control.updateValueAndValidity({ emitEvent: false });
  }

  /** Rejects any value that is not a whole number. */
  private integerValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const v = control.value;
      if (v === null || v === undefined || v === '') return null;
      return Number.isInteger(Number(v)) ? null : { integer: true };
    };
  }

  /** Rejects values with more than `max` digits after the decimal point. */
  private maxDecimalsValidator(max: number): ValidatorFn {
    return (control: AbstractControl) => {
      const v = control.value;
      if (v === null || v === undefined || v === '') return null;
      const decimals = String(v).split('.')[1]?.length ?? 0;
      return decimals > max ? { maxDecimals: { max, actual: decimals } } : null;
    };
  }

  /** Rejects values that are not `base + n*step` (n integer), tolerant of float rounding. */
  private stepValidator(step: number, base: number): ValidatorFn {
    return (control: AbstractControl) => {
      const v = control.value;
      if (v === null || v === undefined || v === '') return null;
      const ratio = (Number(v) - base) / step;
      const rounded = Math.round(ratio);
      return Math.abs(ratio - rounded) < 1e-9 ? null : { stepMismatch: { step, base } };
    };
  }

  /** Parses a setting to a finite number, or null for empty/invalid input. */
  private numOrNull(raw: any): number | null {
    if (raw === null || raw === undefined || String(raw).trim() === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
}
