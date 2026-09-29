/**
 * Yes/No settings across this library are declared as `FxSelectSetting` storing the
 * **strings** `'true'` / `'false'` — never `FxToggleSetting` with real booleans.
 *
 * Why: fx's `deepMergeObjects` treats a falsy saved value as "unset" and reverts it to
 * the class default, so a boolean setting can never be persisted as `false`. A setting
 * defaulting to `true` was therefore impossible to turn off. The string `'false'` is
 * truthy, so it survives the merge and the choice sticks. `uploader`'s
 * `isUploaderRequired` is the reference. See `.claude/docs/backward-compatibility.md`.
 *
 * Forms saved before this convention still hold real booleans under the same keys, so
 * every read goes through `isSettingOn()`, which accepts both shapes.
 *
 * Two rules when reading a Yes/No setting:
 *   - never `=== true` — that misses the current string form;
 *   - never a bare truthiness test — the string `'false'` is truthy, which would read
 *     as "on". This is why templates call `isOn('key')` and not `setting('key')`.
 */

/** A fresh Yes/No option list for an `FxSelectSetting`. */
export interface YesNoOption {
  option: string;
  value: string;
}

/**
 * Option list for a Yes/No `FxSelectSetting`. Returns a **new array each call** on
 * purpose: fx merges and mutates setting arrays in place, and sharing one instance
 * across settings is how values leak between fields.
 */
export function yesNoOptions(): YesNoOption[] {
  return [
    { option: 'Yes', value: 'true' },
    { option: 'No', value: 'false' },
  ];
}

/**
 * True when a Yes/No setting is on. Accepts the current `'true'` string and the legacy
 * boolean `true` written by the old `FxToggleSetting` declarations. Everything else —
 * `'false'`, `false`, `''`, `null`, `undefined` — is off.
 */
export function isSettingOn(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
  return false;
}

/**
 * Normalises a Yes/No setting to the `'true' | 'false'` strings the settings panels'
 * radio groups bind to. Use it when loading a stored value into a panel form.
 */
export function toYesNo(value: unknown): 'true' | 'false' {
  return isSettingOn(value) ? 'true' : 'false';
}
