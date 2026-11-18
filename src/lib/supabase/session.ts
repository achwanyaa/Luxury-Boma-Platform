import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import type { Database } from "./database.types";
import { supabaseConfigured, supabasePublishableKey, supabaseUrl } from "./env";

/**
 * Keeps the visitor's sign-in fresh. Called from src/proxy.ts on every page
 * request; writes any renewed session cookies onto the outgoing response.
 * Also returns the verified token claims (null when not signed in), which the
 * proxy uses for its quick console redirect.
 */
export async function refreshSession(request: NextRequest, response: NextResponse) {
  if (!supabaseConfigured) return { response, claims: null };

  const supabase = createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Verifies the token and renews it when it is close to expiring.
  const { data } = await supabase.auth.getClaims();
  return { response, claims: data?.claims ?? null };
}
