// The portal's view of a live property and its listings, plus the pure rules
// for filtering, sorting and wording them. No database access here, so it can
// be unit-tested and shared by server and client code.

import type { Provenance } from "@/components/ProvenancePill";

export type Deal = "lease" | "sale";
export type SpecGroup = "structure" | "access" | "power" | "legal" | "location";

export const DEAL_LABEL: Record<Deal, string> = { lease: "To let", sale: "For sale" };

export const SPEC_GROUP_LABEL: Record<SpecGroup, string> = {
  structure: "Building",
  access: "Access and yard",
  power: "Power and services",
  legal: "Legal and licences",
  location: "Location",
};

export type Fact = {
  key: string;
  name: string;
  group: SpecGroup;
  /** Short name for the key numbers grid, when the catalogue marks it as a headline fact. */
  headlineLabel: string | null;
  display: string;
  value: number | boolean | null;
  label: Provenance;
  method: string | null;
  source: string | null;
  checkedOn: string | null;
  sortOrder: number;
};

export type Offer = {
  deal: Deal;
  price: number | null;
  priceText: string;
  availableFrom: string | null;
  availabilityText: string;
  description: string | null;
};

export type Photo = { url: string; caption: string | null };

/** The short walkthrough video. It plays only when tapped, with the main photo as its cover. */
export type Walkthrough = { url: string };

export type PortalProperty = {
  slug: string;
  reference: string;
  name: string;
  areaLabel: string | null;
  near: string | null;
  address: string | null;
  siteVisitedOn: string | null;
  publishedAt: string | null;
  offers: Offer[];
  facts: Fact[];
  /** Main photo first, then the rest in the order LuxuryBoma set. */
  photos: Photo[];
  video: Walkthrough | null;
  tourUrl: string | null;
  /** True only for the development sample, never for real data. */
  sample: boolean;
};

// ---------------------------------------------------------------------------
// Wording
// ---------------------------------------------------------------------------

const PERIOD_TEXT: Record<string, string> = { month: " / month", year: " / year", total: "" };

