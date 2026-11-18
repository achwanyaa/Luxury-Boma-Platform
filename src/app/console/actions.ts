"use server";

import { redirect } from "next/navigation";
import { CONSOLE_HOME_PATH, SIGN_IN_PATH, TWO_FACTOR_PATH } from "@/lib/console/access";
import { findLbStaff, requireStaffAnyLevel } from "@/lib/console/staff";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error: string } | undefined;

/** Echoes the email back so a wrong password doesn't clear it. */
export type SignInState = { error: string; email: string } | undefined;

export type EnrolState =
  | { factorId: string; qrCode: string; secret: string }
  | { error: string }
  | undefined;

/** Step 1: email and password. Only LuxuryBoma staff get past this point. */
export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fail = (error: string) => ({ error, email });

  if (!supabaseConfigured) return fail("The console is not connected to the database yet.");
  if (!email || !password) return fail("Enter your email and password.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") return fail("This email address has not been confirmed yet.");
    if (error?.code === "invalid_credentials") return fail("Wrong email or password.");
    return fail("Could not sign in just now. Try again in a minute.");
  }

  if (!(await findLbStaff(supabase, data.user.id))) {
    // Local scope: leave the person's other sessions (a buyer account on a
    // client portal, say) alone.
    await supabase.auth.signOut({ scope: "local" });
    return fail("This account is not a LuxuryBoma staff account.");
  }

  redirect(TWO_FACTOR_PATH);
}

/** First visit only: create an authenticator-app factor and return its QR code. */
export async function startEnrolment(): Promise<EnrolState> {
  const { supabase } = await requireStaffAnyLevel();

  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return { error: "Could not read your two-factor settings. Try again." };
  if (factors.totp.length > 0) redirect(TWO_FACTOR_PATH);

  // Clear any half-finished set-up so they don't pile up on the account.
  for (const factor of factors.all) {
    if (factor.factor_type === "totp" && factor.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Authenticator app",
    issuer: "LuxuryBoma console",
  });
  if (error) return { error: "Could not start the set-up. Try again." };

  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

/** Step 2: the 6-digit code. Confirms a new app or checks an existing one. */
export async function verifyCode(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireStaffAnyLevel();

  const factorId = String(formData.get("factorId") ?? "");
  const code = String(formData.get("code") ?? "").replace(/\s+/g, "");
  if (!factorId) return { error: "Something went wrong. Reload the page and try again." };
  if (!/^\d{6}$/.test(code)) return { error: "Enter the 6-digit code from your app." };

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) {
    return { error: "That code didn't work. Codes change every 30 seconds, so use the one showing now." };
  }

  redirect(CONSOLE_HOME_PATH);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect(SIGN_IN_PATH);
}
