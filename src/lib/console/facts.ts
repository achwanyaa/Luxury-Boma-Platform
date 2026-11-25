import "server-only";
import { createClient } from "@/lib/supabase/server";
import { historySummary, type FactDefinition, type FactRow, type Provenance } from "./fact-form";

// Console reads for the facts editor. Run as the signed-in staff member, so
// row-level security applies. Callers must have called requireStaff() first.

export type FactGroup = "structure" | "access" | "power" | "legal" | "location";

export type FactHistoryEntry = {
  changedAt: string;
  changedBy: string | null;
  operation: string;
  display: string;
  label: Provenance;
  checkedOn: string | null;
  source: string | null;
};

export type EditorFact = {
  definition: FactDefinition & { group: FactGroup; requiredToPublish: boolean; sortOrder: number };
  current: (FactRow & { id: string; checked_by: string | null; reviewed_by: string | null; reviewed_at: string | null }) | null;
  history: FactHistoryEntry[];
};

export async function getFactsForProperty(propertyId: string, propertyType: string): Promise<EditorFact[]> {
  const supabase = await createClient();
  const [defs, values, history] = await Promise.all([
    supabase
      .from("spec_definitions")
      .select("key, name, spec_group, value_type, unit, required_to_publish, sort_order")
      .eq("property_type", propertyType)
      .order("sort_order"),
    supabase
      .from("spec_values")
      .select(
        "id, spec_key, value_number, value_boolean, value_text, display_value, unit, label, method, source, checked_on, note, checked_by, reviewed_by, reviewed_at",
      )
      .eq("property_id", propertyId)
      .is("space_id", null),
    supabase
      .from("spec_value_history")
      .select("spec_value_id, operation, old_row, changed_by, changed_at")
      .eq("property_id", propertyId)
      .order("changed_at", { ascending: false }),
  ]);
  if (defs.error) throw new Error(`Could not read the spec catalogue: ${defs.error.message}`);
  if (values.error) throw new Error(`Could not read the facts: ${values.error.message}`);
  if (history.error) throw new Error(`Could not read the fact history: ${history.error.message}`);

  const byKey = new Map(values.data.map((v) => [v.spec_key, v]));
  return defs.data.map((d) => {
    const current = byKey.get(d.key) ?? null;
    return {
      definition: {
        key: d.key,
        name: d.name,
        value_type: d.value_type,
        unit: d.unit,
        group: d.spec_group as FactGroup,
        requiredToPublish: d.required_to_publish,
        sortOrder: d.sort_order,
      },
      current: current ? { ...current, label: current.label as Provenance } : null,
      history: current
        ? history.data
            .filter((h) => h.spec_value_id === current.id)
            .map((h) => ({
              changedAt: h.changed_at,
              changedBy: h.changed_by,
              operation: h.operation,
              ...historySummary((h.old_row ?? {}) as Record<string, unknown>),
            }))
        : [],
    };
  });
}

/**
 * Display names for staff user ids. Only an admin can read other staff rows
 * (row-level security), so anyone else gets back their own name only.
 */
export async function staffNames(): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("staff_members").select("user_id, display_name");
  if (error) return new Map();
  return new Map(data.filter((s) => s.display_name).map((s) => [s.user_id, s.display_name!]));
}
