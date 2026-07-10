/**
 * Generic visibility + editability gate for container/field components
 * (Section, Repeatable Group, custom Textbox/Textarea, ...). Two
 * independently configured gates — `visibility` and `enable` — are each
 * either a CONDITION LIST or consumer-authored CODE:
 *
 *   Condition list (gate.useCode is falsy):
 *     A list of { source, key, operator, value, grouped } rows. Rows can
 *     freely MIX sources — e.g. one row checking a privilege, another
 *     checking supportingData, another checking a sibling field's value, all
 *     combined in the same list. Combined via per-condition AND/OR grouping —
 *     see evaluateConditions below for the exact rule.
 *       'privilege'      — key = privilege name; resolves to true/false
 *                           depending on whether the user holds it.
 *       'supportingData' — key = dot-path into the consumer-supplied
 *                           supportingData object (e.g. 'clinic.type').
 *       'field'          — key = another field's control name; resolves to
 *                           that field's LIVE value. Requires the context to
 *                           supply `resolveField`.
 *     An empty list means "not gated" → always true.
 *
 *   Code (gate.useCode is true):
 *     consumer-authored JS body; `privileges`, `supportingData`, and
 *     `getFieldValue(name)` are in scope; must `return` a boolean.
 *
 * Both forms fail open (visible / enabled = true) if code throws or nothing
 * is configured, so a broken script or empty config can't permanently lock
 * a field/section away.
 */

export type ConditionSource = 'privilege' | 'supportingData' | 'field';
export type ConditionMatch = 'all' | 'any';
export type ConditionOperator = 'equals' | 'notEquals' | 'in' | 'notIn' | 'truthy' | 'falsy' | string;

export interface Condition {
  source: ConditionSource;
  key: string;
  operator: ConditionOperator;
  value: string;
  /** Per-condition AND/OR grouping — see evaluateConditions below for the exact rule. Falsy/unset = OR'd in on its own. */
  grouped?: boolean;
}

export interface GateConfig {
  useCode?: boolean;
  code?: string;
  conditions?: Condition[];
  /** @deprecated no longer read by evaluateConditions — kept only so existing GateConfig object literals across components still type-check. Use Condition.grouped instead. */
  conditionsMatch?: ConditionMatch | string;
}

export interface ApplicabilityConfig {
  visibility?: GateConfig;
  enable?: GateConfig;
}

export interface ApplicabilityContext {
  privileges: string[] | null | undefined;
  supportingData: any;
  /** Resolves another field's live value by control name — required for 'field' source rows. */
  resolveField?: (name: string) => any;
}

export interface ApplicabilityResult {
  visible: boolean;
  enabled: boolean;
}

