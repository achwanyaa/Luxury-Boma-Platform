// Where a console visitor may go, decided from the session token alone.
//
// src/proxy.ts uses this for a quick redirect before a page renders. It is
// only a first filter: every console page and Server Action checks the
// session and the staff row again (src/lib/console/staff.ts), and the
// database refuses staff data to any session without two-factor.

export const SIGN_IN_PATH = "/sign-in";
export const TWO_FACTOR_PATH = "/two-factor";
export const CONSOLE_HOME_PATH = "/";

/** null: not signed in. aal1: password only. aal2: password and two-factor. */
export type SessionLevel = "aal1" | "aal2" | null;

export function sessionLevel(claims: { aal?: unknown } | null | undefined): SessionLevel {
  if (!claims) return null;
  return claims.aal === "aal2" ? "aal2" : "aal1";
}

/** The path to send the visitor to instead, or null to let the request through. */
export function consoleRedirect(pathname: string, level: SessionLevel): string | null {
  if (pathname === SIGN_IN_PATH) return null;
  if (level === null) return SIGN_IN_PATH;
  if (pathname === TWO_FACTOR_PATH) return null;
  if (level !== "aal2") return TWO_FACTOR_PATH;
  return null;
}
