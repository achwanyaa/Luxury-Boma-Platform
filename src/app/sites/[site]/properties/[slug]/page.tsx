import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PropertyPhoto } from "@/components/portal/PropertyPhoto";
import { ProvenanceBar } from "@/components/portal/ProvenanceBar";
import { ProvenancePill } from "@/components/ProvenancePill";
import {
  DEAL_LABEL,
  headlineFacts,
  SPEC_GROUP_LABEL,
  whatsappLink,
  type Fact,
  type PortalProperty,
  type SpecGroup,
} from "@/lib/portal/listing-model";
import { getPortalProperty } from "@/lib/portal/listings";
import { DISCLOSURE, getSite, type Site } from "@/lib/sites";

type Props = PageProps<"/sites/[site]/properties/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site: siteSlug, slug } = await params;
  const site = getSite(siteSlug);
  const property = site ? await getPortalProperty(site.slug, slug) : null;
  if (!site || !property) return { title: "Godown not found" };

  const area = property.facts.find((f) => f.key === "floor_area");
  const deals = property.offers.map((o) => DEAL_LABEL[o.deal].toLowerCase()).join(" and ");
  const description = [
    `${property.name}, ${deals}`,
    property.areaLabel,
    area && area.label !== "not_yet_checked" ? `${area.display} floor area` : null,
    "Facts checked by LuxuryBoma.",
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    title: property.name,
    description,
    openGraph: { title: `${property.name} · ${site.name}`, description, images: property.photos.slice(0, 1).map((p) => p.url) },
  };
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso.slice(0, 10)}T00:00:00Z`),
  );

function FactRow({ fact }: { fact: Fact }) {
  const detail = [fact.method, fact.source].filter(Boolean).join(" · ");
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-1 border-t border-line-soft py-3 first:border-t-0 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto]">
      <span className="text-[15px] text-body">{fact.name}</span>
      <span className={fact.label === "not_yet_checked" ? "text-[15px] text-fit-grey" : "text-[15px] font-semibold text-ink"}>
        {fact.display}
      </span>
      <span className="sm:justify-self-end">
        <ProvenancePill kind={fact.label} />
      </span>
      {(detail || fact.checkedOn) && (
        <span className="text-[13px] leading-5 text-muted sm:col-span-3">
          {detail}
          {fact.checkedOn && `${detail ? " · " : ""}${formatDate(fact.checkedOn)}`}
        </span>
      )}
    </div>
  );
}

function Specifications({ facts }: { facts: Fact[] }) {
  const groups = Object.keys(SPEC_GROUP_LABEL) as SpecGroup[];
  return (
    <div className="flex flex-col gap-2.5">
      {groups.map((group) => {
        const rows = facts.filter((f) => f.group === group);
        if (rows.length === 0) return null;
        return (
          <details key={group} open={group === "structure"} className="group rounded-card border border-line bg-white">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-bold text-navy">
              {SPEC_GROUP_LABEL[group]}
              <span className="text-sm font-normal text-muted">
                {rows.length} {rows.length === 1 ? "fact" : "facts"}
                <span className="ml-2 inline-block transition-transform group-open:rotate-180" aria-hidden="true">
                  ▾
                </span>
              </span>
            </summary>
            <div className="px-4 pb-2">
              {rows.map((fact) => (
                <FactRow key={fact.key} fact={fact} />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function EnquiryPanel({ site, property }: { site: Site; property: PortalProperty }) {
  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-white p-5">
      {property.offers.map((offer) => (
        <div key={offer.deal} className="flex flex-col gap-1">
          <span className="text-xs font-bold tracking-[0.6px] text-muted uppercase">{DEAL_LABEL[offer.deal]}</span>
          <span className="text-2xl font-extrabold text-navy">{offer.priceText}</span>
          <span className="w-fit rounded-chip bg-available-bg px-2 py-0.5 text-[13px] font-semibold text-available">
            {offer.availabilityText}
          </span>
        </div>
      ))}
      <div className="flex flex-col gap-2">
        <a
          href={whatsappLink(site.whatsapp, site.name, property)}
          className="flex min-h-12 items-center justify-center rounded-control bg-blue px-4 text-[16px] font-bold text-white hover:bg-blue-hover"
        >
          Ask about this godown on WhatsApp
        </a>
        <a
          href={site.phoneHref}
          className="flex min-h-11 items-center justify-center rounded-control border border-line-strong px-4 text-[15px] font-semibold text-navy hover:border-blue"
        >
          Call {site.phone}
        </a>
      </div>
      <p className="text-[13px] leading-5 text-muted">
        Booking a visit online is coming soon. For now, message or call us and we&apos;ll arrange a time.
      </p>
    </div>
  );
}

function VerifiedCard({ property }: { property: PortalProperty }) {
  return (
    <div className="flex flex-col gap-3 rounded-card bg-lb-tint p-5 font-lb">
      <span className="text-[15px] font-bold text-lb-deep">Verified by LuxuryBoma</span>
      {property.siteVisitedOn && (
        <span className="text-sm text-lb-muted">Site visited {formatDate(property.siteVisitedOn)}</span>
      )}
      <ProvenanceBar facts={property.facts} />
      <p className="text-[13px] leading-5 text-lb-muted">
        LuxuryBoma sets every label, not us. We can&apos;t edit or hide a verified fact.
      </p>
      <p className="border-t border-lb/15 pt-3 text-[13px] leading-5 text-lb-muted">{DISCLOSURE.full}</p>
    </div>
  );
}

async function PropertyDetails({ params }: Pick<Props, "params">) {
  const { site: siteSlug, slug } = await params;
  const site = getSite(siteSlug);
  if (!site) notFound();
  const property = await getPortalProperty(site.slug, slug);
  if (!property) notFound();

  const headline = headlineFacts(property);
  const description = property.offers.find((o) => o.description)?.description;

  return (
    <>
      {property.sample && (
        <div className="bg-notice-bg text-[13px] font-semibold text-notice">
          <div className="mx-auto max-w-[1180px] px-5 py-2">Sample godown for development. None of these figures are real.</div>
        </div>
      )}

      <div className="mx-auto flex max-w-[1180px] flex-col gap-5 px-5 pt-5 pb-12">
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <Link href="/properties" className="font-semibold text-blue hover:text-blue-hover">
            Properties
          </Link>
          <span className="mx-2">/</span>
          {property.name}
        </nav>

        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap gap-1.5">
              {property.offers.map((o) => (
                <span key={o.deal} className="rounded-chip bg-navy px-2 py-1 text-xs font-bold tracking-[0.3px] text-white uppercase">
                  {DEAL_LABEL[o.deal]}
                </span>
              ))}
              <span className="rounded-chip border border-line px-2 py-1 font-mono text-xs text-muted">Ref {property.reference}</span>
            </div>
            <h1 className="text-[34px] leading-[40px] font-extrabold tracking-[-0.3px] text-navy sm:text-[42px] sm:leading-[48px]">
              {property.name}
            </h1>
            <span className="text-[16px] text-muted">{[property.address ?? property.areaLabel, property.near].filter(Boolean).join(" · ")}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-2 overflow-hidden rounded-card md:grid-cols-[2fr_1fr]">
          <PropertyPhoto property={property} className="aspect-[16/10] md:aspect-auto md:h-full md:min-h-[380px]" />
          <div className="hidden grid-rows-2 gap-2 md:grid">
            <PropertyPhoto property={property} index={1} className="h-full" />
            <PropertyPhoto property={property} index={2} className="h-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-7">
            {headline.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="text-[22px] font-extrabold text-navy">Key numbers</h2>
                <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
                  {headline.map((fact) => (
                    <div key={fact.key} className="flex flex-col gap-1.5 bg-white p-4">
                      <dt className="text-xs font-semibold tracking-[0.6px] text-muted uppercase">{fact.headlineLabel}</dt>
                      <dd className={fact.label === "not_yet_checked" ? "text-[17px] text-fit-grey" : "text-[22px] leading-7 font-bold text-ink"}>
                        {fact.display}
                      </dd>
                      <dd>
                        <ProvenancePill kind={fact.label} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {description && (
              <section className="flex flex-col gap-2">
                <h2 className="text-[22px] font-extrabold text-navy">About this godown</h2>
                <p className="max-w-[680px] text-[16px] leading-[26px] text-body">{description}</p>
              </section>
            )}

            <section className="flex flex-col gap-3">
              <h2 className="text-[22px] font-extrabold text-navy">All specifications</h2>
              <p className="text-[15px] text-muted">Each fact shows how it was checked, where it came from and when.</p>
              <Specifications facts={property.facts} />
            </section>
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-4">
            <EnquiryPanel site={site} property={property} />
            <VerifiedCard property={property} />
          </aside>
        </div>
      </div>
    </>
  );
}

export default function PropertyPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1180px] px-5 py-8" aria-busy="true">
          <div className="h-[420px] animate-pulse rounded-card bg-white" />
        </div>
      }
    >
      <PropertyDetails params={params} />
    </Suspense>
  );
}
