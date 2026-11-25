import { factToInput, LABELS_WITH_VALUE, reviewState } from "@/lib/console/fact-form";
import { getFactsForProperty, staffNames, type FactGroup } from "@/lib/console/facts";
import type { Staff } from "@/lib/console/staff";
import { SPEC_GROUP_LABEL } from "@/lib/portal/listing-model";
import { ui } from "../ui";
import { markFactReviewed, saveFact } from "./actions";
import { FactEditor } from "./fact-editor";

const GROUP_ORDER: FactGroup[] = ["structure", "access", "power", "legal", "location"];

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export async function FactsSection({
  propertyId,
  propertyType,
  staff,
}: {
  propertyId: string;
  propertyType: string;
  staff: Staff;
}) {
  const [facts, names] = await Promise.all([getFactsForProperty(propertyId, propertyType), staffNames()]);
  const nameOf = (userId: string | null) =>
    !userId ? "unknown" : userId === staff.userId ? "you" : (names.get(userId) ?? "another staff member");
  const canReview = staff.role === "lb_admin" || staff.role === "lb_reviewer";

  const checked = facts.filter((f) => f.current && LABELS_WITH_VALUE.includes(f.current.label)).length;
  const groups = GROUP_ORDER.map((g) => ({ group: g, facts: facts.filter((f) => f.definition.group === g) })).filter(
    (g) => g.facts.length > 0,
  );

  return (
    <section className="flex flex-col gap-3" aria-labelledby="facts-heading">
      <div className="flex flex-col gap-0.5">
        <h2 id="facts-heading" className={ui.h2}>
          Facts
        </h2>
        <p className="text-sm text-muted">
          {checked} of {facts.length} have a value. Every change keeps the earlier version, and only LuxuryBoma can edit
          a fact. Use “Not yet checked” rather than a guess.
        </p>
      </div>
      {groups.map(({ group, facts: inGroup }) => (
        <div key={group} className="overflow-hidden rounded-card border border-line bg-white">
          <h3 className="border-b border-line bg-page px-5 py-2 text-xs font-semibold tracking-[0.5px] text-muted uppercase">
            {SPEC_GROUP_LABEL[group]}
          </h3>
          {inGroup.map(({ definition, current, history }) => (
            <FactEditor
              key={definition.key}
              definition={definition}
              initial={factToInput(current)}
              summary={
                current && {
                  display: current.display_value,
                  label: current.label,
                  checkedOn: current.checked_on,
                  checkedBy: current.checked_by ? nameOf(current.checked_by) : null,
                  review: reviewState(current.checked_by, current.reviewed_by),
                  reviewedBy: current.reviewed_by ? nameOf(current.reviewed_by) : null,
                }
              }
              history={history.map((h, i) => ({
                key: `${h.changedAt}-${i}`,
                when: when(h.changedAt),
                who: nameOf(h.changedBy),
                operation: h.operation,
                display: h.display,
                label: h.label,
                source: h.source,
              }))}
              canReview={canReview}
              save={saveFact.bind(null, propertyId, definition.key)}
              review={current ? markFactReviewed.bind(null, propertyId, current.id) : null}
            />
          ))}
        </div>
      ))}
    </section>
  );
}
