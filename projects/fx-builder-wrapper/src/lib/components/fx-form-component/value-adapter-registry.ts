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
 * Option validation (checking whether a value is a valid option) is intentionally
 * NOT done here. Components that load options (lib-checkbox-group,
 * lib-multiselect-dropdown) validate via revalidateSelection() after their options
 * load, so the API is never called twice and the check always runs against live data.
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

    wrapFromPrimitive: (v: any, opts?: Record<string, any>) => {
      // Array input (from checkbox-group / multiselect): take first element only
      const scalar = Array.isArray(v) ? (v[0] ?? '') : v;
      if (scalar == null || scalar === '') return { selectedRadioOption: '', otherInput: '' };
      // From another option-based component: place value as the selected option so
      // the component can validate it against its own option list after loading.
      // revalidateSelection() will clear it to empty if the option doesn't exist.
      if (opts?.['fromOptionComponent']) {
        return { selectedRadioOption: String(scalar), otherInput: '' };
      }
      // From a native / free-text field: always land in the "other" input so the
      // user-typed text is never silently discarded.
      return { selectedRadioOption: 'other', otherInput: String(scalar) };
    },
  },

  // ── { selectedOption: string, otherInput: string } ───────────────────────
  'dropdown-with-other': {
    identify: (v) => isObj(v) && 'selectedOption' in v && !('selectedRadioOption' in v),

    extractPrimitive: (v: any) => {
      const sel: string = v.selectedOption ?? '';
      return sel === 'other' && v.otherInput ? v.otherInput : sel;
    },

    wrapFromPrimitive: (v: any, opts?: Record<string, any>) => {
      const scalar = Array.isArray(v) ? (v[0] ?? '') : v;
      if (scalar == null || scalar === '') return { selectedOption: '', otherInput: '' };
      if (opts?.['fromOptionComponent']) {
        return { selectedOption: String(scalar), otherInput: '' };
      }
      return { selectedOption: 'other', otherInput: String(scalar) };
    },
  },

  // ── { selectedCheckboxOption: string[], otherInput: string, textareaValues: {} } ─
  // Option validation happens inside the component (revalidateSelection) after
  // options load, so no resolveWrapOpts is needed here.
  'lib-checkbox-group': {
    identify: (v) => isObj(v) && 'selectedCheckboxOption' in v,
    extractPrimitive: (v: any) => v.selectedCheckboxOption ?? [],

    wrapFromPrimitive: (v: any) => {
      const candidates: string[] = Array.isArray(v)
        ? v
        : (v != null && v !== '' ? [String(v)] : []);
      return { selectedCheckboxOption: candidates, otherInput: '', textareaValues: {} };
    },
  },

  // ── { multipleSelectedOption: string[] } ─────────────────────────────────
  // Option validation happens inside the component (revalidateSelection) after
  // options load, so no resolveWrapOpts is needed here.
  'lib-multiselect-dropdown': {
    identify: (v) => isObj(v) && 'multipleSelectedOption' in v,
    extractPrimitive: (v: any) => v.multipleSelectedOption ?? [],

    wrapFromPrimitive: (v: any) => {
      const candidates: string[] = Array.isArray(v)
        ? v
        : (v != null && v !== '' ? [String(v)] : []);
      return { multipleSelectedOption: candidates };
    },
  },

  // ── { confirmation: string, remarks: string, ... } ───────────────────────
  'radio-group-custom': {
    identify: (v) => isObj(v) && 'confirmation' in v && 'remarks' in v,
    extractPrimitive: (v: any) => v.confirmation ?? '',

    wrapFromPrimitive: (v: any) => {
      // Multiple-value source: take the first element only — confirmation accepts one value.
      const scalar = Array.isArray(v) ? (v[0] ?? '') : v;
      return {
        confirmation: scalar != null ? String(scalar) : '',
        remarks: '',
        valueToShowTextArea: '',
        label: '',
      };
    },
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

    wrapFromPrimitive: (v: any) => {
      // Multiple-value source: take the first element only — checkbox accepts one boolean.
      const scalar = Array.isArray(v) ? (v[0] ?? '') : v;
      return { checked: scalar === true || scalar === 'true' };
    },
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
      // Multiple-value source: take the first element only — date picker accepts one date.
      // Only preserve the string when it actually parses as a real date.
      const scalar = Array.isArray(v) ? (v[0] ?? '') : v;
      return { date: isValidDate(scalar) ? String(scalar) : '' };
    },
  },

  // ── { searchSelectedOption: string } ─────────────────────────────────────
  'lib-dropdown-with-search': {
    identify: (v) =>
      isObj(v) &&
      'searchSelectedOption' in v &&
      !('selectedOption' in v) &&
      !('selectedRadioOption' in v) &&
      !('multipleSelectedOption' in v) &&
      !('selectedCheckboxOption' in v),

    extractPrimitive: (v: any) => v.searchSelectedOption ?? '',

    wrapFromPrimitive: (v: any, opts?: Record<string, any>) => {
      // Array from checkbox-group/multiselect: take first element
      const scalar = Array.isArray(v) ? (v[0] ?? '') : v;
      if (scalar == null || scalar === '') return { searchSelectedOption: '' };
      // Always try to select directly — no "other" option exists in this component.
      // revalidateSelection() will clear it if the value is not in the loaded options.
      return { searchSelectedOption: String(scalar) };
    },
  },

  // ── { uploadedFiles: any[], deletedFiles: any[] } ────────────────────────
  // Registration key is 'uploader' — that is what fxForm.elements[].selector stores.
  'uploader': {
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
