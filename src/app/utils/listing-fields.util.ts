/**
 * Listing-fields helper (framework-agnostic — copy/paste into the consumer app).
 *
 * Flow:
 *   1. Before rendering the form, call `getListingFields(fxForm)` and keep the
 *      result — these are the fields the builder marked with "Show in Listing".
 *   2. On submit, call `buildListing(form.getRawValue(), listingFields)` to get a
 *      plain { key: value } object containing only those fields' submitted values.
 *
 * A field is "in listing" when its element carries a truthy `showInListing`
 * flag. The flag is looked up (in order) on:
 *   - element.settings[] entry with key 'showInListing'
 *   - element.info.showInListing
 *   - element.showInListing
 * so it works regardless of how the flag is stored on the element.
 */

export interface ListingField {
  /** The form-control name (matches the key in form.getRawValue()). */
  name: string;
  /** A human label for display (falls back to name). */
  label: string;
}

const LISTING_KEY = 'showInListing';

/** Setting keys the various fx components use for their visible label. */
const LABEL_SETTING_KEYS = [
  'label',
  'select-label',
  'select-label-search',
  'hLabel',
  'summaryLabel',
  'groupTitle',
  'heading',
];

function settingValue(el: any, key: string): any {
  return el?.settings?.find((s: any) => s?.key === key)?.value;
}

function isTruthy(v: any): boolean {
  return v === true || v === 'true' || v === 1 || v === '1';
}

/** Whether an element is flagged to show in the listing. */
function isListingFlagged(el: any): boolean {
  return (
    isTruthy(settingValue(el, LISTING_KEY)) ||
    isTruthy(el?.info?.[LISTING_KEY]) ||
    isTruthy(el?.[LISTING_KEY])
  );
}

/** Best-effort human label for an element. */
function labelOf(el: any): string {
  for (const key of LABEL_SETTING_KEYS) {
    const v = settingValue(el, key);
    if (v) return String(v);
  }
  return el?.name ?? '';
}

/**
 * Walk the form definition and collect every field flagged `showInListing`.
 * Recurses into nested containers (elements[]) and sub-forms (forms[]).
 */
export function getListingFields(fxForm: any): ListingField[] {
  const out: ListingField[] = [];
  const seen = new Set<string>();

  const walk = (elements: any[]): void => {
    for (const el of elements ?? []) {
      if (el?.name && isListingFlagged(el) && !seen.has(el.name)) {
        seen.add(el.name);
        out.push({ name: el.name, label: labelOf(el) });
      }
      if (Array.isArray(el?.elements)) walk(el.elements);
      if (Array.isArray(el?.forms)) el.forms.forEach((f: any) => walk(f?.elements));
    }
  };

  walk(fxForm?.elements);
  return out;
}

/**
 * Build a { key: value } listing object from a submitted raw value.
 * `rawValue` is what `form.getRawValue()` returns.
 * `keyBy` picks whether the object is keyed by the field label (default) or name.
 */
export function buildListing(
  rawValue: any,
  fields: ListingField[],
  keyBy: 'label' | 'name' = 'label',
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const field of fields) {
    const key = keyBy === 'name' ? field.name : field.label || field.name;
    result[key] = findValue(rawValue, field.name);
  }
  return result;
}

/** Convenience: derive the listing directly from the form + raw value. */
export function buildListingFromForm(
  fxForm: any,
  rawValue: any,
  keyBy: 'label' | 'name' = 'label',
): Record<string, any> {
  return buildListing(rawValue, getListingFields(fxForm), keyBy);
}

/** Find a control value by name anywhere in a (possibly nested) raw value. */
function findValue(raw: any, name: string): any {
  if (raw == null || typeof raw !== 'object') return undefined;
  if (Object.prototype.hasOwnProperty.call(raw, name)) return raw[name];
  for (const value of Object.values(raw)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findValue(item, name);
        if (found !== undefined) return found;
      }
    } else if (value && typeof value === 'object') {
      const found = findValue(value, name);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}
