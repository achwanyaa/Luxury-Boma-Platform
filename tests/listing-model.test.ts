import { describe, expect, it } from "vitest";
import {
  applyFilters,
  availabilityText,
  filtersToQuery,
  formatPrice,
  hasActiveFilters,
  parseFilters,
  provenanceSummary,
  whatsappLink,
} from "../src/lib/portal/listing-model";
import { SAMPLE_PROPERTIES } from "../src/lib/portal/sample";

const slugs = (list: { slug: string }[]) => list.map((p) => p.slug);

describe("listing wording", () => {
  it("formats prices, and never shows a number when the price is on request", () => {
    expect(formatPrice(650000, "KES", "month", false)).toBe("KES 650,000 / month");
    expect(formatPrice(68000000, "KES", "total", false)).toBe("KES 68,000,000");
    expect(formatPrice(1200000, "KES", "year", false)).toBe("KES 1,200,000 / year");
    expect(formatPrice(650000, "KES", "month", true)).toBe("Price on request");
    expect(formatPrice(null, "KES", "month", false)).toBe("Price on request");
  });

  it("words availability from the date, unless the listing has its own note", () => {
    expect(availabilityText(null, null, "2026-11-25")).toBe("Available now");
    expect(availabilityText("2026-11-01", null, "2026-11-25")).toBe("Available now");
    expect(availabilityText("2027-01-01", null, "2026-11-25")).toBe("Available from Jan 2027");
    expect(availabilityText("2027-01-01", "  Ready after fit-out ", "2026-11-25")).toBe("Ready after fit-out");
  });

  it("counts facts by provenance label", () => {
    const a1 = SAMPLE_PROPERTIES.find((p) => p.slug === "godown-a1")!;
    expect(provenanceSummary(a1.facts)).toEqual({ measured: 5, fromDrawings: 4, other: 4, unchecked: 1, total: 14 });
  });

  it("builds a WhatsApp link with the property named", () => {
    const link = whatsappLink("254725073496", "Realogic", { name: "Godown A1", reference: "A1" });
    expect(link.startsWith("https://wa.me/254725073496?text=")).toBe(true);
    expect(decodeURIComponent(link.split("text=")[1])).toBe("Hello Realogic, I'm interested in Godown A1 (ref A1).");
  });
});

describe("listing filters", () => {
  it("drops unknown values from the address bar", () => {
    expect(parseFilters({ deal: "rent", size: "huge", sort: "price", location: "" })).toEqual({
      deal: null,
      size: null,
      location: null,
      sort: "newest",
    });
    expect(parseFilters({ deal: ["sale", "lease"], size: "500-1000", sort: "size-asc", location: "Athi River" })).toEqual({
      deal: "sale",
      size: "500-1000",
      location: "Athi River",
      sort: "size-asc",
    });
  });

  it("round-trips filters through the address, leaving defaults out", () => {
    expect(filtersToQuery(parseFilters({}))).toBe("");
    const filters = parseFilters({ deal: "lease", size: "2000-", sort: "size-desc" });
    expect(filtersToQuery(filters)).toBe("?deal=lease&size=2000-&sort=size-desc");
    expect(hasActiveFilters(parseFilters({ sort: "size-asc" }))).toBe(false);
    expect(hasActiveFilters(filters)).toBe(true);
  });

  it("filters by deal, size band and location", () => {
    const all = SAMPLE_PROPERTIES;
    expect(slugs(applyFilters(all, parseFilters({ deal: "sale" })))).toEqual(["godown-b1", "godown-a2"]);
    expect(slugs(applyFilters(all, parseFilters({ deal: "lease" })))).toEqual(["godown-a2", "godown-a1"]);
    expect(slugs(applyFilters(all, parseFilters({ size: "500-1000" })))).toEqual(["godown-a2"]);
    expect(slugs(applyFilters(all, parseFilters({ size: "2000-" })))).toEqual(["godown-b1"]);
    expect(slugs(applyFilters(all, parseFilters({ location: "Athi River, Machakos" })))).toEqual(["godown-b1"]);
  });

  it("leaves out a property with no recorded floor area when a size band is chosen", () => {
    const noArea = { ...SAMPLE_PROPERTIES[0], slug: "no-area", facts: [] };
    expect(slugs(applyFilters([noArea], parseFilters({})))).toEqual(["no-area"]);
    expect(slugs(applyFilters([noArea], parseFilters({ size: "0-500" })))).toEqual([]);
  });

  it("sorts by newest or by size", () => {
    const all = SAMPLE_PROPERTIES;
    expect(slugs(applyFilters(all, parseFilters({})))).toEqual(["godown-b1", "godown-a2", "godown-a1"]);
    expect(slugs(applyFilters(all, parseFilters({ sort: "size-asc" })))).toEqual(["godown-a2", "godown-a1", "godown-b1"]);
    expect(slugs(applyFilters(all, parseFilters({ sort: "size-desc" })))).toEqual(["godown-b1", "godown-a1", "godown-a2"]);
  });
});
