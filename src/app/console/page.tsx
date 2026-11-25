import Link from "next/link";
import { Suspense } from "react";
import { countByStatus } from "@/lib/console/properties";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/console/property-form";
import { requireStaff, ROLE_LABEL } from "@/lib/console/staff";
import { ui } from "./ui";

export default function ConsoleHome() {
  return (
    <main className={ui.wideMain}>
      <Suspense fallback={<p className={ui.lead}>Loading…</p>}>
        <StaffHome />
      </Suspense>
    </main>
  );
}

async function StaffHome() {
  const staff = await requireStaff();
  const counts = await countByStatus();
  const total = STATUS_ORDER.reduce((sum, s) => sum + counts[s], 0);

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className={ui.h1}>Console</h1>
        <p className={ui.lead}>
          Signed in as {staff.displayName ?? staff.email} · {ROLE_LABEL[staff.role]} · two-factor on
        </p>
      </div>
      <section className={`${ui.card} flex flex-col gap-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={ui.h2}>Properties</h2>
          <div className="flex gap-2">
            <Link href="/properties" className={`${ui.secondaryButton} flex items-center`}>
              See all
            </Link>
            <Link href="/properties/new" className={`${ui.button} flex items-center`}>
              New property
            </Link>
          </div>
        </div>
        {total === 0 ? (
          <p className="text-body">No properties yet. Start with the first godown.</p>
        ) : (
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-control border border-line bg-line sm:grid-cols-5">
            {STATUS_ORDER.map((status) => (
              <div key={status} className="flex flex-col gap-0.5 bg-white px-4 py-3">
                <dt className="text-xs font-semibold tracking-[0.5px] text-muted uppercase">{STATUS_LABEL[status]}</dt>
                <dd className="text-2xl font-bold text-lb-deep tabular-nums">{counts[status]}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </>
  );
}
