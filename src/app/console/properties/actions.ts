"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  describeSaveError,
  readPropertyForm,
  validateProperty,
  type FieldErrors,
  type PropertyInput,
} from "@/lib/console/property-form";
import {
  DEALS,
  describeListingError,
  readListingForm,
  validateListing,
  type Deal,
  type ListingErrors,
  type ListingInput,
} from "@/lib/console/listing-form";
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
