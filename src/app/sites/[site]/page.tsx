import { cacheLife } from "next/cache";
import Form from "next/form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GodownDrawing } from "@/components/portal/GodownDrawing";
import { ListingCard } from "@/components/portal/ListingCard";
import { ProvenancePill } from "@/components/ProvenancePill";
import { applyFilters, parseFilters, SIZE_BANDS, whatsappLink } from "@/lib/portal/listing-model";
import { getPortalListings } from "@/lib/portal/listings";
import { DISCLOSURE, getSite } from "@/lib/sites";

const WHAT_WE_DO = [
  {
    title: "We lease and sell",
    text: "Godowns to let and for sale, with the key facts checked by LuxuryBoma before they are listed.",
  },
  {
    title: "We fit out",
    text: "Offices, partitions, extra loading doors and floor finishes, quoted and done for you.",
  },
  {
    title: "We maintain",
    text: "Building maintenance, plumbing, electrical and grounds work after you move in.",
  },
];

const SERVICES = [
  { title: "Fit-out", text: "Extra loading doors, offices, partitions and floor finishes." },
  { title: "Electrical", text: "Power upgrades, lighting and backup power." },
  { title: "Plumbing", text: "Water storage, rainwater harvesting and drainage." },
  { title: "Building maintenance", text: "Roofing, painting and repairs after you move in." },
  { title: "Landscaping", text: "Yards, drainage and grounds." },
];

const STEPS = [
  { title: "Browse", text: "See every godown's floor area, clear height, loading doors and power, each labelled with how it was checked." },
  { title: "Check the facts", text: "Open any number to see who checked it, how, when, and which drawing it came from." },
  { title: "Visit", text: "Message us on WhatsApp or call, and we'll arrange a time to show you the site." },
];

const CHAIN = [
  { who: "Realogic", does: "lists, leases and sells" },
  { who: "LuxuryBoma", does: "checks the facts", lb: true },
];

const eyebrow = "flex items-center gap-2.5 text-xs font-semibold tracking-[1.6px] text-blue uppercase";

