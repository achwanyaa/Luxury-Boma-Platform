import "server-only";
import { redirect } from "next/navigation";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { CONSOLE_HOME_PATH, SIGN_IN_PATH, TWO_FACTOR_PATH } from "./access";

// The console's data access layer for "who is this?". Every console page and
// Server Action goes through one of these functions, which verify the session
// token on the server. Row-level security is the last word either way:
// without an aal2 session the database shows staff nothing but public data.

export type StaffRole = Database["public"]["Enums"]["staff_role"];

export type Staff = {
  userId: string;
  email: string | null;
  role: StaffRole;
  displayName: string | null;
};

export const ROLE_LABEL: Record<StaffRole, string> = {
  lb_admin: "Admin",
  lb_reviewer: "Reviewer",
  lb_editor: "Editor",
  client_staff: "Client staff",
};

/** Sign-in page reason shown to an account that is not LuxuryBoma staff. */
export const NOT_STAFF_PATH = `${SIGN_IN_PATH}?reason=not-staff`;

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * The user's active LuxuryBoma staff row, or null. Readable before two-factor
 * because staff_members lets every user read their own row.
 */
export async function findLbStaff(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from("staff_members")
    .select("role, display_name")
    .eq("user_id", userId)
    .is("client_id", null)
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error(`Could not read the staff record: ${error.message}`);
  return data;
}

async function verifiedClaims(supabase: Client) {
  const { data } = await supabase.auth.getClaims();
  return data?.claims ?? null;
}

/**
 * For every console page and action behind sign-in: a LuxuryBoma staff member
 * signed in with two-factor. Anyone else is redirected.
 */
export async function requireStaff(): Promise<Staff> {
  const supabase = await createClient();
  const claims = await verifiedClaims(supabase);
  if (!claims) redirect(SIGN_IN_PATH);
  if (claims.aal !== "aal2") redirect(TWO_FACTOR_PATH);

  const staff = await findLbStaff(supabase, claims.sub);
  if (!staff) redirect(NOT_STAFF_PATH);

  return {
    userId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    role: staff.role,
    displayName: staff.display_name,
  };
}

export type TwoFactorStep = { kind: "verify"; factorId: string } | { kind: "enrol" };

/**
 * For the two-factor page: a staff member signed in with a password. Returns
 * whether they still need to set up an authenticator app or just enter a code.
 */
export async function getTwoFactorStep(): Promise<TwoFactorStep> {
  const supabase = await createClient();
  const claims = await verifiedClaims(supabase);
  if (!claims) redirect(SIGN_IN_PATH);
  if (!(await findLbStaff(supabase, claims.sub))) redirect(NOT_STAFF_PATH);
  if (claims.aal === "aal2") redirect(CONSOLE_HOME_PATH);

  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw new Error(`Could not read two-factor settings: ${error.message}`);

  // `totp` lists verified authenticator apps only.
  const app = data.totp[0];
  return app ? { kind: "verify", factorId: app.id } : { kind: "enrol" };
}

/**
 * For Server Actions in the two-factor step: the server client and user id of
 * a signed-in staff member at any assurance level, or a redirect.
 */
export async function requireStaffAnyLevel() {
  const supabase = await createClient();
  const claims = await verifiedClaims(supabase);
  if (!claims) redirect(SIGN_IN_PATH);
  if (!(await findLbStaff(supabase, claims.sub))) redirect(NOT_STAFF_PATH);
  return { supabase, userId: claims.sub, level: claims.aal };
}
