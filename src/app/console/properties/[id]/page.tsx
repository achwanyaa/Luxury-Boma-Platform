import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProperty, getPublishInput } from "@/lib/console/properties";
import { moveEffect, moveLabel, publishCheck, STATUS_MOVES } from "@/lib/console/publish-rules";
import { DEALS, listingToInput } from "@/lib/console/listing-form";
import { MEDIA_BUCKET } from "@/lib/console/media-rules";
import { propertyToInput } from "@/lib/console/property-form";
import { publicFileUrl } from "@/lib/supabase/public";
import { requireStaff } from "@/lib/console/staff";
import { ui } from "../../ui";
import { changeStatus, saveListing, updateProperty } from "../actions";
import { StatusPanel } from "../status-panel";
import { FactsSection } from "../facts-section";
import { ListingForm } from "../listing-form";
import { MediaSection } from "../media-section";
import { PropertyForm } from "../property-form";
import { StatusBadge } from "../status-badge";

export const metadata: Metadata = { title: "Property" };

const dateText = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Not yet";

// Sections added by the next console steps (PLAN-CONSOLE.md 2 to 7).
const STILL_TO_COME = ["Documents: drawings and reports"];

export default function PropertyPage({ params }: PageProps<"/console/properties/[id]">) {
  return (
    <main className={ui.wideMain}>
      <Link href="/properties" className="text-sm font-semibold text-lb hover:text-lb-deep">
        ← Properties
      </Link>
      <Suspense fallback={<p className={ui.lead}>Loading…</p>}>
        <PropertyHub params={params} />
      </Suspense>
    </main>
  );
}

async function PropertyHub({ params }: Pick<PageProps<"/console/properties/[id]">, "params">) {
  const staff = await requireStaff();
  const { id } = await params;
  const property = await getProperty(id);
  if (!property) notFound();

  const client = property.clients;
  const publish = await getPublishInput(property.id, staff.role);
  const check = publish ? publishCheck(publish.input) : { blockers: [], warnings: [] };
  const moves = STATUS_MOVES[property.status].map((to) => ({ to, label: moveLabel(property.status, to), effect: moveEffect(to) }));
  const fileUrl = (m: { file_path: string | null; url: string | null }) =>
    m.file_path ? publicFileUrl(MEDIA_BUCKET, m.file_path) : (m.url ?? "");
  const photos = property.media
    .filter((m) => m.kind === "photo")
    .toSorted((a, b) => a.sort_order - b.sort_order)
    .map((m) => ({ id: m.id, url: fileUrl(m), caption: m.caption ?? "", isMain: m.is_main }));
  const video = property.media.find((m) => m.kind === "video");
  const tour = property.media.find((m) => m.kind === "tour");
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-muted tabular-nums">{property.reference}</span>
        <h1 className={ui.h1}>{property.name}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-body">
          <StatusBadge status={property.status} />
          <span>{client?.name}</span>
          <span>Site visit: {dateText(property.site_visited_on)}</span>
          {property.published_at && <span>Published {dateText(property.published_at)}</span>}
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3" aria-labelledby="listing-heading">
            <div className="flex flex-col gap-0.5">
              <h2 id="listing-heading" className={ui.h2}>
                Listing
              </h2>
              <p className="text-sm text-muted">
                One listing per deal. Realogic staff will later be able to change the price, availability and description; the rest stays with LuxuryBoma.
              </p>
            </div>
            {DEALS.map((deal) => {
              const listing = property.listings.find((l) => l.deal === deal);
              return (
                <ListingForm
                  key={deal}
                  deal={deal}
                  exists={Boolean(listing)}
                  propertyStatus={property.status}
                  initial={listingToInput(listing, deal)}
                  action={saveListing.bind(null, property.id, deal)}
                />
              );
            })}
          </section>
          <MediaSection
            propertyId={property.id}
            clientId={property.client_id}
            photos={photos}
            video={video ? { id: video.id, url: fileUrl(video) } : null}
            tourUrl={tour?.url ?? null}
          />
          <FactsSection propertyId={property.id} propertyType={property.property_type} staff={staff} />
          <section className="flex flex-col gap-3" aria-labelledby="details-heading">
            <h2 id="details-heading" className={ui.h2}>
              Details
            </h2>
            <PropertyForm
              mode="edit"
              action={updateProperty.bind(null, property.id)}
              initial={propertyToInput(property)}
              clients={client ? [client] : []}
              isLive={property.status === "live"}
            />
          </section>
        </div>
        <div className="flex flex-col gap-4 max-lg:order-first lg:sticky lg:top-4">
          <StatusPanel status={property.status} moves={moves} check={check} change={changeStatus.bind(null, property.id)} />
          <aside className={`${ui.card} flex flex-col gap-3`}>
            <h2 className={ui.h2}>Still to add here</h2>
            <ul className="flex flex-col gap-1.5 text-sm text-body">
              {STILL_TO_COME.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden="true" className="text-muted">○</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted">These screens come in the next console steps.</p>
          </aside>
        </div>
      </div>
    </>
  );
}
