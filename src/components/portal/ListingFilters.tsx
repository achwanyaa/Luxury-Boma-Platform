import Form from "next/form";
import Link from "next/link";
import { filtersToQuery, SIZE_BANDS, SORTS, type ListingFilters as Filters } from "@/lib/portal/listing-model";
import { AutoSubmit } from "./AutoSubmit";

// The search bar on /properties. A plain GET form, so it works before any
// JavaScript loads; AutoSubmit applies a change as soon as it is picked.

const selectClass =
  "min-h-11 w-full rounded-control border border-line-strong bg-white px-3 text-[15px] text-ink focus:border-blue focus:outline-2 focus:outline-blue/30";

export function ListingFilters({ filters, locations }: { filters: Filters; locations: string[] }) {
  const hrefWith = (change: Partial<Filters>) => `/properties${filtersToQuery({ ...filters, ...change })}`;

  const dealTab = (deal: Filters["deal"], label: string) => {
    const active = filters.deal === deal;
    return (
      <Link
        href={hrefWith({ deal })}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-11 flex-1 items-center justify-center px-4 text-[15px] font-semibold sm:flex-none ${
          active ? "bg-navy text-white" : "bg-white text-muted hover:text-blue"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <Form action="/properties" className="flex flex-col gap-3">
      <AutoSubmit />
      <div className="flex overflow-hidden rounded-control border border-line-strong sm:w-fit" role="group" aria-label="Deal">
        {dealTab(null, "All")}
        {dealTab("lease", "To let")}
        {dealTab("sale", "For sale")}
      </div>
      {filters.deal && <input type="hidden" name="deal" value={filters.deal} />}
      {/* The area is picked with the chips below. */}
      {filters.location && <input type="hidden" name="location" value={filters.location} />}

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-[minmax(0,260px)_minmax(0,260px)_auto]">
        <label className="flex flex-col gap-1 text-xs font-semibold tracking-[0.5px] text-muted uppercase">
          Size
          <select name="size" defaultValue={filters.size ?? ""} className={selectClass}>
            <option value="">Any size</option>
            {SIZE_BANDS.map((b) => (
              <option key={b.key} value={b.key}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold tracking-[0.5px] text-muted uppercase">
          Sort
          <select name="sort" defaultValue={filters.sort} className={selectClass}>
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          // Changes apply on their own once JavaScript has loaded; the button is the fallback.
          className="col-span-2 min-h-11 self-end rounded-control bg-blue px-5 text-[15px] font-bold text-white hover:bg-blue-hover md:col-span-1 md:w-fit"
        >
          Search
        </button>
      </div>

      {locations.length > 1 && (
        // One-tap areas, the quickest way to narrow a search on a phone.
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Areas">
          {[null, ...locations].map((location) => {
            const active = filters.location === location;
            return (
              <Link
                key={location ?? "all"}
                href={hrefWith({ location })}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 shrink-0 items-center rounded-full border px-3.5 text-sm font-semibold whitespace-nowrap ${
                  active ? "border-navy bg-navy text-white" : "border-line-strong bg-white text-muted hover:border-blue hover:text-blue"
                }`}
              >
                {location ?? "All areas"}
              </Link>
            );
          })}
        </div>
      )}
    </Form>
  );
}
