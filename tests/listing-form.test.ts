import { describe, expect, it } from "vitest";
import {
  describeListingError,
  emptyListing,
  listingToInput,
  listingVisibility,
  parsePrice,
  readListingForm,
  validateListing,
  type ListingInput,
} from "../src/lib/console/listing-form";

const lease = (change: Partial<ListingInput> = {}): ListingInput => ({ ...emptyListing("lease"), ...change });
const sale = (change: Partial<ListingInput> = {}): ListingInput => ({ ...emptyListing("sale"), ...change });

describe("listing form: price", () => {
  it("reads amounts the way people type them", () => {
    expect(parsePrice("650000")).toBe(650000);
    expect(parsePrice("650,000")).toBe(650000);
    expect(parsePrice("KES 1 200 000")).toBe(1200000);
    expect(parsePrice("-5")).toBe(null);
    expect(parsePrice("about 650k")).toBe(null);
  });

  it("stores no price or period when the price is on request", () => {
    const result = validateListing("lease", lease({ price: "650000", price_on_request: true }));
    expect(result.ok && [result.values.price, result.values.price_period]).toEqual([null, null]);
  });

  it("needs an amount and a period for a lease with a price", () => {
    const missing = validateListing("lease", lease({ price_on_request: false }));
    expect(!missing.ok && missing.errors.price).toMatch(/Enter the price/);

    const ok = validateListing("lease", lease({ price_on_request: false, price: "650,000", price_period: "month" }));
    expect(ok.ok && ok.values).toMatchObject({ price: 650000, price_period: "month", currency: "KES" });

    const total = validateListing("lease", lease({ price_on_request: false, price: "650000", price_period: "total" }));
    expect(!total.ok && total.errors.price_period).toMatch(/per month or per year/);
  });

  it("only takes a total for a sale, and refuses a zero price", () => {
    expect(validateListing("sale", sale({ price_on_request: false, price: "45000000", price_period: "total" })).ok).toBe(true);
    const monthly = validateListing("sale", sale({ price_on_request: false, price: "45000000", price_period: "month" }));
    expect(!monthly.ok && monthly.errors.price_period).toBeTruthy();
    const zero = validateListing("sale", sale({ price_on_request: false, price: "0", price_period: "total" }));
    expect(!zero.ok && zero.errors.price).toMatch(/zero/);
  });
});

describe("listing form: status, availability and text", () => {
  it("accepts the four statuses only", () => {
    for (const status of ["draft", "active", "paused", "closed"]) {
      expect(validateListing("lease", lease({ status })).ok).toBe(true);
    }
    expect(validateListing("lease", lease({ status: "live" })).ok).toBe(false);
  });

  it("checks the date and keeps the card note short", () => {
    expect(validateListing("lease", lease({ available_from: "2027-02-01" })).ok).toBe(true);
    expect(validateListing("lease", lease({ available_from: "Feb 2027" })).ok).toBe(false);
    const long = validateListing("lease", lease({ availability_note: "x".repeat(81) }));
    expect(!long.ok && long.errors.availability_note).toMatch(/80/);
  });

  it("reads the checkbox and trims the rest", () => {
    const form = new FormData();
    form.set("price", " 650000 ");
    form.set("price_on_request", "on");
    form.set("status", "active");
    const input = readListingForm(form);
    expect(input).toMatchObject({ price: "650000", price_on_request: true, status: "active", description: "" });
    form.delete("price_on_request");
    expect(readListingForm(form).price_on_request).toBe(false);
  });

  it("round-trips a saved listing, and starts a new one as a draft on request", () => {
    expect(listingToInput(null, "sale")).toMatchObject({ status: "draft", price_on_request: true, price_period: "total" });
    expect(
      listingToInput(
        { price: 650000, price_period: "month", price_on_request: false, available_from: null, availability_note: null, description: "Hall", status: "active" },
        "lease",
      ),
    ).toMatchObject({ price: "650000", available_from: "", description: "Hall" });
  });
});

describe("listing form: portal visibility and errors", () => {
  it("says why a listing isn't on the portal", () => {
    expect(listingVisibility("draft", "live")).toMatch(/only active/);
    expect(listingVisibility("active", "draft")).toMatch(/once the property is live/);
    expect(listingVisibility("active", "live")).toBe(null);
  });

  it("turns database refusals into sentences", () => {
    expect(describeListingError({ code: "42501" })).toMatch(/isn't allowed/);
    expect(describeListingError({ code: "XX000", message: "relation" })).not.toMatch(/relation/);
  });
});
