// Pure rules for the console's facts editor: what each provenance label
// demands, how a value is read and displayed, and whether a save changes
// anything. They mirror the database constraints on spec_values so the form
// can explain a problem before the database refuses it. Unit-tested.

export type Provenance =
  | "measured"
  | "from_drawings"
  | "declared"
  | "indicative"
  | "not_found"
  | "not_yet_checked";

export type ValueType = "number" | "boolean" | "text";

/** The labels in the order a checker reaches for them, with what each one claims. */
export const PROVENANCE_OPTIONS: { value: Provenance; text: string; help: string }[] = [
  { value: "measured", text: "Measured", help: "We measured it on site. Needs the date it was measured." },
  {
    value: "from_drawings",
    text: "From drawings",
    help: "Taken from a drawing. The source must name the drawing and its author, e.g. “Drawing A-101 rev C, Sketch3D Ltd”.",
  },
  { value: "declared", text: "Declared by seller", help: "The seller's word only; we haven't checked it." },
  { value: "indicative", text: "Indicative", help: "A rough figure, e.g. from a scan's floor plan marked “for reference only”." },
  { value: "not_found", text: "Not found", help: "We looked and couldn't find it (no licence on file, no meter). No value." },
  { value: "not_yet_checked", text: "Not yet checked", help: "Nothing recorded yet. No value." },
];

const PROVENANCE_VALUES = PROVENANCE_OPTIONS.map((o) => o.value);
export const PROVENANCE_TEXT = Object.fromEntries(PROVENANCE_OPTIONS.map((o) => [o.value, o.text])) as Record<
  Provenance,
  string
>;

/** Labels that carry a value. Not found and not yet checked never do. */
export const LABELS_WITH_VALUE: Provenance[] = ["measured", "from_drawings", "declared", "indicative"];

export type FactDefinition = { key: string; name: string; value_type: ValueType; unit: string | null };

export type FactInput = {
  value: string;
  display_value: string;
  label: string;
  method: string;
  source: string;
  checked_on: string;
  note: string;
  /** The documents row this fact cites, or empty. */
  document_id: string;
};

export type FactField = keyof FactInput;
export type FactErrors = Partial<Record<FactField, string>>;

/** The columns of spec_values the editor writes. */
export type FactValues = {
  value_number: number | null;
  value_boolean: boolean | null;
  value_text: string | null;
  display_value: string;
  unit: string | null;
  label: Provenance;
  method: string | null;
  source: string | null;
  checked_on: string | null;
  note: string | null;
  document_id: string | null;
};

export type FactRow = FactValues;

export const EMPTY_FACT: FactInput = {
  value: "",
  display_value: "",
  label: "not_yet_checked",
  method: "",
  source: "",
  checked_on: "",
  note: "",
  document_id: "",
};

export function factToInput(row: FactRow | null | undefined): FactInput {
  if (!row) return EMPTY_FACT;
  const value =
    row.value_number !== null
      ? String(row.value_number)
      : row.value_boolean !== null
        ? row.value_boolean
          ? "yes"
          : "no"
        : (row.value_text ?? "");
  return {
    value,
    display_value: LABELS_WITH_VALUE.includes(row.label) ? row.display_value : "",
    label: row.label,
    method: row.method ?? "",
    source: row.source ?? "",
    checked_on: row.checked_on ?? "",
    note: row.note ?? "",
    document_id: row.document_id ?? "",
  };
}

export function readFactForm(form: { get(name: string): unknown }): FactInput {
  const text = (name: FactField) => {
    const raw = form.get(name);
    return typeof raw === "string" ? raw.trim() : "";
  };
  return {
    value: text("value"),
    display_value: text("display_value"),
    label: text("label"),
    method: text("method"),
    source: text("source"),
    checked_on: text("checked_on"),
    note: text("note"),
    document_id: text("document_id"),
  };
}

/** "4,500" or "4 500" -> 4500; "9.8" -> 9.8. Null when it isn't a number. */
export function parseNumber(text: string): number | null {
  const cleaned = text.replace(/[\s,]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** The text shown on the portal when no display value is typed: "4,500 m²", "2 doors", "1 door", "Yes". */
export function autoDisplay(type: ValueType, value: number | boolean | string, unit: string | null): string {
  if (type === "boolean") return value ? "Yes" : "No";
  if (type === "text") return String(value);
  const n = value as number;
  const amount = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 2 }).format(n);
  if (!unit) return amount;
  // "doors", "litres": singular for exactly one.
  const word = n === 1 && /^[a-z]+s$/.test(unit) ? unit.slice(0, -1) : unit;
  return `${amount} ${word}`;
}

const DATE_RULE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Checks a fact the way the database will (from drawings needs a source,
 * measured needs a date, no value without a checking label) and returns the
 * columns to write. `today` is an ISO date, passed in so the rule is testable.
 */
