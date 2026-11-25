"use client";

import { useActionState, useState } from "react";
import { ProvenancePill } from "@/components/ProvenancePill";
import {
  autoDisplay,
  LABELS_WITH_VALUE,
  parseNumber,
  PROVENANCE_OPTIONS,
  type FactDefinition,
  type FactField,
  type FactInput,
  type Provenance,
} from "@/lib/console/fact-form";
import { ui } from "../ui";
import type { FactFormState, ReviewState } from "./actions";

export type FactSummary = {
  display: string;
  label: Provenance;
  checkedOn: string | null;
  checkedBy: string | null;
  review: "not_reviewed" | "self_reviewed" | "reviewed";
  reviewedBy: string | null;
};

export type DocumentOption = { id: string; citation: string };

export type FactHistoryView = {
  key: string;
  when: string;
  who: string;
  operation: string;
  display: string;
  label: Provenance;
  source: string | null;
};

type Props = {
  definition: FactDefinition & { requiredToPublish: boolean };
  initial: FactInput;
  summary: FactSummary | null;
  history: FactHistoryView[];
  canReview: boolean;
  documents: DocumentOption[];
  save: (prev: FactFormState, formData: FormData) => Promise<FactFormState>;
  review: (() => Promise<ReviewState>) | null;
};

const dateText = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;

export function FactEditor(props: Props) {
  const { definition, summary } = props;
  const [state, action, pending] = useActionState(props.save, undefined);
  const values = state?.input ?? props.initial;

  return (
    <details className="group border-b border-line-soft last:border-b-0" open={Boolean(state && !state.saved)}>
      <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3 hover:bg-lb-tint/40 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-[220px] flex-1 items-center gap-2 font-semibold text-lb-deep">
          <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-90">
            ›
          </span>
          {definition.name}
          {definition.requiredToPublish && (
            <span className="rounded-chip bg-lb-tint px-1.5 py-0.5 text-[11px] font-bold text-lb">Required</span>
          )}
        </span>
        <span className="min-w-[110px] font-semibold text-ink tabular-nums">
          {summary && LABELS_WITH_VALUE.includes(summary.label) ? summary.display : "—"}
        </span>
        <ProvenancePill kind={summary?.label ?? "not_yet_checked"} />
        <span className="min-w-[150px] text-sm text-muted">
          {summary?.checkedOn ? `Checked ${dateText(summary.checkedOn)}` : ""}
          {summary && summary.review !== "not_reviewed" && (
            <span className="block">{summary.review === "self_reviewed" ? "Self-reviewed" : `Reviewed by ${summary.reviewedBy}`}</span>
          )}
        </span>
      </summary>

      <div className="flex flex-col gap-5 border-t border-line-soft bg-page/60 px-5 py-4">
        <form action={action} className="flex flex-col gap-4" key={JSON.stringify(values)}>
          <FactFields definition={definition} values={values} errors={state?.errors ?? {}} documents={props.documents} />
          {state?.message && (
            <p role={state.saved ? "status" : "alert"} className={state.errors && Object.keys(state.errors).length ? ui.error : "text-sm text-muted"}>
              {state.message}
            </p>
          )}
          {state?.saved && (
            <p role="status" className="rounded-control border border-available/30 bg-available-bg px-3 py-2 text-sm text-available">
              Saved. Any earlier version is kept in the history below.
            </p>
          )}
          <button type="submit" disabled={pending} className={`${ui.button} w-fit`}>
            {pending ? "Saving…" : "Save fact"}
          </button>
        </form>

        {summary && <ReviewPanel summary={summary} canReview={props.canReview} review={props.review} />}
        {props.history.length > 0 && <History entries={props.history} />}
      </div>
    </details>
  );
}

