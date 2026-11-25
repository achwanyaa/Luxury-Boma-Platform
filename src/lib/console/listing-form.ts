// Pure rules for the console's listing form (one listing per deal on a
// property). Unit-tested; no server code here.

export type Deal = "lease" | "sale";
export type ListingStatus = "draft" | "active" | "paused" | "closed";
export type PricePeriod = "month" | "year" | "total";

export const DEALS: Deal[] = ["lease", "sale"];

export const LISTING_STATUS_LABEL: Record<ListingStatus, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  closed: "Closed",
};

export const LISTING_STATUSES: ListingStatus[] = ["draft", "active", "paused", "closed"];

/** Which price periods make sense for each deal. A sale price is always the total. */
export const PERIODS_FOR: Record<Deal, { value: PricePeriod; label: string }[]> = {
  lease: [
    { value: "month", label: "per month" },
    { value: "year", label: "per year" },
  ],
  sale: [{ value: "total", label: "total" }],
};

export type ListingInput = {
  price: string;
  price_period: string;
  price_on_request: boolean;
  available_from: string;
  availability_note: string;
  description: string;
  status: string;
};

export type ListingField = keyof ListingInput;
export type ListingErrors = Partial<Record<ListingField, string>>;

export type ListingValues = {
  price: number | null;
  currency: "KES";
  price_period: PricePeriod | null;
  price_on_request: boolean;
  available_from: string | null;
  availability_note: string | null;
  description: string | null;
  status: ListingStatus;
};

export const NOTE_LIMIT = 80;
export const DESCRIPTION_LIMIT = 2000;

export function emptyListing(deal: Deal): ListingInput {
  return {
    price: "",
    price_period: deal === "sale" ? "total" : "month",
    price_on_request: true,
    available_from: "",
    availability_note: "",
    description: "",
    status: "draft",
  };
}

type ListingRow = {
  price: number | null;
  price_period: string | null;
  price_on_request: boolean;
  available_from: string | null;
  availability_note: string | null;
  description: string | null;
  status: string;
};

export function listingToInput(row: ListingRow | null | undefined, deal: Deal): ListingInput {
  if (!row) return emptyListing(deal);
  return {
    price: row.price === null ? "" : String(row.price),
    price_period: row.price_period ?? emptyListing(deal).price_period,
    price_on_request: row.price_on_request,
    available_from: row.available_from ?? "",
    availability_note: row.availability_note ?? "",
    description: row.description ?? "",
    status: row.status,
  };
}

export function readListingForm(form: { get(name: string): unknown }): ListingInput {
  const text = (name: string) => {
    const raw = form.get(name);
    return typeof raw === "string" ? raw.trim() : "";
  };
  return {
    price: text("price"),
    price_period: text("price_period"),
    price_on_request: form.get("price_on_request") === "on",
    available_from: text("available_from"),
    availability_note: text("availability_note"),
    description: text("description"),
    status: text("status"),
  };
}

/** "KES 650,000" or "650 000" -> 650000. Null when it isn't a whole, non-negative amount. */
export function parsePrice(text: string): number | null {
  const cleaned = text.replace(/^kes\s*/i, "").replace(/[\s,]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const DATE_RULE = /^\d{4}-\d{2}-\d{2}$/;

export function validateListing(
  deal: Deal,
  input: ListingInput,
): { ok: true; values: ListingValues } | { ok: false; errors: ListingErrors } {
  const errors: ListingErrors = {};

  if (!LISTING_STATUSES.includes(input.status as ListingStatus)) errors.status = "Choose a status.";

  let price: number | null = null;
  let period: PricePeriod | null = null;
  if (!input.price_on_request) {
    if (!input.price) errors.price = "Enter the price, or tick “Price on request”.";
    else {
      price = parsePrice(input.price);
      if (price === null) errors.price = "Enter the amount in shillings, digits only, for example 650000.";
      else if (price === 0) errors.price = "A price of zero isn't a price. Tick “Price on request” instead.";
    }
    const allowed = PERIODS_FOR[deal].map((p) => p.value);
    if (!allowed.includes(input.price_period as PricePeriod)) {
      errors.price_period = deal === "lease" ? "Choose per month or per year." : "A sale price is the total.";
    } else period = input.price_period as PricePeriod;
  }

  if (input.available_from && (!DATE_RULE.test(input.available_from) || Number.isNaN(Date.parse(input.available_from)))) {
    errors.available_from = "Enter a date.";
  }
  if (input.availability_note.length > NOTE_LIMIT) {
    errors.availability_note = `Keep it under ${NOTE_LIMIT} characters; it shows on the listing card.`;
  }
  if (input.description.length > DESCRIPTION_LIMIT) {
    errors.description = `Keep it under ${DESCRIPTION_LIMIT} characters.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const orNull = (text: string) => (text === "" ? null : text);
  return {
    ok: true,
    values: {
      price,
      currency: "KES",
      price_period: period,
      price_on_request: input.price_on_request,
      available_from: orNull(input.available_from),
      availability_note: orNull(input.availability_note),
      description: orNull(input.description),
      status: input.status as ListingStatus,
    },
  };
}

/**
 * Why an active listing still doesn't show on the portal, or null when it does.
 * The portal shows a listing only when it is active and its property is live.
 */
export function listingVisibility(listingStatus: string, propertyStatus: string): string | null {
  if (listingStatus !== "active") return "Not on the portal: only active listings show.";
  if (propertyStatus !== "live") return "Active, but the portal shows it only once the property is live.";
  return null;
}

export function describeListingError(error: { code?: string; message?: string }): string {
  if (error.code === "23505") return "This property already has a listing for that deal. Reload the page.";
  if (error.code === "42501") return "Your account isn't allowed to make this change.";
  if (error.code === "23514") return "The price must be zero or more, and the period per month, per year or total.";
  return "Could not save just now. Try again in a minute.";
}
