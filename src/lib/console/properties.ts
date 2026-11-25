import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PropertyStatus } from "./property-form";

// Console reads of properties. They run as the signed-in staff member, so
// row-level security applies: without a two-factor staff session these
// return public rows only. Callers must have called requireStaff() first.

export type ClientOption = { id: string; name: string; slug: string };

export type PropertySummary = {
  id: string;
  reference: string;
  name: string;
  status: PropertyStatus;
  siteVisitedOn: string | null;
  updatedAt: string;
  client: ClientOption | null;
};

export async function listClients(): Promise<ClientOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").select("id, name, slug").order("name");
  if (error) throw new Error(`Could not read the clients: ${error.message}`);
  return data;
}

export async function listProperties(): Promise<PropertySummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select("id, reference, name, status, site_visited_on, updated_at, clients ( id, name, slug )")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Could not read the properties: ${error.message}`);
  return data.map((row) => ({
    id: row.id,
    reference: row.reference,
    name: row.name,
    status: row.status,
    siteVisitedOn: row.site_visited_on,
    updatedAt: row.updated_at,
    client: row.clients,
  }));
}

export async function getProperty(id: string) {
  // Not a uuid: no such property (and no database error for a typo'd address).
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select("*, clients ( id, name, slug ), listings ( * ), media ( * )")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not read the property: ${error.message}`);
  return data;
}

export async function countByStatus(): Promise<Record<PropertyStatus, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("properties").select("status");
  if (error) throw new Error(`Could not count the properties: ${error.message}`);
  const counts: Record<PropertyStatus, number> = { draft: 0, in_review: 0, live: 0, paused: 0, sold_or_leased: 0 };
  for (const row of data) counts[row.status] += 1;
  return counts;
}
