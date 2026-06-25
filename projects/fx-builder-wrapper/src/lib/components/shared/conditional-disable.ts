import { AbstractControl } from '@angular/forms';
import { FxSetting, FxStringSetting } from '@instantsys-labs/fx';

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

/** Find a control by name in the field's own group, then the root form group. */
export function resolveSiblingControl(fxData: any, name: string): AbstractControl | null {
  if (!name) return null;
  const own = fxData?.$formGroup?.get(name);
  if (own) return own;
  const root = fxData?.$fxForm?.$this?.formGroup;
  return root?.get(name) ?? null;
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