export function formatPrice(
  price: number | null,
  currency: string,
  period: string | null,
  onRequest: boolean,
): string {
  if (onRequest || price === null) return "Price on request";
  const amount = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(price);
  return `${currency} ${amount}${PERIOD_TEXT[period ?? "total"] ?? ""}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `today` is an ISO date (yyyy-mm-dd), passed in so the rule is testable. */
export function availabilityText(availableFrom: string | null, note: string | null, today: string): string {
  if (note && note.trim() !== "") return note.trim();
  if (!availableFrom || availableFrom <= today) return "Available now";
  const [year, month] = availableFrom.split("-");
  return `Available from ${MONTHS[Number(month) - 1]} ${year}`;
}

/** "19,913 sq ft" from square metres. Many Kenyan listings still quote square feet. */
export function squareFeet(squareMetres: number): string {
  return `${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(squareMetres * 10.7639)} sq ft`;
}

/** Headline facts in catalogue order, for cards and the key numbers grid. */
export function headlineFacts(property: PortalProperty): Fact[] {
  return property.facts.filter((f) => f.headlineLabel !== null).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function factByKey(property: PortalProperty, key: string): Fact | undefined {
  return property.facts.find((f) => f.key === key);
}

/** The warehouse floor area in m², only when a value has actually been recorded. */
export function floorArea(property: PortalProperty): number | null {
  const fact = factByKey(property, "floor_area");
  return typeof fact?.value === "number" ? fact.value : null;
}

export type ProvenanceSummary = { measured: number; fromDrawings: number; other: number; unchecked: number; total: number };

/** How a property's facts break down by label: the "measured / from drawings / other" bar. */
export function provenanceSummary(facts: Fact[]): ProvenanceSummary {
  const summary = { measured: 0, fromDrawings: 0, other: 0, unchecked: 0, total: facts.length };
  for (const fact of facts) {
    if (fact.label === "measured") summary.measured++;
    else if (fact.label === "from_drawings") summary.fromDrawings++;
    else if (fact.label === "not_yet_checked") summary.unchecked++;
    else summary.other++;
  }
  return summary;
}

// ---------------------------------------------------------------------------
// Search filters (read from the address bar on /properties)
// ---------------------------------------------------------------------------

export const SIZE_BANDS = [
  { key: "0-500", label: "Under 500 m²", min: null, max: 500 },
  { key: "500-1000", label: "500 to 1,000 m²", min: 500, max: 1000 },
  { key: "1000-2000", label: "1,000 to 2,000 m²", min: 1000, max: 2000 },
  { key: "2000-", label: "Over 2,000 m²", min: 2000, max: null },
] as const;

export const SORTS = [
  { key: "newest", label: "Newest first" },
  { key: "size-desc", label: "Largest first" },
  { key: "size-asc", label: "Smallest first" },
] as const;

export type SortKey = (typeof SORTS)[number]["key"];

export type ListingFilters = {
  deal: Deal | null;
  size: (typeof SIZE_BANDS)[number]["key"] | null;
  location: string | null;
  sort: SortKey;
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.trim() !== "" ? v.trim() : null;
}

/** Unknown or malformed values are dropped, never trusted. */
export function parseFilters(params: SearchParams): ListingFilters {
  const deal = first(params.deal);
  const size = first(params.size);
  const sort = first(params.sort);
  return {
    deal: deal === "lease" || deal === "sale" ? deal : null,
    size: SIZE_BANDS.find((b) => b.key === size)?.key ?? null,
    location: first(params.location)?.slice(0, 80) ?? null,
    sort: SORTS.find((s) => s.key === sort)?.key ?? "newest",
  };
}

export function hasActiveFilters(filters: ListingFilters): boolean {
  return filters.deal !== null || filters.size !== null || filters.location !== null;
}

/** The address for a set of filters; defaults are left out to keep links short. */
export function filtersToQuery(filters: ListingFilters): string {
  const query = new URLSearchParams();
  if (filters.deal) query.set("deal", filters.deal);
  if (filters.size) query.set("size", filters.size);
  if (filters.location) query.set("location", filters.location);
  if (filters.sort !== "newest") query.set("sort", filters.sort);
  const text = query.toString();
  return text ? `?${text}` : "";
}

export function applyFilters(properties: PortalProperty[], filters: ListingFilters): PortalProperty[] {
  const band = SIZE_BANDS.find((b) => b.key === filters.size);

  const matches = properties.filter((p) => {
    if (filters.deal && !p.offers.some((o) => o.deal === filters.deal)) return false;
    if (filters.location && p.areaLabel !== filters.location) return false;
    if (band) {
      // A property with no recorded floor area cannot be shown to fit a size band.
      const area = floorArea(p);
      if (area === null) return false;
      if (band.min !== null && area < band.min) return false;
      if (band.max !== null && area >= band.max) return false;
    }
    return true;
  });

  const bySize = (a: PortalProperty, b: PortalProperty) => (floorArea(a) ?? -1) - (floorArea(b) ?? -1);
  const byNewest = (a: PortalProperty, b: PortalProperty) =>
    (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");

  if (filters.sort === "size-asc") return matches.toSorted((a, b) => bySize(a, b) || byNewest(a, b));
  if (filters.sort === "size-desc") return matches.toSorted((a, b) => bySize(b, a) || byNewest(a, b));
  return matches.toSorted(byNewest);
}

/** Distinct area labels, for the location filter. */
export function locations(properties: PortalProperty[]): string[] {
  return [...new Set(properties.map((p) => p.areaLabel).filter((a): a is string => !!a))].sort();
}

export function whatsappLink(
  number: string,
  siteName: string,
  property?: Pick<PortalProperty, "name" | "reference">,
): string {
  const text = property
    ? `Hello ${siteName}, I'm interested in ${property.name} (ref ${property.reference}).`
    : `Hello ${siteName}, I'm looking for a godown.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
