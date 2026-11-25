// Where a console visitor may go, decided from the session token alone.
//
// src/proxy.ts uses this for a quick redirect before a page renders. It is
// only a first filter: every console page and Server Action checks the
// session and the staff row again (src/lib/console/staff.ts), and the
// database refuses staff data to any session without two-factor.

// The console lives under /admin on every site (the Realogic portal, Vercel
// addresses, localhost), so it works wherever the app is deployed. Inside the
// app its pages are in src/app/console; the paths below are relative to /admin.
export const ADMIN_BASE = "/admin";

/** Short addresses that lead to the staff sign-in page. */
export const LOGIN_ALIASES = ["/login"];

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

/** The address of a console page: "/properties" -> "/admin/properties", "/" -> "/admin". */
export function adminPath(path: string): string {
  return path === "/" ? ADMIN_BASE : `${ADMIN_BASE}${path}`;
}

/** The console page an address points at ("/admin/properties" -> "/properties"), or null outside the console. */
export function consolePathFor(pathname: string): string | null {
  if (pathname === ADMIN_BASE || pathname === `${ADMIN_BASE}/`) return "/";
  if (pathname.startsWith(`${ADMIN_BASE}/`)) return pathname.slice(ADMIN_BASE.length);
  return null;
}
