import { NextResponse, type NextRequest } from "next/server";
import { consoleRedirect, sessionLevel } from "@/lib/console/access";
import { routePrefixForHost } from "@/lib/sites";
import { refreshSession } from "@/lib/supabase/session";

// Sends each request to the folder for its domain (see src/lib/sites.ts) and
// keeps the visitor's Supabase session fresh. On the console it also turns
// away visitors without a two-factor session before any page renders; pages
// and actions still check for themselves (src/lib/console/staff.ts).
export async function proxy(request: NextRequest) {
  const prefix = routePrefixForHost(request.headers.get("host"), process.env.DEFAULT_SITE);
  const url = request.nextUrl.clone();
  url.pathname = `${prefix}${url.pathname === "/" ? "" : url.pathname}`;

  const { response, claims } = await refreshSession(request, NextResponse.rewrite(url));

  if (prefix === "/console") {
    const target = consoleRedirect(request.nextUrl.pathname, sessionLevel(claims));
    if (target) {
      // 303 turns a form post into a plain page load at the new address.
      const status = request.method === "GET" || request.method === "HEAD" ? 307 : 303;
      const redirect = NextResponse.redirect(new URL(target, request.url), status);
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
