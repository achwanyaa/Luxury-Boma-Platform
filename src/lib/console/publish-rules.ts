// Pure rules for a property's status and for publishing it. The database is
// the real gate (only a reviewer or admin can set "live", and live needs a
// site visit date); these rules explain in advance why publishing is blocked
// and add the console's own checks, so the button never fails silently.

import type { PropertyStatus } from "./property-form";

/** Where a property can go from each status. */
export const STATUS_MOVES: Record<PropertyStatus, PropertyStatus[]> = {
  draft: ["in_review"],
  in_review: ["live", "draft"],
  live: ["paused", "sold_or_leased"],
  paused: ["live", "sold_or_leased"],
  sold_or_leased: ["draft"],
};

export function canMove(from: PropertyStatus, to: PropertyStatus): boolean {
  return STATUS_MOVES[from]?.includes(to) ?? false;
}

export function moveLabel(from: PropertyStatus, to: PropertyStatus): string {
  if (to === "live") return from === "paused" ? "Put back live" : "Publish";
  if (to === "in_review") return "Send for review";
  if (to === "paused") return "Pause (hide from the portal)";
  if (to === "sold_or_leased") return "Mark sold or leased";
  if (to === "draft") return from === "sold_or_leased" ? "Reopen as a draft" : "Back to draft";
  return to;
}

/** What a move does, in a sentence the button's confirmation can show. */
export function moveEffect(to: PropertyStatus): string {
  switch (to) {
    case "live":
      return "The property and its active listings will show on the client's portal.";
    case "paused":
      return "The property disappears from the portal until it is put back live.";
    case "sold_or_leased":
      return "The property disappears from the portal.";
    case "in_review":
      return "A reviewer checks the facts before publishing.";
    case "draft":
      return "The property goes back to being edited.";
  }
}

export type PublishInput = {
  role: string;
  siteVisitedOn: string | null;
  listings: { status: string }[];
  media: { kind: string; is_main: boolean }[];
  facts: { key: string; name: string; label: string | null; source: string | null; requiredToPublish: boolean }[];
};

export type PublishCheck = { blockers: string[]; warnings: string[] };

const PUBLISHERS = ["lb_admin", "lb_reviewer"];
const CHECKED_LABELS = ["measured", "from_drawings", "declared", "indicative"];

/**
 * Why this property can't be published yet (blockers) and what is worth
 * fixing first (warnings). An empty blockers list means the button works.
 */
export function publishCheck(input: PublishInput): PublishCheck {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!PUBLISHERS.includes(input.role)) {
    blockers.push("Only a LuxuryBoma reviewer or admin can publish. Ask one to review it.");
  }
  if (!input.siteVisitedOn) {
    blockers.push("No site visit date. A property goes live only after a LuxuryBoma site visit.");
  }
  if (!input.listings.some((l) => l.status === "active")) {
    blockers.push("No active listing. Set a to-let or for-sale listing to Active, or the portal won't show it.");
  }
  if (!input.media.some((m) => m.kind === "photo" && m.is_main)) {
    blockers.push("No main photo. Listing cards and shared links need one.");
  }
  for (const fact of input.facts) {
    if (fact.label === "from_drawings" && !fact.source?.trim()) {
      blockers.push(`${fact.name} is “From drawings” but doesn't name its drawing and author.`);
    }
  }

  const missing = input.facts
    .filter((f) => f.requiredToPublish && !(f.label && CHECKED_LABELS.includes(f.label)))
    .map((f) => f.name);
  if (missing.length > 0) {
    warnings.push(
      `Not yet checked: ${missing.join(", ")}. These are marked required; they show as “Not yet checked” until they are.`,
    );
  }
  if (!input.facts.some((f) => f.label && CHECKED_LABELS.includes(f.label))) {
    warnings.push("No fact has a value yet. The page will show “Not yet checked” throughout.");
  }

  return { blockers, warnings };
}

export function describeStatusError(error: { code?: string; message?: string }): string {
  const text = error.message ?? "";
  if (error.code === "23514" && text.includes("live_needs_site_visit")) {
    return "A property goes live only after a site visit. Add the site visit date first.";
  }
  if (error.code === "42501") return "Only a LuxuryBoma reviewer or admin can publish a property.";
  return "Could not change the status just now. Try again in a minute.";
}
