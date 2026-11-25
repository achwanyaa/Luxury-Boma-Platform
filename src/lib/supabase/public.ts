import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { requireSupabaseEnv } from "./env";

/**
 * A client that reads as the public (`anon`), with no visitor session. Used
 * for cached public pages such as the portal listings: it never touches
 * cookies, so it can run inside `'use cache'`, and row-level security limits
 * it to live properties and active listings.
 */
export function createPublicClient() {
  const { url, key } = requireSupabaseEnv();
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** The public address of a file in a public Storage bucket (no request is made). */
export function publicFileUrl(bucket: string, path: string): string {
  return createPublicClient().storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
