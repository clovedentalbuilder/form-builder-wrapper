import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostBinding } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  FxBaseComponent,
  FxMode,
  FxSetting,
  FxStringSetting,
  FxToggleSetting,
  FxValidation,
} from '@instantsys-labs/fx';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import { CustomTextareaSettingsPanelComponent } from './custom-textarea-settings-panel.component';
import { GateConfig, isApplicable, parseConditions } from '../shared/applicability';
import { resolveSiblingControl } from '../shared/conditional-disable';

/**
 * Custom textarea: a self-contained multi-line text field (own FormControl,
 * own validation UI) so its validators never touch the fx library's shared
 * FxValidatorService statics — sidesteps the cross-field validation-message
 * bleed that native fx-textarea is prone to.
 *
 * Same settings shape as lib-custom-textbox (see that component for the full
 * rationale), plus a `rows` setting for the textarea's height. Hidden fields
 * always keep their control registered and value included in the form — no
 * "exclude from form when hidden" option; only visual visibility is gated.
 */
@Component({
  selector: 'lib-custom-textarea',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CustomTextareaSettingsPanelComponent],
  templateUrl: './custom-textarea.component.html',
  styleUrl: './custom-textarea.component.css',
})
export class CustomTextareaComponent extends FxBaseComponent {
  public control = new FormControl<string>('');

  constructor(private cdr: ChangeDetectorRef, private wrapperService: FxBuilderWrapperService) {
    super(cdr);
    this.onInit.subscribe(() => {
      this._register(this.control);
      this.applyValidators();
    });
  }

  protected settings(): FxSetting[] {
    return [
      new FxStringSetting({ key: 'label', $title: 'Label', value: 'Label' }),
      new FxStringSetting({ key: 'placeholder', $title: 'Placeholder', value: '' }),
      new FxStringSetting({ key: 'helpText', $title: 'Help Text', value: '' }),
      new FxStringSetting({ key: 'rows', $title: 'Rows', value: 3 }),
      new FxStringSetting({ key: 'showInListing', $title: 'Show In Listing', value: false }),

      new FxToggleSetting({ key: 'isRequired', $title: 'Required', value: false }),
      new FxStringSetting({ key: 'requiredMessage', $title: 'Required Message', value: 'This field is required' }),
      new FxStringSetting({ key: 'minLength', $title: 'Min Length', value: '' }),
      new FxStringSetting({ key: 'minLengthMessage', $title: 'Min Length Message', value: 'Value is too short' }),
      new FxStringSetting({ key: 'maxLength', $title: 'Max Length', value: '' }),
      new FxStringSetting({ key: 'maxLengthMessage', $title: 'Max Length Message', value: 'Value is too long' }),
      new FxStringSetting({ key: 'pattern', $title: 'Pattern (Regex)', value: '' }),
      new FxStringSetting({ key: 'patternMessage', $title: 'Pattern Message', value: 'Invalid format' }),

      // Enable/disable gate: a condition list (privilege/supportingData/field rows, freely
      // combined via any/all) OR custom code — see shared/applicability.ts.
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

  get rows(): number {
    return Math.max(1, Number(this.setting('rows')) || 3);
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
    if (this.control.hasError('minlength')) return this.setting('minLengthMessage') || 'Value is too short';
    if (this.control.hasError('maxlength')) return this.setting('maxLengthMessage') || 'Value is too long';
    if (this.control.hasError('pattern')) return this.setting('patternMessage') || 'Invalid format';
    return null;
  }

  private applyValidators(): void {
    const validators = [];
    if (this.setting('isRequired') === true) validators.push(Validators.required);
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
