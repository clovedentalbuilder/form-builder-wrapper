import { AbstractControl } from '@angular/forms';
import { FxSetting, FxStringSetting } from '@instantsys-labs/fx';
import { findAdapterForValue } from '../fx-form-component/value-adapter-registry';

/**
 * Shared "conditional disable" behaviour: disable a field's control whenever a
 * watched sibling control's value matches a configured value.
 *
 * Used by lib-toggle-switch and lib-dropdown-with-search. Settings keys:
 *   disableWhenControl — name of the form control to watch
 *   disableWhenValue   — value(s) that trigger the disable (comma-separated)
 */

/** Settings to spread into a component's settings() so the rule is configurable. */
export function conditionalDisableSettings(): FxSetting[] {
  return [
    new FxStringSetting({
      key: 'disableWhenControl',
      $title: 'Disable When — Control Name',
      value: '',
      $description: 'Form control name to watch; when its value matches, this field is disabled.',
    }),
    new FxStringSetting({
      key: 'disableWhenValue',
      $title: 'Disable When — Value(s)',
      value: '',
      $description: 'Disable this field when the watched control equals this value. Comma-separate for multiple.',
    }),
  ];
}

/**
 * Find a control by name in the field's own group, then the root form group.
 *
 * Every caller here (Visibility/Enable "Other Field's Value" conditions via
 * shared/applicability.ts's resolveField, and this file's own
 * ConditionalDisableController) only ever reads the result's `.value` — so
 * some custom components (dropdown-with-search, multiselect-dropdown,
 * duplicate-check-input, checkbox, date-picker, ...) register a whole
 * sub-FormGroup under the field's name instead of a plain FormControl,
 * meaning `.value` is a wrapper object like `{ searchSelectedOption: 'yes' }`
 * rather than the primitive a condition/rule is written against. When the
 * resolved control's value matches a known COMPONENT_VALUE_ADAPTERS shape
 * (the same registry FxFormWrapperComponent uses for save/load migration),
 * this returns a lightweight `{ value }` stand-in exposing the extracted
 * primitive instead of the real control — transparent to every `?.value`
 * call site, and requires no changes to individual component files.
 */
export function resolveSiblingControl(fxData: any, name: string): AbstractControl | { value: any } | null {
  if (!name) return null;
  const own = fxData?.$formGroup?.get(name);
  const root = fxData?.$fxForm?.$this?.formGroup;
  const control = own ?? root?.get(name) ?? null;
  if (!control) return null;
  const adapter = findAdapterForValue(control.value);
  return adapter ? { value: adapter.extractPrimitive(control.value) } : control;
}

function looseEq(a: any, target: string): boolean {
  if (a === null || a === undefined) return false;
  if (typeof a === 'boolean') return String(a).toLowerCase() === target.toLowerCase();
  return String(a).trim().toLowerCase() === target.toLowerCase();
}

export class ConditionalDisableController {
  private last: boolean | null = null;

  constructor(
    private readonly getFxData: () => any,
    private readonly getTarget: () => AbstractControl | null | undefined,
    private readonly getSetting: (key: string) => any,
  ) {}

  /** Call from ngDoCheck. Toggles the target control's disabled state only on
   *  an actual change, and returns the current disabled state for view binding. */
  update(): boolean {
    const should = this.compute();
    const ctrl = this.getTarget();
    if (ctrl && should !== this.last) {
      this.last = should;
      if (should) ctrl.disable({ emitEvent: false });
      else ctrl.enable({ emitEvent: false });
    }
    return should;
  }

  private compute(): boolean {
    const name = String(this.getSetting('disableWhenControl') ?? '').trim();
    if (!name) return false;
    const watched = resolveSiblingControl(this.getFxData(), name);
    if (!watched) return false;
    const targets = String(this.getSetting('disableWhenValue') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '');
    return targets.length ? targets.some((t) => looseEq(watched.value, t)) : false;
  }
}