/** Reads a dot-path value out of an object, e.g. 'clinic.type' -> obj.clinic.type. */
function readPath(obj: any, path: string): any {
  if (!path) return undefined;
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function matchesOperator(actual: any, operator: ConditionOperator, expected: string): boolean {
  const candidates = String(expected ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  switch (operator) {
    case 'truthy':
      return Boolean(actual);
    case 'falsy':
      return !actual;
    case 'notEquals':
    case 'notIn':
      return !candidates.includes(String(actual));
    case 'in':
    case 'equals':
    default:
      return candidates.length ? candidates.includes(String(actual)) : true;
  }
}

/** Resolves a single condition row's actual value per its source. */
function resolveConditionValue(condition: Condition, context: ApplicabilityContext): any {
  switch (condition.source) {
    case 'privilege':
      return (context.privileges ?? []).map(String).includes(condition.key);
    case 'supportingData':
      return readPath(context.supportingData ?? {}, condition.key);
    case 'field':
    default:
      return context.resolveField?.(condition.key);
  }
}

/**
 * Privilege rows have two shapes:
 *   - Legacy: `key` = privilege name; resolved to membership (true/false), then
 *     compared via the generic operator/value like any other source.
 *   - Current (Privilege section in settings panels — no per-row source picker
 *     needed anymore): `key` is blank; `value` holds one or more privilege
 *     names (comma-separated) and `operator` picks has-any (truthy/in/equals)
 *     vs has-none (falsy/notIn/notEquals). Kept separate from
 *     `resolveConditionValue`/`matchesOperator` because the actual being
 *     compared is a set-membership check against `value` itself, not a
 *     single resolved value.
 */
function matchesPrivilegeCondition(condition: Condition, context: ApplicabilityContext): boolean {
  const privileges = (context.privileges ?? []).map(String);
  if (String(condition.key ?? '').trim()) {
    return matchesOperator(privileges.includes(condition.key), condition.operator, condition.value);
  }
  const candidates = String(condition.value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!candidates.length) return true;
  const hasAny = candidates.some((c) => privileges.includes(c));
  const negate = condition.operator === 'falsy' || condition.operator === 'notIn' || condition.operator === 'notEquals';
  return negate ? !hasAny : hasAny;
}

/** A row is "configured" once there's enough to evaluate — privilege rows key off `value` when `key` is blank. */
export function isConditionConfigured(c: Condition): boolean {
  if (c?.source === 'privilege') return String(c?.key ?? '').trim().length > 0 || String(c?.value ?? '').trim().length > 0;
  return String(c?.key ?? '').trim().length > 0;
}

/**
 * Evaluates a LIST of (possibly mixed-source) conditions via per-condition
 * AND/OR grouping: rows with `grouped: true` are AND-ed together into a
 * single clause; that clause is then OR-ed against every other row
 * individually. E.g. with rows C1..C4 where C1 and C3 are checked:
 *   (C1 && C3) || C2 || C4
 * If nothing is checked, this is a pure OR. If everything is checked, a pure AND.
 */
function evaluateConditions(conditions: Condition[] | undefined, context: ApplicabilityContext): boolean {
  const rows = (conditions ?? []).filter(isConditionConfigured);
  if (!rows.length) return true; // nothing configured → not gated
  const resultFor = (c: Condition) =>
    c.source === 'privilege' ? matchesPrivilegeCondition(c, context) : matchesOperator(resolveConditionValue(c, context), c.operator, c.value);

  const groupedRows = rows.filter((c) => c.grouped);
  const ungroupedRows = rows.filter((c) => !c.grouped);
  const groupResult = groupedRows.length ? groupedRows.every(resultFor) : null;
  const orResults = ungroupedRows.map(resultFor);
  return groupResult === null ? orResults.some(Boolean) : groupResult || orResults.some(Boolean);
}

/** Runs consumer-authored code as `(privileges, supportingData, getFieldValue) => boolean`. Fails open on error. */
function runCode(code: string | undefined, context: ApplicabilityContext): boolean {
  if (!String(code ?? '').trim()) return true;
  try {
    const fn = new Function('privileges', 'supportingData', 'getFieldValue', code!);
    const result = fn(
      context.privileges ?? [],
      context.supportingData ?? {},
      (name: string) => context.resolveField?.(name),
    );
    return typeof result === 'boolean' ? result : true;
  } catch (err) {
    console.error('[fx-builder-wrapper] gate code threw — failing open.', err);
    return true;
  }
}

/** Safely parses a condition list stored as a JSON string setting (or passes an already-parsed array through). */
export function parseConditions(raw: any): Condition[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Evaluates a single gate (visibility or enable): code if configured, else its condition list. */
export function evaluateGate(gate: GateConfig | undefined, context: ApplicabilityContext): boolean {
  if (!gate) return true;
  if (gate.useCode) return runCode(gate.code, context);
  return evaluateConditions(gate.conditions, context);
}

/** Generic isApplicable: computes { visible, enabled } from two independent gates. */
export function isApplicable(config: ApplicabilityConfig, context: ApplicabilityContext): ApplicabilityResult {
  return {
    visible: evaluateGate(config.visibility, context),
    enabled: evaluateGate(config.enable, context),
  };
}
