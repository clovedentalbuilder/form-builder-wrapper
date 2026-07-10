import { AbstractControl, FormGroup } from '@angular/forms';

/**
 * When a Section/Repeatable Group is hidden, its field(s) previously always
 * stayed registered in the form (so a value already captured wasn't lost the
 * moment access changed). This lets the builder opt OUT of that per
 * container: when "Include Form Control When Hidden" is off, the hidden
 * field(s) are actually removed from the FormGroup — so they carry no value
 * and no validation weight in the submission — and restored (same
 * AbstractControl instance, so value/validators aren't lost) the moment the
 * container becomes visible again.
 */
export class FieldControlIncludeController {
  private removed = new Map<string, AbstractControl>();

  constructor(
    private readonly getFormGroup: () => FormGroup | null | undefined,
    private readonly getControlNames: () => string[],
  ) {}

  /**
   * Call from ngDoCheck on EVERY tick with the desired inclusion state.
   * Deliberately NOT edge-triggered: a Section's fields are separate,
   * independently-initialized dynamic components, so one may register into
   * the FormGroup on a LATER tick than the one where the section first went
   * hidden. Reconciling every tick (each check is a handful of cheap
   * Map/FormGroup lookups) catches those late registrations instead of
   * silently missing them on a single one-shot attempt.
   */
  update(shouldInclude: boolean): void {
    const formGroup = this.getFormGroup();
    if (!formGroup) return;
    shouldInclude ? this.restore(formGroup) : this.exclude(formGroup);
  }

  private exclude(formGroup: FormGroup): void {
    for (const name of this.getControlNames()) {
      const ctrl = formGroup.get(name);
      if (ctrl) {
        this.removed.set(name, ctrl);
        formGroup.removeControl(name, { emitEvent: false });
      }
    }
  }

  private restore(formGroup: FormGroup): void {
    for (const name of this.getControlNames()) {
      const ctrl = this.removed.get(name);
      if (!ctrl) continue;
      if (!formGroup.contains(name)) {
        formGroup.addControl(name, ctrl, { emitEvent: false });
      }
      this.removed.delete(name);
    }
  }
}

/** Recursively collects every named field under a Section's dropped elements. */
export function collectFieldNames(elements: any[] | null | undefined): string[] {
  const out: string[] = [];
  for (const el of elements ?? []) {
    if (el?.name) out.push(el.name);
    if (Array.isArray(el?.elements)) out.push(...collectFieldNames(el.elements));
  }
  return out;
}
