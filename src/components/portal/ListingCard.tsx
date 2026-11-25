import Link from "next/link";
import { DEAL_LABEL, headlineFacts, squareFeet, whatsappLink, type PortalProperty } from "@/lib/portal/listing-model";
import { PropertyPhoto } from "./PropertyPhoto";
import { ProvenanceBar } from "./ProvenanceBar";

// One result on the listings grid: photo, deal badges, price, the four key
// numbers buyers filter on, and how those numbers were checked.

const CARD_FACTS = ["floor_area", "clear_height", "loading_doors", "power_supply"];

export function ListingCard({
  property,
  siteName,
  whatsapp,
}: {
  property: PortalProperty;
  siteName: string;
  whatsapp: string;
}) {
  const headline = headlineFacts(property);
  const keyFacts = CARD_FACTS.map((key) => headline.find((f) => f.key === key)).filter((f) => f !== undefined);
  const offer = property.offers[0];
  const location = [property.areaLabel, property.near].filter(Boolean).join(" · ");

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card border border-line bg-white transition-shadow hover:shadow-[0_6px_24px_rgba(12,27,51,0.10)]">
      <div className="relative">
        <PropertyPhoto property={property} className="aspect-[4/3]" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          {property.offers.map((o) => (
            <span
              key={o.deal}
              className="rounded-chip bg-white/95 px-2 py-1 text-xs font-bold tracking-[0.3px] text-navy uppercase shadow-sm"
            >
              {DEAL_LABEL[o.deal]}
            </span>
          ))}
        </div>
        {property.sample && (
          <span className="absolute top-3 right-3 rounded-chip bg-notice px-2 py-1 text-xs font-bold text-white">
            SAMPLE
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <span className="w-fit rounded-chip bg-available-bg px-2 py-0.5 text-xs font-semibold text-available">
            {offer.availabilityText}
          </span>
          <h3 className="font-heading text-xl leading-7 font-extrabold text-navy [font-stretch:88%]">
            <Link href={`/properties/${property.slug}`} className="after:absolute after:inset-0">
              {property.name}
            </Link>
          </h3>
          <span className="text-sm text-muted">{location}</span>
        </div>

        <div className="flex flex-col">
          {property.offers.map((o) => (
            <span key={o.deal} className="text-[17px] font-bold text-ink">
              {o.priceText}
              {property.offers.length > 1 && (
                <span className="ml-1.5 text-sm font-normal text-muted">{o.deal === "lease" ? "to let" : "to buy"}</span>
              )}
            </span>
          ))}
        </div>

        {keyFacts.length > 0 && (
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-control border border-line bg-line">
            {keyFacts.map((fact) => (
              <div key={fact.key} className="flex flex-col bg-white px-3 py-2">
                <dt className="text-[11px] font-semibold tracking-[0.6px] text-muted uppercase">{fact.headlineLabel}</dt>
                <dd className={fact.label === "not_yet_checked" ? "text-sm text-fit-grey" : "font-semibold text-ink"}>
                  {fact.display}
                  {fact.key === "floor_area" && typeof fact.value === "number" && (
                    <span className="block text-xs font-normal text-muted">{squareFeet(fact.value)}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-auto flex flex-col gap-3 border-t border-line-soft pt-3">
          <div className="flex flex-col gap-1.5">
            <span className="font-lb text-xs font-bold text-lb-deep">Facts checked by LuxuryBoma</span>
            <ProvenanceBar facts={property.facts} compact />
          </div>
          {/* Above the card-wide link, so it opens WhatsApp rather than the property page. */}
          <div className="relative z-10 flex gap-2">
            <a
              href={whatsappLink(whatsapp, siteName, property)}
              className="flex min-h-11 flex-1 items-center justify-center rounded-control bg-blue px-3 text-[15px] font-bold text-white hover:bg-blue-hover"
            >
              WhatsApp
            </a>
            <Link
              href={`/properties/${property.slug}`}
              tabIndex={-1}
              className="flex min-h-11 flex-1 items-center justify-center rounded-control border border-line-strong px-3 text-[15px] font-semibold text-navy hover:border-blue"
            >
              View details
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