// The page is cached as a whole: its content is the same for every visitor,
// and the listings inside refresh with their own cache tag.
export default async function PortalHome({ params }: PageProps<"/sites/[site]">) {
  "use cache";
  cacheLife("minutes");

  const site = getSite((await params).site);
  if (!site) notFound();

  const listings = await getPortalListings(site.slug);
  const featured = applyFilters(listings, parseFilters({})).slice(0, 3); // newest first
  const count = listings.length;

  return (
    <>
      {/* Hero: who we are, plus the search that most visitors came for. */}
      <section className="blueprint border-b border-line bg-white">
        <div className="mx-auto grid max-w-[1180px] items-center gap-8 px-5 pt-10 pb-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:pt-14 lg:pb-14">
          <div className="flex flex-col gap-5">
            <span className={eyebrow}>
              <span className="h-0.5 w-7 bg-blue" />
              Industrial godowns · Nairobi and surrounds
            </span>
            <h1 className="text-[36px] leading-[42px] font-extrabold tracking-[-0.5px] text-navy sm:text-[48px] sm:leading-[54px]">
              Industrial space you can judge before you visit.
            </h1>
            <p className="max-w-[560px] text-[17px] leading-[27px] text-muted">
              {site.name} leases and sells godowns, and fits them out for you. Every key fact on our
              listings is labelled measured, from drawings or declared, and checked independently by LuxuryBoma.
            </p>

            <Form action="/properties" className="flex flex-col gap-3 rounded-card border border-line bg-white p-4 shadow-[0_8px_30px_rgba(12,27,51,0.08)] sm:p-5">
              <fieldset className="flex overflow-hidden rounded-control border border-line-strong">
                <legend className="sr-only">Lease or buy</legend>
                {[
                  { value: "", label: "All" },
                  { value: "lease", label: "To let" },
                  { value: "sale", label: "For sale" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex min-h-11 flex-1 cursor-pointer items-center justify-center text-[15px] font-semibold text-muted has-checked:bg-navy has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-blue"
                  >
                    <input type="radio" name="deal" value={option.value} defaultChecked={option.value === ""} className="sr-only" />
                    {option.label}
                  </label>
                ))}
              </fieldset>
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <label className="flex flex-1 flex-col gap-1 text-xs font-semibold tracking-[0.5px] text-muted uppercase">
                  Size
                  <select
                    name="size"
                    defaultValue=""
                    className="min-h-11 w-full rounded-control border border-line-strong bg-white px-3 text-[15px] text-ink normal-case"
                  >
                    <option value="">Any size</option>
                    {SIZE_BANDS.map((b) => (
                      <option key={b.key} value={b.key}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  className="min-h-11 self-end rounded-control bg-blue px-6 text-[16px] font-bold text-white hover:bg-blue-hover max-sm:w-full"
                >
                  {count > 0 ? `Show ${count} ${count === 1 ? "godown" : "godowns"}` : "Search godowns"}
                </button>
              </div>
            </Form>
          </div>

          <div className="relative hidden lg:block">
            <GodownDrawing className="w-full" />
          </div>
        </div>
      </section>

      {/* Who does what: the chain behind every listing. */}
      <section className="border-b border-line bg-white">
        <ol className="mx-auto grid max-w-[1180px] grid-cols-1 sm:grid-cols-2">
          {CHAIN.map((link, i) => (
            <li
              key={link.who}
              className={`flex items-center gap-3 px-5 py-4 ${i > 0 ? "border-t border-line-soft sm:border-t-0 sm:border-l" : ""}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  link.lb ? "bg-lb-tint font-lb text-lb" : "bg-blue-tint text-blue"
                }`}
              >
                {i + 1}
              </span>
              <span className={`text-[15px] leading-5 ${link.lb ? "font-lb" : ""}`}>
                <strong className={link.lb ? "text-lb-deep" : "text-navy"}>{link.who}</strong>{" "}
                <span className="text-muted">{link.does}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Featured godowns */}
      <section className="mx-auto flex max-w-[1180px] flex-col gap-5 px-5 pt-11 pb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-2">
            <span className={eyebrow}>
              <span className="h-0.5 w-7 bg-blue" />
              Available now and soon
            </span>
            <h2 className="text-[28px] leading-[34px] font-extrabold text-navy">Our godowns</h2>
          </div>
          {count > 0 && (
            <Link
              href="/properties"
              className="flex min-h-11 items-center text-[15px] font-bold text-blue hover:text-blue-hover"
            >
              See all {count} {count === 1 ? "godown" : "godowns"} →
            </Link>
          )}
        </div>

        {featured.some((p) => p.sample) && (
          <p className="rounded-card bg-notice-bg px-4 py-3 text-sm font-semibold text-notice">
            Sample godowns for development. None of these figures are real or verified.
          </p>
        )}

        {featured.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((property) => (
              <ListingCard key={property.slug} property={property} siteName={site.name} whatsapp={site.whatsapp} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-line-strong bg-white p-7">
            <h3 className="text-xl font-extrabold text-navy">Our first listings are being checked</h3>
            <p className="max-w-[600px] leading-[25px] text-muted">
              We list a godown only after LuxuryBoma has visited the site and checked its facts. Tell us the size,
              area and date you need, and we&apos;ll contact you when a godown is ready.
            </p>
            <a
              href={whatsappLink(site.whatsapp, site.name)}
              className="flex min-h-11 items-center rounded-control bg-blue px-4 text-[15px] font-bold text-white hover:bg-blue-hover"
            >
              Tell us what you need
            </a>
          </div>
        )}
      </section>

      {/* Who we are and what we do */}
      <section id="what-we-do" className="mx-auto flex max-w-[1180px] scroll-mt-4 flex-col gap-6 px-5 pt-12 pb-4">
        <div className="flex flex-col gap-6">
          <div className="flex max-w-[760px] flex-col gap-3">
            <span className={eyebrow}>
              <span className="h-0.5 w-7 bg-blue" />
              Who we are
            </span>
            <h2 className="text-[28px] leading-[34px] font-extrabold text-navy">
              Godowns, checked before they are listed.
            </h2>
            <p className="leading-[26px] text-body">
              {site.legalName} leases and sells industrial godowns, and fits out and maintains them for the
              businesses that use them. LuxuryBoma checks the facts on every listing before it goes up.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {WHAT_WE_DO.map((item) => (
              <div key={item.title} className="flex flex-col gap-2 rounded-card border border-line bg-white p-5">
                <span className="h-1 w-8 rounded-full bg-blue" />
                <h3 className="text-lg font-extrabold text-navy">{item.title}</h3>
                <p className="text-[15px] leading-[23px] text-muted">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How facts are checked */}
      <section className="mx-auto max-w-[1180px] px-5 pt-10 pb-4">
        <div className="grid gap-6 rounded-card border border-line bg-white p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            <h2 className="text-[26px] leading-[32px] font-extrabold text-navy">How our numbers are checked</h2>
            <p className="leading-[25px] text-muted">
              Most listings ask you to take the seller&apos;s word. Ours don&apos;t. Every fact carries one label,
              set by LuxuryBoma, not by us, and we can&apos;t edit or hide a verified fact.
            </p>
            <p className="font-lb text-[13px] leading-5 text-lb-muted">{DISCLOSURE.full}</p>
          </div>
          <ul className="flex flex-col gap-3 text-[15px]">
            {(
              [
                ["measured", "Measured on site by LuxuryBoma"],
                ["from_drawings", "From the architect's drawings, named by number"],
                ["declared", "Our word only, not yet checked"],
                ["not_yet_checked", "Not checked yet. We say so instead of guessing"],
              ] as const
            ).map(([kind, text]) => (
              <li key={kind} className="flex flex-wrap items-center gap-3 border-b border-line-soft pb-3 last:border-b-0">
                <span className="w-[150px] shrink-0">
                  <ProvenancePill kind={kind} />
                </span>
                <span className="text-body">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto flex max-w-[1180px] flex-col gap-5 px-5 pt-10 pb-4">
        <h2 className="text-[26px] leading-[32px] font-extrabold text-navy">From listing to keys</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-2 rounded-card bg-blue-tint p-5">
              <span className="font-heading text-[34px] leading-none font-extrabold text-blue [font-stretch:88%]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-lg font-extrabold text-navy">{step.title}</h3>
              <p className="text-[15px] leading-[23px] text-body">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* After you move in */}
      <section className="mx-auto flex max-w-[1180px] flex-col gap-4 px-5 pt-10 pb-12">
        <h2 className="text-[26px] leading-[32px] font-extrabold text-navy">After you move in</h2>
        <p className="max-w-[680px] leading-[25px] text-muted">
          We fit out and maintain the space too, so the changes you need are quoted and done by one team.
        </p>
        <div className="flex flex-wrap gap-3">
          {SERVICES.map((service) => (
            <div key={service.title} className="flex flex-[1_1_200px] flex-col gap-1.5 rounded-card border border-line bg-white p-[18px]">
              <span className="font-bold text-navy">{service.title}</span>
              <span className="text-sm leading-[21px] text-muted">{service.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Call to action */}
      <section className="bg-blue">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-5 px-5 py-9">
          <div className="flex max-w-[620px] flex-col gap-1.5">
            <h2 className="text-[26px] leading-[32px] font-extrabold text-white">Looking for space?</h2>
            <p className="leading-[25px] text-[#DCE7F7]">
              Tell us the size, area and date you need, and we&apos;ll come back to you on WhatsApp or by phone.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <a
              href={whatsappLink(site.whatsapp, site.name)}
              className="flex min-h-12 items-center rounded-control bg-white px-5 text-[16px] font-bold text-blue hover:bg-blue-tint"
            >
              WhatsApp us
            </a>
            <a
              href={site.phoneHref}
              className="flex min-h-12 items-center rounded-control border border-white/50 px-5 text-[16px] font-semibold text-white hover:border-white"
            >
              Call {site.phone}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
