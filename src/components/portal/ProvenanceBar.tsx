import { provenanceSummary, type Fact } from "@/lib/portal/listing-model";

// LuxuryBoma's summary of how a property's facts were checked: measured,
// from drawings, other labels, not yet checked. It keeps LuxuryBoma's own
// identity inside the client portal.

const SEGMENTS = [
  { key: "measured", label: "measured", className: "bg-[#2E7A4A]" },
  { key: "fromDrawings", label: "from drawings", className: "bg-[#2F6DB5]" },
  { key: "other", label: "other labels", className: "bg-[#C9A25A]" },
  { key: "unchecked", label: "not yet checked", className: "bg-[#C4C8CF]" },
] as const;

export function ProvenanceBar({ facts, compact = false }: { facts: Fact[]; compact?: boolean }) {
  const summary = provenanceSummary(facts);
  if (summary.total === 0) return null;

  const shown = SEGMENTS.filter((s) => summary[s.key] > 0);
  const words = shown.map((s) => `${summary[s.key]} ${s.label}`).join(" · ");

  return (
    <div className="flex flex-col gap-1.5 font-lb">
      <div
        className={`flex overflow-hidden rounded-full bg-line-soft ${compact ? "h-1.5" : "h-2"}`}
        role="img"
        aria-label={`${summary.total} facts: ${words}`}
      >
        {shown.map((s) => (
          <span key={s.key} className={s.className} style={{ width: `${(summary[s.key] / summary.total) * 100}%` }} />
        ))}
      </div>
      <span className={`text-lb-muted ${compact ? "text-xs" : "text-[13px]"}`}>{words}</span>
    </div>
  );
}