function FactFields({
  definition,
  values,
  errors,
  documents,
}: {
  definition: FactDefinition;
  values: FactInput;
  errors: Partial<Record<FactField, string>>;
  documents: DocumentOption[];
}) {
  const [label, setLabel] = useState(values.label as Provenance);
  const [source, setSource] = useState(values.source);
  const [documentId, setDocumentId] = useState(values.document_id);
  const linked = documents.find((d) => d.id === documentId);
  const [value, setValue] = useState(values.value);
  const carriesValue = LABELS_WITH_VALUE.includes(label);
  const option = PROVENANCE_OPTIONS.find((o) => o.value === label);
  const id = (name: FactField) => `${definition.key}-${name}`;

  const fieldError = (name: FactField) =>
    errors[name] && (
      <span id={`${id(name)}-error`} className="text-sm font-semibold text-fit-red">
        {errors[name]}
      </span>
    );
  const aria = (name: FactField) =>
    errors[name] ? { "aria-invalid": true as const, "aria-describedby": `${id(name)}-error` } : {};

  // What the portal will show if no display text is typed.
  const parsed =
    definition.value_type === "number" ? parseNumber(value) : definition.value_type === "boolean" ? (value === "yes" ? true : value === "no" ? false : null) : value || null;
  const autoText = parsed === null ? "" : autoDisplay(definition.value_type, parsed, definition.unit);

  return (
    <>
      <label className={ui.field}>
        <span className={ui.label}>How was it checked?</span>
        <select
          name="label"
          value={label}
          onChange={(e) => setLabel(e.target.value as Provenance)}
          className={`${ui.input} sm:max-w-[320px]`}
          {...aria("label")}
        >
          {PROVENANCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.text}
            </option>
          ))}
        </select>
        {errors.label ? fieldError("label") : <span className="text-sm text-muted">{option?.help}</span>}
      </label>

      {carriesValue && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={ui.field}>
            <span className={ui.label}>
              Value{definition.value_type === "number" && definition.unit ? ` (${definition.unit})` : ""}
            </span>
            {definition.value_type === "boolean" ? (
              <select name="value" value={value} onChange={(e) => setValue(e.target.value)} className={ui.input} {...aria("value")}>
                <option value="">Choose</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            ) : (
              <input
                name="value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                inputMode={definition.value_type === "number" ? "decimal" : undefined}
                className={ui.input}
                {...aria("value")}
              />
            )}
            {fieldError("value")}
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Shown as</span>
            <input
              name="display_value"
              defaultValue={values.display_value}
              placeholder={autoText || "Filled in from the value"}
              className={ui.input}
            />
            <span className="text-sm text-muted">Leave blank to use “{autoText || "…"}”.</span>
          </label>
        </div>
      )}
      {!carriesValue && <input type="hidden" name="value" value="" />}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={ui.field}>
          <span className={ui.label}>Source{label === "from_drawings" ? " (drawing and author)" : ""}</span>
          <input
            name="source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder={label === "from_drawings" ? "Drawing A-201 rev B, Sketch3D Ltd" : "Where the figure came from"}
            className={ui.input}
            {...aria("source")}
          />
          {fieldError("source")}
          {linked && source !== linked.citation && (
            <button type="button" onClick={() => setSource(linked.citation)} className={`${ui.linkButton} w-fit text-left`}>
              Use “{linked.citation}”
            </button>
          )}
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Linked document</span>
          <select
            name="document_id"
            value={documentId}
            onChange={(e) => {
              const next = e.target.value;
              setDocumentId(next);
              const doc = documents.find((d) => d.id === next);
              // Fill an empty source from the document; never overwrite one that was typed.
              if (doc && source.trim() === "") setSource(doc.citation);
            }}
            className={ui.input}
            {...aria("document_id")}
          >
            <option value="">None</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.citation}
              </option>
            ))}
          </select>
          {errors.document_id ? fieldError("document_id") : documents.length === 0 && <span className="text-sm text-muted">Add documents above to link them here.</span>}
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Method</span>
          <input
            name="method"
            defaultValue={values.method}
            placeholder={label === "measured" ? "Laser measure, floor to underside of truss" : "How it was worked out"}
            className={ui.input}
          />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Checked on{label === "measured" ? "" : " (optional)"}</span>
          <input type="date" name="checked_on" defaultValue={values.checked_on} className={ui.input} {...aria("checked_on")} />
          {fieldError("checked_on")}
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Note (staff only)</span>
          <input name="note" defaultValue={values.note} className={ui.input} />
        </label>
      </div>
    </>
  );
}

function ReviewPanel({
  summary,
  canReview,
  review,
}: {
  summary: FactSummary;
  canReview: boolean;
  review: (() => Promise<ReviewState>) | null;
}) {
  const [state, action, pending] = useActionState(async () => (review ? review() : undefined), undefined);
  const checkable = summary.label !== "not_yet_checked";

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span className="text-body">
        {summary.checkedBy ? `Checked by ${summary.checkedBy}. ` : ""}
        {summary.review === "not_reviewed"
          ? "Not reviewed yet."
          : summary.review === "self_reviewed"
            ? "Self-reviewed: the same person checked and reviewed it, and the verification page will say so."
            : `Reviewed by ${summary.reviewedBy}.`}
      </span>
      {canReview && checkable && summary.review === "not_reviewed" && !state?.ok && (
        <form action={action}>
          <button type="submit" disabled={pending} className={ui.secondaryButton}>
            {pending ? "Marking…" : "Mark reviewed"}
          </button>
        </form>
      )}
      {state && <span className={state.ok ? "font-semibold text-available" : "font-semibold text-fit-red"}>{state.message}</span>}
    </div>
  );
}

function History({ entries }: { entries: FactHistoryView[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-xs font-semibold tracking-[0.5px] text-muted uppercase">Earlier versions</h4>
      <ol className="flex flex-col gap-1.5 text-sm">
        {entries.map((h) => (
          <li key={h.key} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="min-w-[150px] text-muted">
              {h.when} · {h.who}
            </span>
            <span className="font-semibold text-ink">{h.display}</span>
            <ProvenancePill kind={h.label} />
            {h.source && <span className="text-muted">{h.source}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
