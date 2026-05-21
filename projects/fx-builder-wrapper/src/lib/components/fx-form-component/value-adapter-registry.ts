/**
 * Registry of backward-compatible value adapters for custom form components.
 *
 * When a form field changes its component type between saves (e.g. from
 * lib-radio-button-with-other to a native input, or vice-versa), the stored
 * value may not match what the new component expects. This registry drives
 * automatic transformation in FxFormWrapperComponent without touching
 * individual component files.
 *
 * Each entry covers one custom-component selector and defines:
 *   identify          — detects whether a value was stored by this component type.
 *   extractPrimitive  — converts the stored object to a flat native-friendly value.
 *   resolveWrapOpts   — (optional) reads the fxForm element definition and returns
 *                       runtime options that wrapFromPrimitive needs (e.g. whether
 *                       the component is configured to show an "other" input).
 *   wrapFromPrimitive — converts a flat value to the shape this component expects.
 *                       Must never produce a shape that would save a wrong/garbage
 *                       value — invalid inputs must produce the component's empty state.
 *
 * To add support for a new component, append an entry below.
 * The order of entries matters for findAdapterForValue: place more-specific
 * identify rules before less-specific ones.
 */

export interface ComponentValueAdapter {
  identify(value: unknown): boolean;
  extractPrimitive(value: any): any;
  /** Derive runtime wrap options from the fxForm element definition (settings, etc.). */
  resolveWrapOpts?(element: any): Record<string, any>;
  wrapFromPrimitive(primitive: any, opts?: Record<string, any>): any;
}

// ── Shared helpers ──────────────────────────────────────────────────────────

const isObj = (v: unknown): v is Record<string, any> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

/** Returns true only when v can be parsed as a real calendar date. */
const isValidDate = (v: any): boolean => {
  if (v == null) return false;
  const s = String(v).trim();
  if (s.length === 0) return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
};

/** Converts any value to a non-empty string array, or returns [] for null/empty. */
const toStringArray = (v: any): string[] => {
  if (Array.isArray(v)) return v;
  if (v == null || v === '') return [];
  return [String(v)];
};

// ── Adapter map ─────────────────────────────────────────────────────────────

export const COMPONENT_VALUE_ADAPTERS: Readonly<Record<string, ComponentValueAdapter>> = {

  // ── { selectedRadioOption: string, otherInput: string } ──────────────────
  // Key matches the registration key used in fxWrapperService ('radio-button-with-other'),
  // which is what fxForm.elements[].selector stores — NOT the Angular component selector.
  'radio-button-with-other': {
    identify: (v) => isObj(v) && 'selectedRadioOption' in v,

    extractPrimitive: (v: any) => {
      const sel: string = v.selectedRadioOption ?? '';
      return sel === 'other' && v.otherInput ? v.otherInput : sel;
    },

    wrapFromPrimitive: (v: any) => {
      // null / undefined → nothing selected, clean slate
      if (v == null || v === '') return { selectedRadioOption: '', otherInput: '' };
      // Consistent with the component's own backward-compat: plain strings always
      // land in the "other" input so the value is never silently discarded.
      return { selectedRadioOption: 'other', otherInput: String(v) };
    },
  },

  // ── { selectedOption: string, otherInput: string } ───────────────────────
  // dropdown-with-other always appends an "other" option at runtime (hardcoded),
  // so no resolveWrapOpts needed — allowOther is always implicitly true.
  'dropdown-with-other': {
    identify: (v) => isObj(v) && 'selectedOption' in v && !('selectedRadioOption' in v),

    extractPrimitive: (v: any) => {
      const sel: string = v.selectedOption ?? '';
      return sel === 'other' && v.otherInput ? v.otherInput : sel;
    },

    wrapFromPrimitive: (v: any) => {
      if (v == null) return { selectedOption: '', otherInput: '' };
      return { selectedOption: 'other', otherInput: String(v) };
    },
  },

  // ── { selectedCheckboxOption: string[], otherInput: string, textareaValues: {} } ─
  'lib-checkbox-group': {
    identify: (v) => isObj(v) && 'selectedCheckboxOption' in v,
    extractPrimitive: (v: any) => v.selectedCheckboxOption ?? [],

    wrapFromPrimitive: (v: any) => ({
      // toStringArray handles: null→[], ''→[], 'item'→['item'], ['a','b']→['a','b']
      selectedCheckboxOption: toStringArray(v),
      otherInput: '',
      textareaValues: {},
    }),
  },

  // ── { multipleSelectedOption: string[] } ─────────────────────────────────
  'lib-multiselect-dropdown': {
    identify: (v) => isObj(v) && 'multipleSelectedOption' in v,
    extractPrimitive: (v: any) => v.multipleSelectedOption ?? [],

    wrapFromPrimitive: (v: any) => ({
      multipleSelectedOption: toStringArray(v),
    }),
  },

  // ── { confirmation: string, remarks: string, ... } ───────────────────────
  'radio-group-custom': {
    identify: (v) => isObj(v) && 'confirmation' in v && 'remarks' in v,
    extractPrimitive: (v: any) => v.confirmation ?? '',

    wrapFromPrimitive: (v: any) => ({
      confirmation: v != null ? String(v) : '',
      remarks: '',
      valueToShowTextArea: '',
      label: '',
    }),
  },

  // ── { checked: boolean, ... } ────────────────────────────────────────────
  'lib-checkbox': {
    identify: (v) =>
      isObj(v) &&
      'checked' in v &&
      !('selectedRadioOption' in v) &&
      !('selectedCheckboxOption' in v) &&
      !('confirmation' in v),

    extractPrimitive: (v: any) => {
      if (v.useUserDefinedMapping) {
        return v.checked ? (v.checkedValue ?? true) : (v.uncheckedValue ?? false);
      }
      // ?? false: guard against stored { checked: undefined }
      return v.checked ?? false;
    },

    wrapFromPrimitive: (v: any) => ({
      checked: v === true || v === 'true',
    }),
  },

  // ── { date: string } ─────────────────────────────────────────────────────
  'lib-date-picker': {
    identify: (v) =>
      isObj(v) &&
      'date' in v &&
      !('selectedRadioOption' in v) &&
      !('checked' in v) &&
      !('selectedOption' in v) &&
      !('multipleSelectedOption' in v) &&
      !('selectedCheckboxOption' in v) &&
      !('confirmation' in v) &&
      !('uploadedFiles' in v),

    extractPrimitive: (v: any) => v.date ?? '',

    wrapFromPrimitive: (v: any) => {
      // Only preserve the string when it actually parses as a real date.
      // '896727y28y4', 'null', numbers, random text → empty so the date picker
      // shows blank rather than patching an invalid/garbage value.
      return { date: isValidDate(v) ? String(v) : '' };
    },
  },

  // ── { uploadedFiles: any[], deletedFiles: any[] } ────────────────────────
  'fx-uploader': {
    identify: (v) => isObj(v) && 'uploadedFiles' in v,
    extractPrimitive: (v: any) => v.uploadedFiles ?? [],

    wrapFromPrimitive: (v: any) => ({
      uploadedFiles: Array.isArray(v) ? v : [],
      deletedFiles: [],
    }),
  },

};

/** Returns the first adapter whose identify() returns true for the given value. */
export function findAdapterForValue(value: unknown): ComponentValueAdapter | undefined {
  for (const adapter of Object.values(COMPONENT_VALUE_ADAPTERS)) {
    if (adapter.identify(value)) return adapter;
  }
  return undefined;
}
