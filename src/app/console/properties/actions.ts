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
