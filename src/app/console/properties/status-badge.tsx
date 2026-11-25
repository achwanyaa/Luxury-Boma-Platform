import { STATUS_LABEL, type PropertyStatus } from "@/lib/console/property-form";

const TONE: Record<PropertyStatus, string> = {
  draft: "bg-line-soft text-muted",
  in_review: "bg-notice-bg text-notice",
  live: "bg-available-bg text-available",
  paused: "bg-line-soft text-fit-grey",
  sold_or_leased: "bg-lb-tint text-lb-deep",
};

export function StatusBadge({ status }: { status: PropertyStatus }) {
  return (
    <span className={`inline-flex w-fit items-center rounded-chip px-2 py-0.5 text-xs font-bold ${TONE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
