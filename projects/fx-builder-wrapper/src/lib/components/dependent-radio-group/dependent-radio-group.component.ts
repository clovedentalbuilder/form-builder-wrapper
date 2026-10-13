import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, DoCheck, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import {
  FxBaseComponent,
  FxMode,
  FxOptionSetting,
  FxSelectSetting,
  FxSetting,
  FxStringSetting,
  FxValidation,
} from '@instantsys-labs/fx';
import { Subject, takeUntil } from 'rxjs';
import { FxBuilderWrapperService } from '../../fx-builder-wrapper.service';
import {
  ApplicabilityContext,
  Condition,
  GateConfig,
  evaluateGate,
  isApplicable,
  isConditionConfigured,
  parseConditions,
} from '../shared/applicability';
import { resolveSiblingControl } from '../shared/conditional-disable';
import { findAdapterForValue } from '../fx-form-component/value-adapter-registry';
import { isSettingOn, yesNoOptions } from '../shared/yes-no-setting';
import { RadioItem, DependentRadioGroupSettingsPanelComponent } from './dependent-radio-group-settings-panel.component';

/**
 * Dependent Radio Group — fx's native `fx-radio` behaviour plus three condition
 * gates that let another field's live value drive this group.
 *
 * VALUE SHAPE (deliberately identical to FxRadioComponent): a single FormControl
 * holding the selected option's value, registered under `fxData.name` — a bare
 * string, e.g. `"mild"`. Radio is single-select, so there is one control, not one
 * per item. Items come from the `items` FxOptionSetting and `display` ('h' | 'v')
 * picks horizontal/vertical, exactly as the native component does.
 *
 * NO VALUE-ADAPTER ENTRY — for the same reason as custom-textbox / custom-textarea /
 * custom-copy-input: a bare primitive is already native-friendly, so cross-type
 * migration needs no wrapping or unwrapping. (That differs from the checkbox-group
 * shape this component replaced, where an adapter was impossible rather than merely
 * unnecessary.) The patch path still consults `findAdapterForValue()` so a field
 * switched over from a wrapper-shaped component keeps its selection.
 *
 * Validation is applied imperatively: `validations()` returns [] so this component
 * never touches fx's shared FxValidatorService statics — notably NOT
 * `FxValidatorService.required`, which the native radio uses and which is the source
 * of the cross-field validation-message bleed the wrapper service patches around.
 *
 * Gate evaluation runs from ngDoCheck — a sibling's value changes with no event this
 * component can subscribe to — and `disable`/`enable`/`reset`/re-validation only run
 * on an actual state change, the same idiom as ConditionalDisableController.update().
 *
 * The three gates (all condition lists over privilege / supportingData / another
 * field's value, see shared/applicability.ts):
 *   - Visibility → host `hidden` + `inert`.
 *   - Enable     → `disable()`/`enable()`, plus `resetOnDisable` clearing the
 *                  selection on a genuine enabled -> disabled edge.
 *   - Required   → OR-ed with the always-on `isRequired`. An EMPTY gate means "not
 *                  required", NOT applicability.ts's fail-open "not gated".
 */
