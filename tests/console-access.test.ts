import { describe, expect, it } from "vitest";
import { adminPath, consolePathFor, consoleRedirect, LOGIN_ALIASES, sessionLevel } from "../src/lib/console/access";

describe("console access (proxy redirect)", () => {
  it("reads the assurance level from the token claims", () => {
    expect(sessionLevel(null)).toBe(null);
    expect(sessionLevel(undefined)).toBe(null);
    expect(sessionLevel({})).toBe("aal1");
    expect(sessionLevel({ aal: "aal1" })).toBe("aal1");
    expect(sessionLevel({ aal: "aal2" })).toBe("aal2");
    expect(sessionLevel({ aal: "AAL2" })).toBe("aal1");
  });

  it("sends visitors who are not signed in to sign-in", () => {
    expect(consoleRedirect("/", null)).toBe("/sign-in");
    expect(consoleRedirect("/properties", null)).toBe("/sign-in");
    expect(consoleRedirect("/two-factor", null)).toBe("/sign-in");
    expect(consoleRedirect("/sign-in", null)).toBe(null);
  });

  it("holds a password-only session at the two-factor step", () => {
    expect(consoleRedirect("/", "aal1")).toBe("/two-factor");
    expect(consoleRedirect("/properties", "aal1")).toBe("/two-factor");
    expect(consoleRedirect("/two-factor", "aal1")).toBe(null);
    expect(consoleRedirect("/sign-in", "aal1")).toBe(null);
  });

  it("lets a two-factor session through", () => {
    expect(consoleRedirect("/", "aal2")).toBe(null);
    expect(consoleRedirect("/properties", "aal2")).toBe(null);
    // Not bounced away from sign-in: a non-staff account is sent there and
    // must be able to sign out, so the proxy never loops.
    expect(consoleRedirect("/sign-in", "aal2")).toBe(null);
  });
});

describe("console addresses under /admin", () => {
  it("puts every console page under /admin", () => {
    expect(adminPath("/")).toBe("/admin");
    expect(adminPath("/sign-in")).toBe("/admin/sign-in");
    expect(adminPath("/properties/abc")).toBe("/admin/properties/abc");
  });

  it("recognises console addresses and nothing else", () => {
    expect(consolePathFor("/admin")).toBe("/");
    expect(consolePathFor("/admin/")).toBe("/");
    expect(consolePathFor("/admin/properties/new")).toBe("/properties/new");
    expect(consolePathFor("/administration")).toBe(null);
    expect(consolePathFor("/properties")).toBe(null);
    expect(consolePathFor("/")).toBe(null);
  });

  it("round-trips, so the proxy and the links agree", () => {
    for (const path of ["/", "/sign-in", "/two-factor", "/properties", "/documents/x"]) {
      expect(consolePathFor(adminPath(path))).toBe(path);
    }
  });

  it("takes /login to sign-in", () => {
    expect(LOGIN_ALIASES).toContain("/login");
  });
});
