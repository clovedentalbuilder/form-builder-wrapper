/**
 * Listing computation (package-level).
 *
 * Fields whose element carries a truthy `showInListing` flag are collected from
 * the form definition; at submit their submitted values are assembled into a
 * plain { key: value } object and emitted to the consumer.
 *
 * The flag is looked up (in order) on:
 *   - element.settings[] entry with key 'showInListing'
 *   - element.info.showInListing
 *   - element.showInListing
 */

export interface ListingField {
  name: string;
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

function isListingFlagged(el: any): boolean {
  return (
    isTruthy(settingValue(el, LISTING_KEY)) ||
    isTruthy(el?.info?.[LISTING_KEY]) ||
    isTruthy(el?.[LISTING_KEY])
  );
}

function labelOf(el: any): string {
  for (const key of LABEL_SETTING_KEYS) {
    const v = settingValue(el, key);
    if (v) return String(v);
  }
  return el?.name ?? '';
}

/** Collect every field flagged `showInListing`, recursing containers + sub-forms. */
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

/** Build a { key: value } listing object from a submitted raw value. */
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

/** Derive the listing directly from the form definition + submitted raw value. */
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
