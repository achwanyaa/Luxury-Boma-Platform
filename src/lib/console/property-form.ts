// Pure rules for the console's property form: reading the submitted fields,
// checking them the way the database will, and turning database refusals
// into sentences. No server code here, so it is unit-tested directly.

export type PropertyStatus = "draft" | "in_review" | "live" | "paused" | "sold_or_leased";

export const STATUS_LABEL: Record<PropertyStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  live: "Live",
  paused: "Paused",
  sold_or_leased: "Sold or leased",
};

export const STATUS_ORDER: PropertyStatus[] = ["draft", "in_review", "live", "paused", "sold_or_leased"];

/** The fields the form edits, as the user typed them. */
export type PropertyInput = {
  client_id: string;
  reference: string;
  name: string;
  slug: string;
  address: string;
  area_label: string;
  near: string;
  latitude: string;
  longitude: string;
  designed_by: string;
  developed_by: string;
  site_visited_on: string;
};

export const PROPERTY_FIELDS = [
  "client_id",
  "reference",
  "name",
  "slug",
  "address",
  "area_label",
  "near",
  "latitude",
  "longitude",
  "designed_by",
  "developed_by",
  "site_visited_on",
] as const satisfies readonly (keyof PropertyInput)[];

export type PropertyField = (typeof PROPERTY_FIELDS)[number];
export type FieldErrors = Partial<Record<PropertyField, string>>;

/** What the database row receives. Blank optional fields become null. */
export type PropertyValues = {
  client_id: string;
  reference: string;
  name: string;
  slug: string;
  address: string | null;
  area_label: string | null;
  near: string | null;
  latitude: number | null;
  longitude: number | null;
  designed_by: string | null;
  developed_by: string | null;
  site_visited_on: string | null;
};

export const EMPTY_PROPERTY: PropertyInput = Object.fromEntries(
  PROPERTY_FIELDS.map((f) => [f, ""]),
) as PropertyInput;

/** Row from the database -> form input. */
export function propertyToInput(row: Partial<Record<PropertyField, string | number | null>>): PropertyInput {
  return Object.fromEntries(
    PROPERTY_FIELDS.map((f) => [f, row[f] === null || row[f] === undefined ? "" : String(row[f])]),
  ) as PropertyInput;
}

/** Submitted form -> trimmed input. */
export function readPropertyForm(form: { get(name: string): unknown }): PropertyInput {
  return Object.fromEntries(
    PROPERTY_FIELDS.map((f) => {
      const raw = form.get(f);
      return [f, typeof raw === "string" ? raw.trim() : ""];
    }),
  ) as PropertyInput;
}

/** "Godown A7, Rafiki Park" -> "godown-a7-rafiki-park". Matches the database's slug rule. */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

const SLUG_RULE = /^[a-z0-9-]+$/;
const DATE_RULE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RULE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function coordinate(text: string, limit: number): number | null | "bad" {
  if (text === "") return null;
  const n = Number(text);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : "bad";
}

/**
 * Checks the input the way the database will, plus a few plain-sense rules.
 * `today` is an ISO date (YYYY-MM-DD), passed in so the rule is testable.
 */
export function validateProperty(
  input: PropertyInput,
  today: string,
): { ok: true; values: PropertyValues } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};

  if (!UUID_RULE.test(input.client_id)) errors.client_id = "Choose the client this property is listed for.";
  if (!input.reference) errors.reference = "Enter the reference, for example RL-RFK-A7.";
  if (!input.name) errors.name = "Enter the property's name.";
  if (!input.slug) errors.slug = "Enter the web address part, for example godown-a7.";
  else if (!SLUG_RULE.test(input.slug)) {
    errors.slug = "Use only lower-case letters, numbers and hyphens.";
  }

  const latitude = coordinate(input.latitude, 90);
  const longitude = coordinate(input.longitude, 180);
  if (latitude === "bad") errors.latitude = "Latitude is a number between -90 and 90.";
  if (longitude === "bad") errors.longitude = "Longitude is a number between -180 and 180.";
  if (latitude !== "bad" && longitude !== "bad" && (latitude === null) !== (longitude === null)) {
    errors[latitude === null ? "latitude" : "longitude"] = "Enter both latitude and longitude, or neither.";
  }

  if (input.site_visited_on) {
    if (!DATE_RULE.test(input.site_visited_on) || Number.isNaN(Date.parse(input.site_visited_on))) {
      errors.site_visited_on = "Enter a date.";
    } else if (input.site_visited_on > today) {
      errors.site_visited_on = "The site visit can't be in the future.";
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const orNull = (text: string) => (text === "" ? null : text);
  return {
    ok: true,
    values: {
      client_id: input.client_id,
      reference: input.reference,
      name: input.name,
      slug: input.slug,
      address: orNull(input.address),
      area_label: orNull(input.area_label),
      near: orNull(input.near),
      latitude: latitude as number | null,
      longitude: longitude as number | null,
      designed_by: orNull(input.designed_by),
      developed_by: orNull(input.developed_by),
      site_visited_on: orNull(input.site_visited_on),
    },
  };
}

/**
 * A database refusal -> a sentence for the form. Unique clashes point at the
 * field; anything else is a general message (never the raw database text).
 */
export function describeSaveError(error: { code?: string; message?: string }): {
  field?: PropertyField;
  message: string;
} {
  const text = error.message ?? "";
  if (error.code === "23505") {
    if (text.includes("reference")) {
      return { field: "reference", message: "This client already has a property with that reference." };
    }
    if (text.includes("slug")) {
      return { field: "slug", message: "This client already has a property at that web address." };
    }
  }
  if (error.code === "23514" && text.includes("live_needs_site_visit")) {
    return {
      field: "site_visited_on",
      message: "A live property needs its site visit date. Take it out of live first to clear the date.",
    };
  }
  if (error.code === "42501") {
    return { message: "Your account isn't allowed to make this change." };
  }
  return { message: "Could not save just now. Try again in a minute." };
}
