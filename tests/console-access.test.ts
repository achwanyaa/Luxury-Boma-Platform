import { describe, expect, it } from "vitest";
import { consoleRedirect, sessionLevel } from "../src/lib/console/access";

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
