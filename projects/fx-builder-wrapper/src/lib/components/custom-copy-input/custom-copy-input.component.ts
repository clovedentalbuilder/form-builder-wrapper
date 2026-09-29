import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
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
import { CustomCopyInputSettingsPanelComponent } from './custom-copy-input-settings-panel.component';
import { GateConfig, isApplicable, parseConditions } from '../shared/applicability';
import { resolveSiblingControl } from '../shared/conditional-disable';
import { isSettingOn, yesNoOptions } from '../shared/yes-no-setting';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { Subject, takeUntil } from 'rxjs';
import { findAdapterForValue } from '../fx-form-component/value-adapter-registry';

/**
 * Input with Copy: a self-contained single-line text field (own FormControl, own
 * validation UI) modelled on lib-custom-password, with a copy-to-clipboard icon
 * button rendered inside the input on the right. Its validators never touch the
 * fx library's shared FxValidatorService statics — sidesteps the cross-field
 * validation-message bleed native fields are prone to.
 *
 * Value shape: a primitive string (FormControl<string>) stored directly under
 * fxData.name — identical to custom-textbox/custom-password, so no value-adapter
 * entry is needed (a bare string is already native-friendly for cross-type
 * migration/unwrap).
 *
 * Value patching follows the same mechanism as dropdown-with-other / uploader /
 * voucher-items. _register() wires the control into the parent FormGroup (so edits
 * propagate back out) and patches fxData.value, but fxData.value is not yet
 * populated when init() fires, so it cannot be relied on for the saved value.
 * Instead ngOnInit() subscribes to the wrapper's variables$ and collects every
 * field's value into valueMap keyed by field name, then ngAfterViewInit() looks up
 * this field's own fxData.name and patches the control. The renderer passes a
 * custom field's value through untouched (see architecture.md, "Value flow at
 * runtime"), so a wrapper object left behind by a different component type at this
 * field name is unwrapped here via findAdapterForValue() — the value-adapter
 * registry stays the single home for value-shape logic.
 *
 * The copy button is view-only chrome: it reads this.control.value at click time
 * (never a cached copy) so it always yields the latest text, and never mutates
 * the stored value. It no-ops on an empty value and when the Clipboard API is
 * unavailable (non-secure context / permission denied).
 *
 * A successful copy gives two pieces of feedback: the icon flips to a tick for
 * COPIED_FEEDBACK_MS, and a PrimeNG success toast shows the configurable
 * 'copiedMessage' setting (default 'Copied to clipboard'). MessageService is
 * provided at component level so each field instance owns its own toast outlet --
 * the same pattern the uploader and dynamic-table use.
 *
 * Settings (own dialog, same chrome pattern as custom-password):
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
  selector: 'lib-custom-copy-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToastModule, CustomCopyInputSettingsPanelComponent],
  providers: [MessageService],
  templateUrl: './custom-copy-input.component.html',
  styleUrl: './custom-copy-input.component.css',
})
export class CustomCopyInputComponent extends FxBaseComponent implements OnInit, AfterViewInit, OnDestroy {
  public control = new FormControl<string>('');

  /** View-only: true for COPIED_FEEDBACK_MS after a successful copy — flips the icon to a tick. */
  public copied = false;

  private static readonly COPIED_FEEDBACK_MS = 1500;
  private static readonly TOAST_LIFE_MS = 2000;
  /** Same deferral dropdown-with-other and the uploader use before patching. */
  private static readonly PATCH_DELAY_MS = 200;
  private copiedTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  private destroy$ = new Subject<void>();
  /** Saved values from variables$, keyed by field name (fxData.name). */
  private valueMap = new Map<string, string>();
  private patchTimer: ReturnType<typeof setTimeout> | null = null;
  private patched = false;

  constructor(
    private cdr: ChangeDetectorRef,
    private wrapperService: FxBuilderWrapperService,
    private messageService: MessageService,
  ) {
    super(cdr);
    this.onInit.subscribe(() => {
      this._register(this.control);
      this.applyValidators();
    });
  }

  ngOnInit(): void {
    // Collect every field's stored value into a map keyed by field name. Mirrors
    // dropdown-with-other's dropdownMap and the uploader's uploadedFilesMap.
    this.wrapperService.variables$
      .pipe(takeUntil(this.destroy$))
      .subscribe((variables: any) => {
        if (!variables) return;
        for (const [key, value] of Object.entries(variables) as [string, any][]) {
          const text = this.toText(value);
          if (text !== null) this.valueMap.set(key, text);
        }
        // variables$ can emit after ngAfterViewInit's window has already passed,
        // so try to patch on every emission too; applyPatch() only ever applies once.
        this.applyPatch();
      });
  }

  ngAfterViewInit(): void {
    this.patchTimer = setTimeout(() => {
      this.patchTimer = null;
      this.applyPatch();
    }, CustomCopyInputComponent.PATCH_DELAY_MS);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.clearCopiedTimer();
    if (this.patchTimer !== null) {
      clearTimeout(this.patchTimer);
      this.patchTimer = null;
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Patches this field's saved value in from valueMap, keyed by its own fxData.name.
   * Applies at most once, and never over the top of something the user has typed.
   */
  private applyPatch(): void {
    if (this.destroyed || this.patched || this.control.dirty) return;

    const key = this.fxData?.name;
    if (!key || !this.valueMap.has(key)) return;

    this.control.patchValue(this.valueMap.get(key) ?? '', { emitEvent: false });
    this.control.updateValueAndValidity({ emitEvent: false });
    this.patched = true;
    this.safeDetect();
  }

  /**
   * Normalises a stored value to the plain string this field holds; null means
   * "nothing patchable", which leaves the control untouched.
   *
   * A wrapper object (the field previously used a component with a different value
   * shape, e.g. { searchSelectedOption } or { selectedOption, otherInput }) arrives
   * raw, because the renderer only re-shapes values for selectors that have a
   * value-adapter entry and this one deliberately has none. So unwrap it through the
   * registry rather than reimplementing any shape knowledge here.
   */
  private toText(value: any): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);

    const adapter = findAdapterForValue(value);
    if (!adapter) return null;

    const primitive = adapter.extractPrimitive(value);
    if (primitive === null || primitive === undefined) return '';
    if (Array.isArray(primitive)) return primitive.length ? String(primitive[0] ?? '') : '';
    if (typeof primitive === 'object') return '';
    return String(primitive);
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
      new FxStringSetting({ key: 'label', $title: 'Label', value: 'Enter URL' }),
      new FxStringSetting({ key: 'placeholder', $title: 'Placeholder', value: 'enter URL here' }),
      new FxStringSetting({ key: 'helpText', $title: 'Help Text', value: '' }),
      new FxStringSetting({ key: 'copiedMessage', $title: 'Copy Toast Message', value: 'Copied to clipboard' }),
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

  /**
   * Copies the field's CURRENT value to the clipboard. Reads this.control.value
   * at click time so it is never stale. Silently no-ops on an empty value or
   * when the Clipboard API is unavailable/denied (e.g. a non-secure context).
   */
  public async copyValue(): Promise<void> {
    if (this.fieldDisabled) return;

    const value = this.control.value;
    if (value === null || value === undefined || value === '') return;

    const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (!clipboard || typeof clipboard.writeText !== 'function') return;

    try {
      await clipboard.writeText(String(value));
    } catch {
      // Permission denied or insecure context — nothing to show the user, stay silent.
      return;
    }

    this.flagCopied();
    this.showCopiedToast();
  }

  /**
   * Success toast for a completed copy. Text is the configurable 'copiedMessage'
   * setting, falling back to the default when it has been blanked out.
   */
  private showCopiedToast(): void {
    if (this.destroyed) return;
    const configured = (this.setting('copiedMessage') ?? '').toString().trim();
    this.messageService.add({
      severity: 'success',
      summary: configured || 'Copied to clipboard',
      life: CustomCopyInputComponent.TOAST_LIFE_MS,
    });
  }

  /** Shows the tick icon briefly, then reverts. */
  private flagCopied(): void {
    if (this.destroyed) return;
    this.clearCopiedTimer();
    this.copied = true;
    this.safeDetect();
    this.copiedTimer = setTimeout(() => {
      this.copiedTimer = null;
      this.copied = false;
      this.safeDetect();
    }, CustomCopyInputComponent.COPIED_FEEDBACK_MS);
  }

  private clearCopiedTimer(): void {
    if (this.copiedTimer !== null) {
      clearTimeout(this.copiedTimer);
      this.copiedTimer = null;
    }
  }

  private safeDetect(): void {
    if (!this.destroyed) this.detectChanges();
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
