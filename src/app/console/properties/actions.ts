"use server";

import { refresh, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  describeSaveError,
  readPropertyForm,
  validateProperty,
  STATUS_LABEL,
  type FieldErrors,
  type PropertyInput,
  type PropertyStatus,
} from "@/lib/console/property-form";
import { getPublishInput } from "@/lib/console/properties";
import { canMove, describeStatusError, publishCheck } from "@/lib/console/publish-rules";
import {
  DEALS,
  describeListingError,
  readListingForm,
  validateListing,
  type Deal,
  type ListingErrors,
  type ListingInput,
} from "@/lib/console/listing-form";
import {
  describeFactError,
  factChanged,
  readFactForm,
  validateFact,
  type FactErrors,
  type FactInput,
} from "@/lib/console/fact-form";
import { requireStaff } from "@/lib/console/staff";
import { listingsTag } from "@/lib/portal/listings";
import { createClient } from "@/lib/supabase/server";

// Writes run as the signed-in staff member through the server client, so
// row-level security and the publish triggers apply. Never the secret key.

export type PropertyFormState =
  | { input: PropertyInput; errors: FieldErrors; message?: string; saved?: boolean }
  | undefined;

const today = () => new Date().toISOString().slice(0, 10);

export async function createProperty(_prev: PropertyFormState, formData: FormData): Promise<PropertyFormState> {
  await requireStaff();
  const input = readPropertyForm(formData);
  const checked = validateProperty(input, today());
  if (!checked.ok) return { input, errors: checked.errors, message: "Check the highlighted fields." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("properties").insert(checked.values).select("id").single();
  if (error || !data) {
    const { field, message } = describeSaveError(error ?? {});
    return { input, errors: field ? { [field]: message } : {}, message };
  }

  redirect(`/properties/${data.id}`);
}

export async function updateProperty(
  id: string,
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  await requireStaff();
  const input = readPropertyForm(formData);
  const checked = validateProperty(input, today());
  if (!checked.ok) return { input, errors: checked.errors, message: "Check the highlighted fields." };

  // A property never changes client (the database refuses it too).
  const { client_id: _client, ...changes } = checked.values;
  void _client;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .update(changes)
    .eq("id", id)
    .select("id, clients ( slug )")
    .maybeSingle();
  if (error) {
    const { field, message } = describeSaveError(error);
    return { input, errors: field ? { [field]: message } : {}, message };
  }
  if (!data) return { input, errors: {}, message: "This property no longer exists, or your account can't change it." };

  // A live property's details show on its client's portal; refresh that cache.
  if (data.clients?.slug) revalidateTag(listingsTag(data.clients.slug), "max");

  return { input, errors: {}, saved: true };
}

// ---------------------------------------------------------------------------
// Listings: one per deal (lease, sale) on a property
// ---------------------------------------------------------------------------

export type ListingFormState =
  | { input: ListingInput; errors: ListingErrors; message?: string; saved?: boolean }
  | undefined;

export async function saveListing(
  propertyId: string,
  deal: Deal,
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  await requireStaff();
  const input = readListingForm(formData);
  if (!DEALS.includes(deal)) return { input, errors: {}, message: "Unknown deal." };
  const checked = validateListing(deal, input);
  if (!checked.ok) return { input, errors: checked.errors, message: "Check the highlighted fields." };

  const supabase = await createClient();
  const { data: property, error: readError } = await supabase
    .from("properties")
    .select("id, client_id, clients ( slug ), listings ( id, deal )")
    .eq("id", propertyId)
    .maybeSingle();
  if (readError || !property) {
    return { input, errors: {}, message: "This property no longer exists, or your account can't change it." };
  }

  const existing = property.listings.find((l) => l.deal === deal);
  const { error } = existing
    ? await supabase.from("listings").update(checked.values).eq("id", existing.id)
    : await supabase
        .from("listings")
        .insert({ ...checked.values, deal, property_id: property.id, client_id: property.client_id });
  if (error) return { input, errors: {}, message: describeListingError(error) };

  if (property.clients?.slug) revalidateTag(listingsTag(property.clients.slug), "max");
  return { input, errors: {}, saved: true };
}

// ---------------------------------------------------------------------------
// Facts: one per catalogue entry on the whole property (spaces come later)
// ---------------------------------------------------------------------------

export type FactFormState =
  | { input: FactInput; errors: FactErrors; message?: string; saved?: boolean }
  | undefined;

const REVIEWER_ROLES = ["lb_admin", "lb_reviewer"];

export async function saveFact(
  propertyId: string,
  specKey: string,
  _prev: FactFormState,
  formData: FormData,
): Promise<FactFormState> {
  const staff = await requireStaff();
  const input = readFactForm(formData);
  const supabase = await createClient();

  const [{ data: property }, { data: definition }] = await Promise.all([
    supabase
      .from("properties")
      .select("id, client_id, property_type, clients ( slug )")
      .eq("id", propertyId)
      .maybeSingle(),
    supabase.from("spec_definitions").select("key, name, value_type, unit").eq("key", specKey).maybeSingle(),
  ]);
  if (!property || !definition) {
    return { input, errors: {}, message: "This property or fact no longer exists. Reload the page." };
  }

  const checked = validateFact(definition, input, today());
  if (!checked.ok) return { input, errors: checked.errors, message: "Check the highlighted fields." };

  const { data: current, error: readError } = await supabase
    .from("spec_values")
    .select("id, value_number, value_boolean, value_text, display_value, unit, label, method, source, checked_on, note")
    .eq("property_id", property.id)
    .eq("spec_key", specKey)
    .is("space_id", null)
    .maybeSingle();
  if (readError) return { input, errors: {}, message: describeFactError(readError) };

  if (current && !factChanged({ ...current, label: current.label }, checked.values)) {
    return { input, errors: {}, message: "Nothing changed, so nothing was saved." };
  }

  // A changed fact is a new check by this person; any earlier review no longer applies.
  const write = { ...checked.values, checked_by: staff.userId, reviewed_by: null, reviewed_at: null };
  // Always update an existing fact in place: the database keeps its earlier version.
  const { error } = current
    ? await supabase.from("spec_values").update(write).eq("id", current.id)
    : await supabase
        .from("spec_values")
        .insert({ ...write, spec_key: specKey, property_id: property.id, client_id: property.client_id });
  if (error) return { input, errors: {}, message: describeFactError(error) };

  if (property.clients?.slug) revalidateTag(listingsTag(property.clients.slug), "max");
  return { input, errors: {}, saved: true };
}

export type ReviewState = { message: string; ok: boolean } | undefined;

export async function markFactReviewed(propertyId: string, factId: string): Promise<ReviewState> {
  const staff = await requireStaff();
  if (!REVIEWER_ROLES.includes(staff.role)) {
    return { ok: false, message: "Only a reviewer or admin can mark a fact reviewed." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spec_values")
    .update({ reviewed_by: staff.userId, reviewed_at: new Date().toISOString() })
    .eq("id", factId)
    .eq("property_id", propertyId)
    .neq("label", "not_yet_checked")
    .select("id, properties ( clients ( slug ) )")
    .maybeSingle();
  if (error) return { ok: false, message: describeFactError(error) };
  if (!data) return { ok: false, message: "This fact can't be reviewed: it isn't checked yet, or it no longer exists." };
  const slug = data.properties?.clients?.slug;
  if (slug) revalidateTag(listingsTag(slug), "max");
  return { ok: true, message: "Marked reviewed." };
}

// ---------------------------------------------------------------------------
// Status: draft -> in review -> live -> paused / sold or leased
// ---------------------------------------------------------------------------

export type StatusResult = { ok: boolean; message: string; blockers?: string[] };

export async function changeStatus(propertyId: string, to: PropertyStatus): Promise<StatusResult> {
  const staff = await requireStaff();
  const supabase = await createClient();
  const loaded = await getPublishInput(propertyId, staff.role);
  if (!loaded) return { ok: false, message: "This property no longer exists, or your account can't change it." };
  const { property, input } = loaded;

  if (!canMove(property.status, to)) {
    return { ok: false, message: `A ${STATUS_LABEL[property.status].toLowerCase()} property can't go straight to ${STATUS_LABEL[to].toLowerCase()}.` };
  }
  if (to === "live") {
    const { blockers } = publishCheck(input);
    if (blockers.length > 0) return { ok: false, message: "Not published yet:", blockers };
  }

  const { data: changed, error } = await supabase
    .from("properties")
    .update({ status: to })
    .eq("id", property.id)
    .eq("status", property.status)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, message: describeStatusError(error) };
  if (!changed) return { ok: false, message: "The status changed while you were looking. Reload the page and try again." };

  if (property.clients?.slug) revalidateTag(listingsTag(property.clients.slug), "max");
  refresh();
  return { ok: true, message: to === "live" ? "Published. It is on the portal now." : `Now ${STATUS_LABEL[to].toLowerCase()}.` };
}
