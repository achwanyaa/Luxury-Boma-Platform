import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Provenance } from "@/components/ProvenancePill";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import { availabilityText, formatPrice, type Fact, type PortalProperty, type SpecGroup } from "./listing-model";
import { SAMPLE_PROPERTIES } from "./sample";

// Public reads for a client's portal. They run as `anon`, so row-level
// security decides what is visible: live properties, their facts and media,
// and active listings only. Results are cached for a few minutes and tagged
// so the console can refresh them when it publishes (revalidateTag).

export const listingsTag = (siteSlug: string) => `portal-listings:${siteSlug}`;

/**
 * Development only: PORTAL_SAMPLE_LISTINGS=1 in .env shows clearly marked
 * sample godowns when the database has none, so the design can be checked.
 * Production builds never show them.
 */
function sampleListingsEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.PORTAL_SAMPLE_LISTINGS === "1";
}

const PROPERTY_SELECT = `
  id, slug, reference, name, area_label, near, address, site_visited_on, published_at,
  listings ( deal, price, currency, price_period, price_on_request, available_from, availability_note, description, status ),
  spec_values ( spec_key, space_id, display_value, value_number, value_boolean, label, method, source, checked_on ),
  media ( kind, url, caption, is_main, sort_order )
`;

async function loadProperties(siteSlug: string): Promise<PortalProperty[]> {
  if (!supabaseConfigured) return [];
  const supabase = createPublicClient();

  const { data: clients, error: clientError } = await supabase.rpc("get_site_client", { p_slug: siteSlug });
  if (clientError) throw new Error(`Could not read the site: ${clientError.message}`);
  const client = clients?.[0];
  if (!client) return [];

  const [{ data: rows, error }, { data: definitions, error: defError }] = await Promise.all([
    supabase.from("properties").select(PROPERTY_SELECT).eq("client_id", client.id).eq("status", "live"),
    supabase
      .from("spec_definitions")
      .select("key, name, spec_group, headline_label, in_headline, sort_order"),
  ]);
  if (error) throw new Error(`Could not read the listings: ${error.message}`);
  if (defError) throw new Error(`Could not read the spec catalogue: ${defError.message}`);

  const catalogue = new Map((definitions ?? []).map((d) => [d.key, d]));
  const today = new Date().toISOString().slice(0, 10);

  return (rows ?? [])
    .map((row): PortalProperty => {
      const offers = row.listings
        .filter((l) => l.status === "active")
        .map((l) => ({
          deal: l.deal,
          price: l.price_on_request ? null : l.price,
          priceText: formatPrice(l.price, l.currency, l.price_period, l.price_on_request),
          availableFrom: l.available_from,
          availabilityText: availabilityText(l.available_from, l.availability_note, today),
          description: l.description,
        }))
        .sort((a, b) => a.deal.localeCompare(b.deal));

      // Whole-property facts only; per-space facts belong on the dossier's space tables.
      const facts = row.spec_values
        .filter((v) => v.space_id === null && catalogue.has(v.spec_key))
        .map((v): Fact => {
          const def = catalogue.get(v.spec_key)!;
          return {
            key: v.spec_key,
            name: def.name,
            group: def.spec_group as SpecGroup,
            headlineLabel: def.in_headline ? (def.headline_label ?? def.name) : null,
            display: v.label === "not_yet_checked" ? "Not yet checked" : v.display_value,
            value: v.value_number ?? v.value_boolean ?? null,
            label: v.label as Provenance,
            method: v.method,
            source: v.source,
            checkedOn: v.checked_on,
            sortOrder: def.sort_order,
          };
        })
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const media = row.media.toSorted((a, b) => Number(b.is_main) - Number(a.is_main) || a.sort_order - b.sort_order);

      return {
        slug: row.slug,
        reference: row.reference,
        name: row.name,
        areaLabel: row.area_label,
        near: row.near,
        address: row.address,
        siteVisitedOn: row.site_visited_on,
        publishedAt: row.published_at,
        offers,
        facts,
        // Photos in storage need the media bucket (milestone 2, step 5); links work now.
        photos: media.filter((m) => m.kind === "photo" && m.url).map((m) => ({ url: m.url!, caption: m.caption })),
        tourUrl: media.find((m) => m.kind === "tour" && m.url)?.url ?? null,
        sample: false,
      };
    })
    .filter((p) => p.offers.length > 0);
}

/** Every live property with at least one active listing on this portal. */
export async function getPortalListings(siteSlug: string): Promise<PortalProperty[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(listingsTag(siteSlug));

  const properties = await loadProperties(siteSlug);
  if (properties.length === 0 && sampleListingsEnabled()) return SAMPLE_PROPERTIES;
  return properties;
}

export async function getPortalProperty(siteSlug: string, propertySlug: string): Promise<PortalProperty | null> {
  const properties = await getPortalListings(siteSlug);
  return properties.find((p) => p.slug === propertySlug) ?? null;
}
