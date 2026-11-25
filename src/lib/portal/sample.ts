// SAMPLE DATA FOR LOCAL DEVELOPMENT ONLY. Shown only when PORTAL_SAMPLE_LISTINGS=1
// and the build is not production (see listings.ts). Godown A1 matches
// supabase/seed.sql; A2 and B1 are invented to fill the grid. None of these
// figures are verified, and every page that shows them says so.

import type { Fact, PortalProperty } from "./listing-model";

// Drawn placeholders, clearly marked, so the gallery can be checked without real photos.
const samplePhoto = (n: number, caption: string) => ({
  url: `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="#${["D3DCE8", "C9D4E6", "EEF1F6"][n % 3]}"/><path d="M0 600 800 0M-200 600 600 0M200 600 1000 0" stroke="#0C1B33" stroke-opacity=".08" stroke-width="40"/><text x="400" y="290" text-anchor="middle" font-family="Arial" font-size="44" font-weight="700" fill="#3B4A63">SAMPLE PHOTO ${n}</text><text x="400" y="345" text-anchor="middle" font-family="Arial" font-size="28" fill="#3B4A63">${caption}</text></svg>`,
  )}`,
  caption,
});

const SAMPLE_PHOTOS = [
  samplePhoto(1, "Front of the unit"),
  samplePhoto(2, "Main floor"),
  samplePhoto(3, "Under the mezzanine"),
  samplePhoto(4, "Stairs"),
  samplePhoto(5, "Office"),
];

const DRAWING = "Drawing A-101 rev C, Sketch3D Ltd (developer's architect)";

type Row = [key: string, display: string, value: number | boolean | null, label: Fact["label"], source?: string, method?: string];

const CATALOGUE: Record<string, { name: string; group: Fact["group"]; headline: string | null; sort: number }> = {
  plinth_area: { name: "Plinth area", group: "structure", headline: null, sort: 10 },
  floor_area: { name: "Warehouse floor area", group: "structure", headline: "Floor area", sort: 20 },
  mezzanine_area: { name: "Mezzanine office", group: "structure", headline: null, sort: 30 },
  clear_height: { name: "Clear height under truss", group: "structure", headline: "Clear height", sort: 40 },
  floor_load: { name: "Floor load", group: "structure", headline: "Floor load", sort: 50 },
  mezzanine_load: { name: "Mezzanine load", group: "structure", headline: null, sort: 60 },
  loading_doors: { name: "Loading doors", group: "access", headline: "Loading doors", sort: 70 },
  yard_area: { name: "Yard area", group: "access", headline: "Yard area", sort: 80 },
  truck_turning: { name: "Truck turning", group: "access", headline: null, sort: 90 },
  gate_width: { name: "Gate width", group: "access", headline: null, sort: 100 },
  power_supply: { name: "Power supply", group: "power", headline: "Power supply", sort: 110 },
  water_storage: { name: "Water storage", group: "power", headline: null, sort: 120 },
  temperature_control: { name: "Temperature control", group: "power", headline: null, sort: 130 },
  nema_licence: { name: "NEMA licence", group: "legal", headline: null, sort: 140 },
};

function facts(rows: Row[]): Fact[] {
  return rows.map(([key, display, value, label, source, method]) => {
    const def = CATALOGUE[key];
    return {
      key,
      name: def.name,
      group: def.group,
      headlineLabel: def.headline,
      display,
      value,
      label,
      source: source ?? (label === "measured" ? "LuxuryBoma" : null),
      method: method ?? null,
      checkedOn: label === "measured" ? "2026-10-21" : label === "from_drawings" ? "2026-10-22" : null,
      sortOrder: def.sort,
    };
  });
}

export const SAMPLE_PROPERTIES: PortalProperty[] = [
  {
    slug: "godown-a1",
    reference: "SAMPLE-A1",
    name: "Godown A1",
    areaLabel: "Mombasa Road, Nairobi",
    near: "near Syokimau",
    address: "Mombasa Road, Nairobi",
    siteVisitedOn: "2026-10-21",
    publishedAt: "2026-10-25T09:00:00Z",
    offers: [
      {
        deal: "lease",
        price: null,
        priceText: "Price on request",
        availableFrom: "2027-01-01",
        availabilityText: "Available Jan 2027",
        description:
          "A warehouse with a mezzanine office, two loading doors and a yard. Suits storage, distribution and light manufacturing. Needs fit-out for temperature-controlled storage.",
      },
    ],
    facts: facts([
      ["plinth_area", "2,140 m²", 2140, "from_drawings", DRAWING],
      ["floor_area", "1,850 m²", 1850, "measured", undefined, "Laser measure, 14 points"],
      ["mezzanine_area", "220 m²", 220, "from_drawings", DRAWING],
      ["clear_height", "9.5 m", 9.5, "measured", undefined, "Laser measure, lowest of 6 bays"],
      ["floor_load", "30 kN/m²", 30, "from_drawings", "Slab design note S-201 rev A, structural engineer for Sketch3D Ltd"],
      ["mezzanine_load", "Not yet checked", null, "not_yet_checked", "Waiting for the structural engineer's note."],
      ["loading_doors", "2 doors", 2, "measured", undefined, "Tape measure. Each 4.5 × 5 m."],
      ["yard_area", "900 m²", 900, "from_drawings", DRAWING],
      ["truck_turning", "Fits a 40 ft truck", true, "indicative", undefined, "Estimated from the yard layout on A-101."],
      ["gate_width", "7.0 m", 7, "measured", undefined, "Tape measure"],
      ["power_supply", "200 kVA", 200, "declared", "Stated by Realogic by email. Not yet checked."],
      ["water_storage", "50,000 litres", 50000, "declared", "Stated by Realogic by email. Not yet checked."],
      ["temperature_control", "None", false, "measured", undefined, "No cooling plant on site"],
      ["nema_licence", "No record found", null, "not_found", "A missing record does not mean all is clear.", "NEMA public register searched"],
    ]),
    photos: SAMPLE_PHOTOS,
    video: null,
    tourUrl: null,
    sample: true,
  },
  {
    slug: "godown-a2",
    reference: "SAMPLE-A2",
    name: "Godown A2",
    areaLabel: "Mombasa Road, Nairobi",
    near: "near Syokimau",
    address: "Mombasa Road, Nairobi",
    siteVisitedOn: "2026-10-21",
    publishedAt: "2026-10-26T09:00:00Z",
    offers: [
      {
        deal: "lease",
        price: 480000,
        priceText: "KES 480,000 / month",
        availableFrom: null,
        availabilityText: "Available now",
        description: "A smaller unit next to A1 with one loading door and shared yard access.",
      },
      {
        deal: "sale",
        price: 68000000,
        priceText: "KES 68,000,000",
        availableFrom: null,
        availabilityText: "Available now",
        description: "A smaller unit next to A1 with one loading door and shared yard access.",
      },
    ],
    facts: facts([
      ["floor_area", "920 m²", 920, "measured"],
      ["clear_height", "8.0 m", 8, "measured"],
      ["floor_load", "25 kN/m²", 25, "from_drawings", DRAWING],
      ["loading_doors", "1 door", 1, "measured"],
      ["yard_area", "450 m²", 450, "from_drawings", DRAWING],
      ["power_supply", "Not yet checked", null, "not_yet_checked"],
    ]),
    photos: [],
    video: null,
    tourUrl: null,
    sample: true,
  },
  {
    slug: "godown-b1",
    reference: "SAMPLE-B1",
    name: "Godown B1",
    areaLabel: "Athi River, Machakos",
    near: "off Namanga Road",
    address: "Athi River, Machakos",
    siteVisitedOn: "2026-11-02",
    publishedAt: "2026-11-04T09:00:00Z",
    offers: [
      {
        deal: "sale",
        price: null,
        priceText: "Price on request",
        availableFrom: "2027-03-01",
        availabilityText: "Available from Mar 2027",
        description: "A large distribution godown with four loading doors and a deep yard for 40 ft trucks.",
      },
    ],
    facts: facts([
      ["floor_area", "3,200 m²", 3200, "from_drawings", DRAWING],
      ["clear_height", "11 m", 11, "from_drawings", DRAWING],
      ["floor_load", "40 kN/m²", 40, "from_drawings", DRAWING],
      ["loading_doors", "4 doors", 4, "from_drawings", DRAWING],
      ["yard_area", "1,600 m²", 1600, "from_drawings", DRAWING],
      ["power_supply", "315 kVA", 315, "declared", "Stated by Realogic. Not yet checked."],
    ]),
    photos: [],
    video: null,
    tourUrl: null,
    sample: true,
  },
];
