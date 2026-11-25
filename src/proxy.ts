import { NextResponse, type NextRequest } from "next/server";
import { adminPath, consolePathFor, consoleRedirect, LOGIN_ALIASES, SIGN_IN_PATH, sessionLevel } from "@/lib/console/access";
import { routePrefixForHost } from "@/lib/sites";
import { refreshSession } from "@/lib/supabase/session";

// Sends each request to the folder it belongs to and keeps the visitor's
// Supabase session fresh:
// - /admin/... on any host is the LuxuryBoma console (src/app/console);
// - /login is a short way to the console's sign-in page;
// - everything else goes to the site for the domain (see src/lib/sites.ts).
// On the console it also turns away visitors without a two-factor session
// before any page renders; pages and actions still check for themselves
// (src/lib/console/staff.ts).
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (LOGIN_ALIASES.includes(pathname)) {
    return NextResponse.redirect(new URL(adminPath(SIGN_IN_PATH), request.url), 307);
  }

  const hostPrefix = routePrefixForHost(request.headers.get("host"), process.env.DEFAULT_SITE);
  const consolePath = consolePathFor(pathname);

  // The console's own host names (console.localhost, console.luxuryboma.com)
  // now just lead to /admin, so every console address has one form.
  if (consolePath === null && hostPrefix === "/console") {
    const target = request.nextUrl.clone();
    target.pathname = adminPath(pathname);
    return NextResponse.redirect(target, 308);
  }

  const prefix = consolePath === null ? hostPrefix : "/console";
  const inner = consolePath ?? pathname;
  const url = request.nextUrl.clone();
  url.pathname = `${prefix}${inner === "/" ? "" : inner}`;

  const { response, claims } = await refreshSession(request, NextResponse.rewrite(url));

  if (consolePath !== null) {
    const target = consoleRedirect(consolePath, sessionLevel(claims));
    if (target) {
      // 303 turns a form post into a plain page load at the new address.
      const status = request.method === "GET" || request.method === "HEAD" ? 307 : 303;
      const redirect = NextResponse.redirect(new URL(adminPath(target), request.url), status);
      for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
      return redirect;
    }
  }

  return response;
}

export const config = {
  // Everything except Next.js internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)"],
};
