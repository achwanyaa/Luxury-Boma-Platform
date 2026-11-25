import { describe, expect, it } from "vitest";
import {
  describeSaveError,
  EMPTY_PROPERTY,
  propertyToInput,
  readPropertyForm,
  slugify,
  validateProperty,
  type PropertyInput,
} from "../src/lib/console/property-form";

const TODAY = "2026-11-25";
const CLIENT = "8342d565-ad5d-42e6-8795-d48e669ebcd6";

const valid = (change: Partial<PropertyInput> = {}): PropertyInput => ({
  ...EMPTY_PROPERTY,
  client_id: CLIENT,
  reference: "RL-RFK-A7",
  name: "Rafiki Machinery Industrial Park, Godown A7",
  slug: "rafiki-godown-a7",
  ...change,
});

describe("property form: slugs", () => {
  it("makes a web address part the database accepts", () => {
    expect(slugify("Rafiki Machinery Industrial Park, Godown A7")).toBe("rafiki-machinery-industrial-park-godown-a7");
    expect(slugify("  Godown  B1 — Ruiru  ")).toBe("godown-b1-ruiru");
    expect(slugify("Café Été")).toBe("cafe-ete");
    expect(slugify("!!!")).toBe("");
  });

  it("keeps slugs short and never ends on a hyphen", () => {
    const slug = slugify("a".repeat(79) + " b c d");
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("rejects a slug with capitals, spaces or other characters", () => {
    for (const slug of ["Godown-A7", "godown a7", "godown_a7", "godown/a7"]) {
      const result = validateProperty(valid({ slug }), TODAY);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.slug).toMatch(/lower-case/);
    }
  });
});

describe("property form: required fields", () => {
  it("accepts the minimum: client, reference, name and slug", () => {
    const result = validateProperty(valid(), TODAY);
    expect(result).toEqual({
      ok: true,
      values: expect.objectContaining({ client_id: CLIENT, reference: "RL-RFK-A7", address: null, latitude: null }),
    });
  });

  it("names every missing required field", () => {
    const result = validateProperty(EMPTY_PROPERTY, TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(["client_id", "name", "reference", "slug"]);
  });

  it("trims what was typed and turns blank optional fields into nulls", () => {
    const form = new FormData();
    form.set("client_id", CLIENT);
    form.set("reference", "  RL-RFK-A7 ");
    form.set("name", "Godown A7");
    form.set("slug", "godown-a7");
    form.set("near", "   ");
    const input = readPropertyForm(form);
    expect(input.reference).toBe("RL-RFK-A7");
    const result = validateProperty(input, TODAY);
    expect(result.ok && result.values.near).toBe(null);
  });

  it("round-trips a database row into the form", () => {
    const input = propertyToInput({ ...valid(), latitude: -1.1, longitude: 36.9, address: null });
    expect(input.latitude).toBe("-1.1");
    expect(input.address).toBe("");
  });
});

describe("property form: map point and site visit", () => {
  it("needs both coordinates or neither, each in range", () => {
    const both = validateProperty(valid({ latitude: "-1.145", longitude: "36.96" }), TODAY);
    expect(both.ok && [both.values.latitude, both.values.longitude]).toEqual([-1.145, 36.96]);

    const one = validateProperty(valid({ latitude: "-1.145" }), TODAY);
    expect(!one.ok && one.errors.longitude).toMatch(/both/);

    const far = validateProperty(valid({ latitude: "91", longitude: "abc" }), TODAY);
    expect(!far.ok && Object.keys(far.errors).sort()).toEqual(["latitude", "longitude"]);
  });

  it("takes a site visit today or earlier, never in the future", () => {
    expect(validateProperty(valid({ site_visited_on: "2026-09-30" }), TODAY).ok).toBe(true);
    expect(validateProperty(valid({ site_visited_on: TODAY }), TODAY).ok).toBe(true);
    const future = validateProperty(valid({ site_visited_on: "2026-11-26" }), TODAY);
    expect(!future.ok && future.errors.site_visited_on).toMatch(/future/);
    const junk = validateProperty(valid({ site_visited_on: "30/09/2026" }), TODAY);
    expect(!junk.ok && junk.errors.site_visited_on).toMatch(/date/);
  });
});

describe("property form: database refusals", () => {
  it("points a duplicate reference or slug at its field", () => {
    expect(
      describeSaveError({ code: "23505", message: 'duplicate key value violates unique constraint "properties_client_id_reference_key"' }),
    ).toEqual({ field: "reference", message: expect.stringMatching(/reference/) });
    expect(
      describeSaveError({ code: "23505", message: 'duplicate key value violates unique constraint "properties_client_id_slug_key"' }).field,
    ).toBe("slug");
  });

  it("explains the live-needs-a-site-visit rule and permission refusals", () => {
    expect(describeSaveError({ code: "23514", message: 'violates check constraint "live_needs_site_visit"' }).field).toBe(
      "site_visited_on",
    );
    expect(describeSaveError({ code: "42501", message: "new row violates row-level security policy" }).message).toMatch(
      /isn't allowed/,
    );
  });

  it("never passes raw database text through", () => {
    const { message, field } = describeSaveError({ code: "XX000", message: "internal: relation foo" });
    expect(field).toBeUndefined();
    expect(message).not.toMatch(/relation/);
  });
});