export function validateFact(
  def: FactDefinition,
  input: FactInput,
  today: string,
): { ok: true; values: FactValues } | { ok: false; errors: FactErrors } {
  const errors: FactErrors = {};
  const label = input.label as Provenance;
  if (!PROVENANCE_VALUES.includes(label)) {
    return { ok: false, errors: { label: "Choose how this fact was checked." } };
  }
  const carriesValue = LABELS_WITH_VALUE.includes(label);

  let number: number | null = null;
  let flag: boolean | null = null;
  let text: string | null = null;
  if (carriesValue) {
    if (input.value === "") errors.value = "Enter the value, or choose “Not yet checked”.";
    else if (def.value_type === "number") {
      number = parseNumber(input.value);
      if (number === null) errors.value = "Enter a number, for example 9.8.";
    } else if (def.value_type === "boolean") {
      if (input.value === "yes" || input.value === "no") flag = input.value === "yes";
      else errors.value = "Choose yes or no.";
    } else text = input.value;
  }

  if (label === "from_drawings" && input.source === "") {
    errors.source = "Name the drawing and its author, e.g. “Drawing A-101 rev C, Sketch3D Ltd”.";
  }
  if (input.checked_on !== "") {
    if (!DATE_RULE.test(input.checked_on) || Number.isNaN(Date.parse(input.checked_on))) {
      errors.checked_on = "Enter a date.";
    } else if (input.checked_on > today) {
      errors.checked_on = "The check can't be in the future.";
    }
  } else if (label === "measured") {
    errors.checked_on = "Enter the date it was measured.";
  }

  if (input.document_id !== "" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.document_id)) {
    errors.document_id = "Choose a document from the list.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const orNull = (s: string) => (s === "" ? null : s);
  const value = number ?? flag ?? text;
  const display = !carriesValue
    ? PROVENANCE_TEXT[label]
    : input.display_value !== ""
      ? input.display_value
      : autoDisplay(def.value_type, value as number | boolean | string, def.unit);

  return {
    ok: true,
    values: {
      value_number: number,
      value_boolean: flag,
      value_text: text,
      display_value: display,
      unit: def.value_type === "number" ? def.unit : null,
      label,
      method: orNull(input.method),
      source: orNull(input.source),
      checked_on: orNull(input.checked_on),
      note: orNull(input.note),
      document_id: orNull(input.document_id),
    },
  };
}

const COMPARED: (keyof FactValues)[] = [
  "value_number",
  "value_boolean",
  "value_text",
  "display_value",
  "unit",
  "label",
  "method",
  "source",
  "checked_on",
  "note",
  "document_id",
];

/** True when saving `next` would change the stored fact. Numbers arrive from the API as numbers. */
export function factChanged(current: FactRow | null | undefined, next: FactValues): boolean {
  if (!current) return true;
  return COMPARED.some((key) => {
    const a = current[key];
    const b = next[key];
    if (typeof a === "number" || typeof b === "number") return Number(a) !== Number(b) || (a === null) !== (b === null);
    return (a ?? null) !== (b ?? null);
  });
}

/** One earlier version of a fact, from spec_value_history.old_row. */
export function historySummary(oldRow: Record<string, unknown>): { display: string; label: Provenance; checkedOn: string | null; source: string | null } {
  const label = (PROVENANCE_VALUES.includes(oldRow.label as Provenance) ? oldRow.label : "not_yet_checked") as Provenance;
  return {
    display: LABELS_WITH_VALUE.includes(label) ? String(oldRow.display_value ?? "") : PROVENANCE_TEXT[label],
    label,
    checkedOn: typeof oldRow.checked_on === "string" ? oldRow.checked_on : null,
    source: typeof oldRow.source === "string" ? oldRow.source : null,
  };
}

/** "Self-reviewed" when the checker reviewed their own fact (HANDOFF rule 7). */
export function reviewState(
  checkedBy: string | null,
  reviewedBy: string | null,
): "not_reviewed" | "self_reviewed" | "reviewed" {
  if (!reviewedBy) return "not_reviewed";
  return reviewedBy === checkedBy ? "self_reviewed" : "reviewed";
}

export function describeFactError(error: { code?: string; message?: string }): string {
  const text = error.message ?? "";
  if (error.code === "23514") {
    if (text.includes("drawings_name_their_author")) return "A fact from drawings must name its drawing and author.";
    if (text.includes("measured_has_a_date")) return "A measured fact needs the date it was measured.";
    if (text.includes("unchecked_has_no_value")) return "A fact that isn't checked yet can't have a value.";
  }
  if (error.code === "23505") return "This fact was just saved by someone else. Reload the page.";
  if (error.code === "23503") return "That document no longer belongs to this property. Reload the page and choose again.";
  if (error.code === "42501") return "Your account isn't allowed to make this change.";
  return "Could not save just now. Try again in a minute.";
}
