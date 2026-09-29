import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostBinding } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  FxBaseComponent,
  FxMode,
  FxSetting,
  FxStringSetting,
  FxSelectSetting,
  FxValidation,
} from '@instantsys-labs/fx';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { CustomPasswordSettingsPanelComponent } from './custom-password-settings-panel.component';
import { GateConfig, isApplicable, parseConditions } from '../shared/applicability';
import { resolveSiblingControl } from '../shared/conditional-disable';
import { isSettingOn, yesNoOptions } from '../shared/yes-no-setting';

/**
 * Custom password: a self-contained password-input field (own FormControl, own
 * validation UI) modelled on lib-custom-textbox so its validators never touch
 * the fx library's shared FxValidatorService statics — sidesteps the
 * cross-field validation-message bleed native fields are prone to.
 *
 * Value shape: a primitive string (FormControl<string>) stored directly under
 * fxData.name — identical to custom-textbox, so no value-adapter entry is
 * needed (a bare string is already native-friendly for cross-type
 * migration/unwrap).
 *
 * The input's `type` toggles between 'password' (masked, the default) and
 * 'text' (revealed) via a suffix eye / eye-slash button rendered inside the
 * input. The reveal state is view-only chrome — it never changes the stored
 * value, which is always the plain string the user typed.
 *
 * Settings (own dialog, same chrome pattern as custom-textbox):
 *   - Basic: label, placeholder, help text.
 *   - Validation: required / minLength / maxLength / pattern, each with its own
 *     message, enforced via plain Angular Validators.
 *   - Enable/Disable & Visibility: each a condition list — privilege /
 *     supportingData / another-field's-value rows combined via per-condition
 *     AND/OR grouping. See shared/applicability.ts.
 *
 * Yes/No settings (isRequired, the gate *UseCode flags) are FxSelectSettings
 * storing the STRINGS 'true'/'false' — see shared/yes-no-setting.ts. Read them with
 * isSettingOn() (templates: isOn()), never `=== true` and never bare truthiness,
 * since the string 'false' is truthy. showInListing still stores via
 * FxStringSetting defaulting to false.
 */
@Component({
  selector: 'lib-custom-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CustomPasswordSettingsPanelComponent],
  templateUrl: './custom-password.component.html',
  styleUrl: './custom-password.component.css',
})
export class CustomPasswordComponent extends FxBaseComponent {
  public control = new FormControl<string>('');

  /** View-only reveal state: false = masked ('password'), true = shown ('text'). Default masked. */
  public showPassword = false;

  constructor(private cdr: ChangeDetectorRef, private wrapperService: FxBuilderWrapperService) {
    super(cdr);
    this.onInit.subscribe(() => {
      this._register(this.control);
      this.applyValidators();
    });
  }

  /**
   * Template helper for a Yes/No setting. Templates must NOT test `setting(key)`
   * directly — it now holds the string 'false', which is truthy.
   */
  public isOn(key: string): boolean {
    return isSettingOn(this.setting(key));
  }

  protected settings(): FxSetting[] {
    return [
      new FxStringSetting({ key: 'label', $title: 'Label', value: 'Label' }),
      new FxStringSetting({ key: 'placeholder', $title: 'Placeholder', value: '' }),
      new FxStringSetting({ key: 'helpText', $title: 'Help Text', value: '' }),
      new FxStringSetting({ key: 'showInListing', $title: 'Show In Listing', value: false }),

      new FxSelectSetting({ key: 'isRequired', $title: 'Required', value: 'false' }, yesNoOptions()),
      new FxStringSetting({ key: 'requiredMessage', $title: 'Required Message', value: 'This field is required' }),
      new FxStringSetting({ key: 'minLength', $title: 'Min Length', value: '' }),
      new FxStringSetting({ key: 'minLengthMessage', $title: 'Min Length Message', value: 'Value is too short' }),
      new FxStringSetting({ key: 'maxLength', $title: 'Max Length', value: '' }),
      new FxStringSetting({ key: 'maxLengthMessage', $title: 'Max Length Message', value: 'Value is too long' }),
      new FxStringSetting({ key: 'pattern', $title: 'Pattern (Regex)', value: '' }),
      new FxStringSetting({ key: 'patternMessage', $title: 'Pattern Message', value: 'Invalid format' }),

      // Enable/disable gate: a condition list (privilege/supportingData/field rows, freely
      // combined via grouping) OR custom code — see shared/applicability.ts.
      new FxSelectSetting({ key: 'enableUseCode', $title: 'Enable: Use Custom Code', value: 'false' }, yesNoOptions()),
      new FxStringSetting({ key: 'enableConditions', $title: 'Enable Conditions', value: '[]' }),
      new FxStringSetting({ key: 'enableConditionsMatch', $title: 'Enable Conditions Match', value: 'any' }),
      new FxStringSetting({ key: 'enableCode', $title: 'Enable Code', value: '' }),

      // Visibility gate: same condition-list-or-code shape as enable.
      new FxSelectSetting({ key: 'visibilityUseCode', $title: 'Visibility: Use Custom Code', value: 'false' }, yesNoOptions()),
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

  /** Native input type — 'text' when revealed, 'password' when masked. */
  get inputType(): string {
    return this.showPassword ? 'text' : 'password';
  }

  /** Flips the mask on/off; view-only, never touches the stored value. */
  toggleReveal(): void {
    this.showPassword = !this.showPassword;
  }

  /** Computes { visible, enabled } from privileges + supportingData + another field's live value. See shared/applicability.ts. */
  private get applicability(): { visible: boolean; enabled: boolean } {
    const visibility: GateConfig = {
      useCode: isSettingOn(this.setting('visibilityUseCode')),
      code: this.setting('visibilityCode'),
      conditions: parseConditions(this.setting('visibilityConditions')),
      conditionsMatch: this.setting('visibilityConditionsMatch'),
    };
    const enable: GateConfig = {
      useCode: isSettingOn(this.setting('enableUseCode')),
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
    if (this.control.hasError('minlength')) return this.setting('minLengthMessage') || 'Value is too short';
    if (this.control.hasError('maxlength')) return this.setting('maxLengthMessage') || 'Value is too long';
    if (this.control.hasError('pattern')) return this.setting('patternMessage') || 'Invalid format';
    return null;
  }

  private applyValidators(): void {
    const validators = [];
    if (isSettingOn(this.setting('isRequired'))) validators.push(Validators.required);
    const minLength = Number(this.setting('minLength'));
    if (minLength > 0) validators.push(Validators.minLength(minLength));
    const maxLength = Number(this.setting('maxLength'));
    if (maxLength > 0) validators.push(Validators.maxLength(maxLength));
    const pattern = this.setting('pattern');
    if (pattern) validators.push(Validators.pattern(pattern));
    this.control.setValidators(validators);
    this.control.updateValueAndValidity({ emitEvent: false });
  }
}
