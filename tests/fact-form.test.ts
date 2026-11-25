import { describe, expect, it } from "vitest";
import {
  autoDisplay,
  describeFactError,
  EMPTY_FACT,
  factChanged,
  factToInput,
  historySummary,
  parseNumber,
  readFactForm,
  reviewState,
  validateFact,
  type FactDefinition,
  type FactInput,
} from "../src/lib/console/fact-form";

const TODAY = "2026-11-25";
const clearHeight: FactDefinition = { key: "clear_height", name: "Clear height under truss", value_type: "number", unit: "m" };
const doors: FactDefinition = { key: "loading_doors", name: "Loading doors", value_type: "number", unit: "doors" };
const turning: FactDefinition = { key: "truck_turning", name: "Truck turning", value_type: "boolean", unit: null };
const nema: FactDefinition = { key: "nema_licence", name: "NEMA licence", value_type: "text", unit: null };

const input = (change: Partial<FactInput>): FactInput => ({ ...EMPTY_FACT, ...change });

describe("facts: the label rules the database enforces", () => {
  it("needs a source naming the drawing for a fact from drawings", () => {
    const bare = validateFact(clearHeight, input({ label: "from_drawings", value: "9" }), TODAY);
    expect(!bare.ok && bare.errors.source).toMatch(/drawing and its author/);
    const named = validateFact(
      clearHeight,
      input({ label: "from_drawings", value: "9", source: "Drawing A-201 rev B, Sketch3D Ltd" }),
      TODAY,
    );
    expect(named.ok).toBe(true);
  });

  it("needs a date for a measured fact, and never a future one", () => {
    const undated = validateFact(clearHeight, input({ label: "measured", value: "8.9" }), TODAY);
    expect(!undated.ok && undated.errors.checked_on).toMatch(/date it was measured/);
    const future = validateFact(clearHeight, input({ label: "measured", value: "8.9", checked_on: "2026-12-01" }), TODAY);
    expect(!future.ok && future.errors.checked_on).toMatch(/future/);
    expect(validateFact(clearHeight, input({ label: "measured", value: "8.9", checked_on: "2026-09-30" }), TODAY).ok).toBe(true);
  });

  it("stores no value for not yet checked or not found, whatever was typed", () => {
    for (const label of ["not_yet_checked", "not_found"]) {
      const result = validateFact(clearHeight, input({ label, value: "9", display_value: "9 m" }), TODAY);
      expect(result.ok && result.values).toMatchObject({ value_number: null, value_boolean: null, value_text: null });
    }
    const unchecked = validateFact(clearHeight, input({}), TODAY);
    expect(unchecked.ok && unchecked.values.display_value).toBe("Not yet checked");
  });

  it("needs a value for every label that claims one", () => {
    for (const label of ["measured", "from_drawings", "declared", "indicative"]) {
      const result = validateFact(nema, input({ label, source: "x", checked_on: TODAY }), TODAY);
      expect(!result.ok && result.errors.value).toMatch(/Enter the value/);
    }
  });

  it("refuses an unknown label", () => {
    expect(validateFact(clearHeight, input({ label: "verified" }), TODAY).ok).toBe(false);
  });
});

describe("facts: values and display text", () => {
  it("reads numbers, yes/no and text by the catalogue's value type", () => {
    expect(parseNumber("4,500")).toBe(4500);
    expect(parseNumber("9.8")).toBe(9.8);
    expect(parseNumber("about 9")).toBe(null);

    const flag = validateFact(turning, input({ label: "declared", value: "yes" }), TODAY);
    expect(flag.ok && [flag.values.value_boolean, flag.values.display_value]).toEqual([true, "Yes"]);
    const bad = validateFact(turning, input({ label: "declared", value: "maybe" }), TODAY);
    expect(!bad.ok && bad.errors.value).toMatch(/yes or no/);

    const text = validateFact(nema, input({ label: "declared", value: "NEMA/EIA/5/2/123" }), TODAY);
    expect(text.ok && [text.values.value_text, text.values.unit]).toEqual(["NEMA/EIA/5/2/123", null]);
  });

  it("writes the display text from value and unit unless one is typed", () => {
    expect(autoDisplay("number", 4500, "m²")).toBe("4,500 m²");
    expect(autoDisplay("number", 2, "doors")).toBe("2 doors");
    expect(autoDisplay("number", 1, "doors")).toBe("1 door");
    expect(autoDisplay("number", 9.75, "m")).toBe("9.75 m");
    const typed = validateFact(doors, input({ label: "indicative", value: "1", display_value: "1 roller shutter" }), TODAY);
    expect(typed.ok && typed.values.display_value).toBe("1 roller shutter");
  });

  it("round-trips a stored fact into the form", () => {
    const stored = {
      value_number: null, value_boolean: true, value_text: null, display_value: "Yes", unit: null,
      label: "declared" as const, method: null, source: "Realogic", checked_on: null, note: null, document_id: null,
    };
    expect(factToInput(stored)).toMatchObject({ value: "yes", source: "Realogic", label: "declared" });
    expect(factToInput(null)).toEqual(EMPTY_FACT);
  });

  it("reads and trims the submitted form", () => {
    const form = new FormData();
    form.set("value", " 9.8 ");
    form.set("label", "measured");
    expect(readFactForm(form)).toMatchObject({ value: "9.8", label: "measured", source: "" });
  });
});

describe("facts: changes, history and review", () => {
  const saved = validateFact(clearHeight, input({ label: "measured", value: "8.9", checked_on: "2026-09-30" }), TODAY);
  if (!saved.ok) throw new Error("fixture");

  it("sees an unchanged save as no change, so no history row is written", () => {
    expect(factChanged({ ...saved.values }, saved.values)).toBe(false);
    expect(factChanged({ ...saved.values, value_number: 8.9 }, { ...saved.values, value_number: 9 })).toBe(true);
    expect(factChanged({ ...saved.values }, { ...saved.values, note: "Re-taped" })).toBe(true);
    expect(factChanged(null, saved.values)).toBe(true);
  });

  it("summarises an earlier version", () => {
    expect(historySummary({ label: "from_drawings", display_value: "9 m", source: "A-201", checked_on: null })).toEqual({
      display: "9 m", label: "from_drawings", checkedOn: null, source: "A-201",
    });
    expect(historySummary({ label: "not_yet_checked", display_value: "" }).display).toBe("Not yet checked");
  });

  it("shows self-review honestly", () => {
    expect(reviewState("u1", null)).toBe("not_reviewed");
    expect(reviewState("u1", "u1")).toBe("self_reviewed");
    expect(reviewState("u1", "u2")).toBe("reviewed");
  });

  it("links a fact to a document, and notices when the link changes", () => {
    const doc = "dddddddd-0000-4000-8000-000000000001";
    const linked = validateFact(clearHeight, input({ label: "from_drawings", value: "9", source: "A-201, Sketch3D Ltd", document_id: doc }), TODAY);
    expect(linked.ok && linked.values.document_id).toBe(doc);
    expect(linked.ok && factChanged({ ...linked.values, document_id: null }, linked.values)).toBe(true);
    expect(validateFact(clearHeight, input({ document_id: "not-a-doc" }), TODAY).ok).toBe(false);
  });

  it("explains each database refusal in words", () => {
    expect(describeFactError({ code: "23514", message: 'violates check constraint "measured_has_a_date"' })).toMatch(/date/);
    expect(describeFactError({ code: "23514", message: 'violates check constraint "drawings_name_their_author"' })).toMatch(/drawing/);
    expect(describeFactError({ code: "XX000", message: "relation" })).not.toMatch(/relation/);
  });
});
