import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ListingCard } from "@/components/portal/ListingCard";
import { ListingFilters } from "@/components/portal/ListingFilters";
import {
  applyFilters,
  filtersToQuery,
  hasActiveFilters,
  locations,
  parseFilters,
  whatsappLink,
} from "@/lib/portal/listing-model";
import { getPortalListings } from "@/lib/portal/listings";
import { getSite } from "@/lib/sites";

export const metadata: Metadata = {
  title: "Godowns to let and for sale",
  description: "Industrial godowns to let and for sale, with every key fact labelled and checked by LuxuryBoma.",
};

async function Results({ params, searchParams }: PageProps<"/sites/[site]/properties">) {
  const site = getSite((await params).site);
  if (!site) notFound();

  const filters = parseFilters(await searchParams);
  const all = await getPortalListings(site.slug);
  const results = applyFilters(all, filters);
  const filtered = hasActiveFilters(filters);

  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-5 pt-7 pb-5">
          <ListingFilters key={filtersToQuery(filters)} filters={filters} locations={locations(all)} />
        </div>
      </section>

      <section className="mx-auto flex max-w-[1180px] flex-col gap-5 px-5 pt-6 pb-12">
        {all.some((p) => p.sample) && (
          <p className="rounded-card bg-notice-bg px-4 py-3 text-sm font-semibold text-notice">
            Sample godowns for development. None of these figures are real or verified.
          </p>
        )}

        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[15px] text-muted" aria-live="polite">
            <strong className="text-ink">{results.length}</strong> {results.length === 1 ? "godown" : "godowns"}
            {filtered ? (results.length === 1 ? " matches your search" : " match your search") : " listed"}
          </p>
          {filtered && (
            <Link href="/properties" className="text-[15px] font-semibold text-blue hover:text-blue-hover">
              Clear filters
            </Link>
          )}
        </div>

        {results.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((property) => (
              <ListingCard key={property.slug} property={property} siteName={site.name} whatsapp={site.whatsapp} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-line-strong bg-white p-8">
            <h2 className="text-[22px] font-extrabold text-navy">
              {all.length === 0 ? "No godowns are listed yet" : "Nothing matches that search"}
            </h2>
            <p className="max-w-[560px] leading-[25px] text-muted">
              {all.length === 0
                ? "We list a godown only after LuxuryBoma has visited the site and checked its facts. Tell us what you need and we'll let you know when one is ready."
                : "Try a different size or location, or tell us what you need. We may have space coming up that isn't listed yet."}
            </p>
            <div className="flex flex-wrap gap-2.5">
              <a
                href={whatsappLink(site.whatsapp, site.name)}
                className="flex min-h-11 items-center rounded-control bg-blue px-4 text-[15px] font-bold text-white hover:bg-blue-hover"
              >
                Tell us what you need
              </a>
              {filtered && (
                <Link
                  href="/properties"
                  className="flex min-h-11 items-center rounded-control border border-line-strong bg-white px-4 text-[15px] font-semibold text-navy hover:border-blue"
                >
                  See all godowns
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function ResultsFallback() {
  return (
    <section className="mx-auto max-w-[1180px] px-5 py-8" aria-busy="true">
      <div className="mb-6 h-24 rounded-card bg-white" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[440px] animate-pulse rounded-card border border-line bg-white" />
        ))}
      </div>
    </section>
  );
}

export default function PropertiesPage(props: PageProps<"/sites/[site]/properties">) {
  return (
    <>
      <section className="blueprint border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-2 px-5 pt-9 pb-2">
          <span className="flex items-center gap-2.5 text-xs font-semibold tracking-[1.6px] text-blue uppercase">
            <span className="h-0.5 w-7 bg-blue" />
            Properties
          </span>
          <h1 className="text-[34px] leading-[40px] font-extrabold tracking-[-0.3px] text-navy sm:text-[40px] sm:leading-[46px]">
            Godowns to let and for sale
          </h1>
          <p className="max-w-[640px] text-[16px] leading-[25px] text-muted">
            Every number below is labelled with how it was checked: measured on site, taken from the
            architect&apos;s drawings, or our word only.
          </p>
        </div>
      </section>
      <Suspense fallback={<ResultsFallback />}>
        <Results {...props} />
      </Suspense>
    </>
  );
}
