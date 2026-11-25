"use client";

import { useState, useTransition } from "react";
import type { PropertyStatus } from "@/lib/console/property-form";
import type { PublishCheck } from "@/lib/console/publish-rules";
import { ui } from "../ui";
import type { StatusResult } from "./actions";
import { StatusBadge } from "./status-badge";

export type Move = { to: PropertyStatus; label: string; effect: string };

export function StatusPanel({
  status,
  moves,
  check,
  change,
}: {
  status: PropertyStatus;
  moves: Move[];
  check: PublishCheck;
  change: (to: PropertyStatus) => Promise<StatusResult>;
}) {
  const [result, setResult] = useState<StatusResult | null>(null);
  const [pending, start] = useTransition();
  const showChecklist = status !== "live" && status !== "sold_or_leased";
  const canPublishNow = moves.some((m) => m.to === "live");

  const run = (move: Move) => {
    if (!confirm(`${move.label}?\n\n${move.effect}`)) return;
    start(async () => setResult(await change(move.to)));
  };

  return (
    <section className={`${ui.card} flex flex-col gap-4`} aria-labelledby="status-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="status-heading" className={ui.h2}>
          Status
        </h2>
        <StatusBadge status={status} />
      </div>

      {showChecklist && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-body">
            {check.blockers.length === 0 ? "Ready to publish" : "Before it can be published"}
          </h3>
          {check.blockers.length > 0 ? (
            <ul className="flex flex-col gap-1.5 text-sm text-fit-red">
              {check.blockers.map((b) => (
                <li key={b} className="flex gap-2">
                  <span aria-hidden="true">✕</span>
                  {b}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-available">Site visit, active listing and main photo are all in place.</p>
          )}
          {check.warnings.length > 0 && (
            <ul className="flex flex-col gap-1.5 text-sm text-notice">
              {check.warnings.map((w) => (
                <li key={w} className="flex gap-2">
                  <span aria-hidden="true">!</span>
                  {w}
                </li>
              ))}
            </ul>
          )}
          {!canPublishNow && status === "draft" && (
            <p className="text-sm text-muted">Send it for review first; it is published from “In review”.</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {moves.map((move) => {
          const blocked = move.to === "live" && check.blockers.length > 0;
          return (
            <button
              key={move.to}
              type="button"
              disabled={pending || blocked}
              onClick={() => run(move)}
              className={`${move.to === "live" ? ui.button : ui.secondaryButton} w-full disabled:cursor-not-allowed disabled:opacity-50`}
              aria-describedby={blocked ? "status-heading" : undefined}
            >
              {pending ? "Saving…" : move.label}
            </button>
          );
        })}
      </div>

      {result && (
        <div role={result.ok ? "status" : "alert"} className={result.ok ? "text-sm font-semibold text-available" : ui.error}>
          {result.message}
          {result.blockers && (
            <ul className="mt-1 list-disc pl-5">
              {result.blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