@Component({
  selector: 'lib-dependent-radio-group',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DependentRadioGroupSettingsPanelComponent],
  templateUrl: './dependent-radio-group.component.html',
  styleUrl: './dependent-radio-group.component.css',
})
export class DependentRadioGroupComponent
  extends FxBaseComponent
  implements OnInit, AfterViewInit, DoCheck, OnDestroy
{
  /** Single-select: one control holding the chosen option's value. */
  public control = new FormControl<string>('', { nonNullable: true });

  /** The item list the template renders, mirrored from the `items` option setting. */
  public items: RadioItem[] = [];

  /** True while the Required gate (or `isRequired`) demands a selection. Drives the asterisk + validator. */
  public requiredNow = false;

  /** Same deferral dropdown-with-other / uploader / custom-copy-input use before patching. */
  private static readonly PATCH_DELAY_MS = 200;

  private destroy$ = new Subject<void>();
  private destroyed = false;

  /** Saved values from variables$, keyed by field name (fxData.name). */
  private valueMap = new Map<string, any>();
  private patchTimer: ReturnType<typeof setTimeout> | null = null;
  private patched = false;

  /** Last enable-gate result; null until the first evaluation. Resets only fire on a true -> false edge. */
  private lastEnabled: boolean | null = null;
  /** Signature of the item option list, so `*ngFor` identities survive every CD pass. */
  private itemsSignature: string | null = null;

  /**
   * Reads `requiredNow` rather than recomputing the gate on every validation run, so the
   * validator list is built once and only the flag flips.
   */
  private readonly requiredValidator: ValidatorFn = (control): ValidationErrors | null =>
    this.requiredNow ? Validators.required(control) : null;

  constructor(private cdr: ChangeDetectorRef, private wrapperService: FxBuilderWrapperService) {
    super(cdr);
    this.onInit.subscribe(() => {
      this.syncItems();
      this.control.addValidators(this.requiredValidator);
      this._register(this.control);
      this.refreshRequiredState();
    });
  }

  ngOnInit(): void {
    // Collect every field's stored value into a map keyed by field name. Mirrors
    // dropdown-with-other's dropdownMap and custom-copy-input's valueMap.
    this.wrapperService.variables$.pipe(takeUntil(this.destroy$)).subscribe((variables: any) => {
      if (!variables) return;
      for (const [key, value] of Object.entries(variables) as [string, any][]) {
        this.valueMap.set(key, value);
      }
      // variables$ can emit after ngAfterViewInit's window has already passed, so try
      // to patch on every emission too; applyPatch() only ever applies once.
      this.applyPatch();
    });
  }

  ngAfterViewInit(): void {
    this.patchTimer = setTimeout(() => {
      this.patchTimer = null;
      this.applyPatch();
    }, DependentRadioGroupComponent.PATCH_DELAY_MS);
  }

  /**
   * Gate evaluation point — a sibling field's value changes with no event this
   * component can subscribe to, so the family re-evaluates per change-detection
   * pass and acts only on a transition.
   */
  ngDoCheck(): void {
    this.syncItems();
    if (this.isEditing) return;

    const enabled = this.applicability.enabled;
    if (enabled !== this.lastEnabled) {
      const wasEnabled = this.lastEnabled;
      this.lastEnabled = enabled;
      if (enabled) {
        this.control.enable({ emitEvent: false });
      } else {
        // Only on a genuine enabled -> disabled edge: clearing on the very first
        // evaluation would wipe a legitimately saved selection before it is patched in.
        if (wasEnabled === true && isSettingOn(this.setting('resetOnDisable'))) {
          this.control.reset('', { emitEvent: false });
          // The clear is final: block the pending applyPatch() (and any later variables$
          // emission) from restoring the selection this gate just removed.
          this.patched = true;
        }
        this.control.disable({ emitEvent: false });
      }
    }

    this.refreshRequiredState();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.patchTimer !== null) {
      clearTimeout(this.patchTimer);
      this.patchTimer = null;
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Template helper for a Yes/No setting. Templates must NOT test `setting(key)`
   * directly — it holds the string 'false', which is truthy.
   */
  public isOn(key: string): boolean {
    return isSettingOn(this.setting(key));
  }

  protected settings(): FxSetting[] {
    return [
      // No default: an '' default is what makes the label clearable. A truthy default
      // would be restored by deepMergeObjects every time the user saved it blank.
      new FxStringSetting({ key: 'label', $title: 'Label', value: '' }),
      new FxStringSetting({ key: 'helpText', $title: 'Help Text', value: '' }),
      new FxSelectSetting({ key: 'showInListing', $title: 'Show In Listing', value: 'false' }, yesNoOptions()),

      // Same two keys, defaults and option lists as fx's native fx-radio.
      new FxSelectSetting(
        {
          key: 'display',
          $title: 'Display Style',
          value: 'v',
          $description: 'Choose display style `HORIZONTAL` or `VERTICAL`',
        },
        [
          { option: 'Horizontal', value: 'h' },
          { option: 'Vertical', value: 'v' },
        ],
      ),
      new FxOptionSetting({ key: 'items', $title: 'Items', value: '', $description: 'Items' }, [
        { option: 'item 1', value: 'item1' },
        { option: 'item 2', value: 'item2' },
      ]),

      new FxSelectSetting({ key: 'isRequired', $title: 'Always Required', value: 'false' }, yesNoOptions()),
      new FxStringSetting({
        key: 'requiredMessage',
        $title: 'Required Message',
        value: 'Please select an option',
      }),
      new FxSelectSetting({ key: 'resetOnDisable', $title: 'Clear Selection When Disabled', value: 'true' }, yesNoOptions()),

      // Visibility gate: condition list (privilege / supportingData / field rows combined
      // by per-row AND/OR) or custom code — see shared/applicability.ts.
      new FxSelectSetting({ key: 'visibilityUseCode', $title: 'Visibility: Use Custom Code', value: 'false' }, yesNoOptions()),
      new FxStringSetting({ key: 'visibilityConditions', $title: 'Visibility Conditions', value: '[]' }),
      new FxStringSetting({ key: 'visibilityConditionsMatch', $title: 'Visibility Conditions Match', value: 'any' }),
      new FxStringSetting({ key: 'visibilityCode', $title: 'Visibility Code', value: '' }),

      // Enable/disable gate: same shape as visibility.
      new FxSelectSetting({ key: 'enableUseCode', $title: 'Enable: Use Custom Code', value: 'false' }, yesNoOptions()),
      new FxStringSetting({ key: 'enableConditions', $title: 'Enable Conditions', value: '[]' }),
      new FxStringSetting({ key: 'enableConditionsMatch', $title: 'Enable Conditions Match', value: 'any' }),
      new FxStringSetting({ key: 'enableCode', $title: 'Enable Code', value: '' }),

      // Required gate: same shape again, but an EMPTY list means "not required"
      // rather than applicability.ts's fail-open "not gated" — see requiredByCondition().
      new FxSelectSetting({ key: 'requiredUseCode', $title: 'Required: Use Custom Code', value: 'false' }, yesNoOptions()),
      new FxStringSetting({ key: 'requiredConditions', $title: 'Required Conditions', value: '[]' }),
      new FxStringSetting({ key: 'requiredConditionsMatch', $title: 'Required Conditions Match', value: 'any' }),
      new FxStringSetting({ key: 'requiredCode', $title: 'Required Code', value: '' }),
    ];
  }

  protected validations(): FxValidation[] {
    return [];
  }

  get isEditing(): boolean {
    return this.fxData?.$fxForm?.$mode !== FxMode.VIEW;
  }

  /** Horizontal lays out in four columns, exactly as fx's native radio. */
  get gridClass(): string {
    return this.setting('display') === 'h' ? 'grid-cols-4' : '';
  }

  /**
   * Radio inputs only behave as one group when they share a `name`. fxData.name is
   * unique per field, so two radio groups on the same form never cross-select.
   */
  get groupName(): string {
    return `drg-${this.fxData?.id || this.fxData?.name || 'group'}`;
  }

  /** Runtime-only: always visible in the builder. */
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

  get errorMessage(): string | null {
    if (!this.control.touched || this.control.valid) return null;
    if (this.control.hasError('required')) {
      return this.setting('requiredMessage') || 'Please select an option';
    }
    return null;
  }

  onSettingsChanged(_config: any): void {
    this.syncItems();
    this.refreshRequiredState();
    this.safeDetect();
  }

  // ── Items ────────────────────────────────────────────────────────────────

  /**
   * Mirrors the `items` option setting into `this.items`. Guarded by a signature so
   * `*ngFor` identities survive every change-detection pass; only a real edit rebuilds.
   *
   * Unlike the checkbox-group shape, item values are NOT control names here — there is
   * one control for the whole group — so renaming an item only orphans that one stored
   * selection rather than restructuring the submitted value.
   */
  private syncItems(): void {
    const options = this.readItemOptions();
    const signature = JSON.stringify(options.map((o) => [o.option, o.value]));
    if (signature === this.itemsSignature) return;
    this.itemsSignature = signature;
    this.items = options;
  }

  /** Item list from the `items` FxOptionSetting — blank and duplicate values dropped. */
  private readItemOptions(): RadioItem[] {
    const setting = this.settingObj('items') as FxOptionSetting | null;
    const options: any[] = Array.isArray(setting?.options) ? setting!.options : [];
    const seen = new Set<string>();
    const out: RadioItem[] = [];
    for (const raw of options) {
      const value = String(raw?.value ?? '').trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      out.push({ option: String(raw?.option ?? value), value });
    }
    return out;
  }

  // ── Gates ────────────────────────────────────────────────────────────────

  /** Privileges + supportingData + a resolver for another field's live value. */
  private get gateContext(): ApplicabilityContext {
    return {
      privileges: this.wrapperService.privileges,
      supportingData: this.wrapperService.supportingData,
      resolveField: (name) => resolveSiblingControl(this.fxData, name)?.value,
    };
  }

  /** Computes { visible, enabled } from privileges + supportingData + another field's live value. */
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
    return isApplicable({ visibility, enable }, this.gateContext);
  }

  /**
   * The Required gate. `evaluateGate` returns true for an EMPTY gate ("not gated"),
   * which is the right fail-open for visibility/enable but would make every field
   * required here — so an unconfigured gate is short-circuited to false first.
   */
  private get requiredByCondition(): boolean {
    const useCode = isSettingOn(this.setting('requiredUseCode'));
    const code: string = this.setting('requiredCode');
    const conditions: Condition[] = parseConditions(this.setting('requiredConditions'));
    if (useCode) {
      if (!String(code ?? '').trim()) return false;
    } else if (!conditions.some(isConditionConfigured)) {
      return false;
    }
    return evaluateGate(
      { useCode, code, conditions, conditionsMatch: this.setting('requiredConditionsMatch') },
      this.gateContext,
    );
  }

  /**
   * Re-computes `requiredNow` and re-runs validation only when it flips.
   *
   * A hidden field is never required: the gate can hide it while the user has no way
   * to satisfy it, which would block submit with an invisible error. A disabled
   * control is already skipped by Angular (DISABLED controls don't validate).
   */
  private refreshRequiredState(): void {
    const required =
      !this.isEditing && !this.fieldHidden && (isSettingOn(this.setting('isRequired')) || this.requiredByCondition);
    if (required === this.requiredNow) return;
    this.requiredNow = required;
    this.control.updateValueAndValidity({ emitEvent: false });
  }

  // ── Saved-value patching ─────────────────────────────────────────────────

  /**
   * Patches this field's saved value in from valueMap, keyed by its own fxData.name.
   * Applies at most once and never over a user edit.
   *
   * `_register()` patches `fxData.value`, which is not populated when `init()` runs, so
   * the saved value has to come from variables$ instead — see component-reference.md,
   * "Patching a custom component's saved value".
   */
  private applyPatch(): void {
    if (this.destroyed || this.patched || this.control.dirty) return;

    const key = this.fxData?.name;
    if (!key || !this.valueMap.has(key)) return;

    const selected = this.toSelectedValue(this.valueMap.get(key));
    if (selected === null) return;

    this.control.setValue(selected, { emitEvent: false });
    this.patched = true;
    this.safeDetect();
  }

  /**
   * Normalises a stored value to the single selected option value; null means
   * "nothing patchable", which leaves the control untouched.
   *
   * A wrapper object left by a different component type at this field name arrives raw
   * (the renderer only re-shapes values for selectors that have a value-adapter entry,
   * and this one deliberately has none), so it is unwrapped through the registry rather
   * than by hand-rolling other components' shape knowledge here. An array or
   * comma-list — e.g. from a multi-select — collapses to its first entry, since radio
   * can only hold one.
   */
  private toSelectedValue(stored: any): string | null {
    if (stored === null || stored === undefined) return null;
    if (typeof stored === 'string') return stored.includes(',') ? this.firstOf(stored.split(',')) : stored;
    if (typeof stored === 'number' || typeof stored === 'boolean') return String(stored);
    if (Array.isArray(stored)) return this.firstOf(stored);
    if (typeof stored !== 'object') return null;

    const adapter = findAdapterForValue(stored);
    if (!adapter) return null;
    const primitive = adapter.extractPrimitive(stored);
    if (primitive === null || primitive === undefined) return '';
    if (Array.isArray(primitive)) return this.firstOf(primitive);
    if (typeof primitive === 'object') return null;
    return String(primitive);
  }

  /** First non-empty entry of a list, as a string; '' when the list holds nothing usable. */
  private firstOf(list: any[]): string {
    for (const entry of list) {
      const value = String(entry ?? '').trim();
      if (value !== '') return value;
    }
    return '';
  }

  private safeDetect(): void {
    if (this.destroyed) return;
    this.detectChanges();
  }
}
