import { adminPath } from "@/lib/console/access";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { listProperties } from "@/lib/console/properties";
import { requireStaff } from "@/lib/console/staff";
import { ui } from "../ui";
import { StatusBadge } from "./status-badge";

export const metadata: Metadata = { title: "Properties" };

const dateText = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Not yet";

export default function PropertiesPage() {
  return (
    <main className={ui.wideMain}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={ui.h1}>Properties</h1>
        <Link href={adminPath("/properties/new")} className={`${ui.button} flex items-center`}>
          New property
        </Link>
      </div>
      <Suspense fallback={<p className={ui.lead}>Loading…</p>}>
        <PropertyList />
      </Suspense>
    </main>
  );
}

async function PropertyList() {
  await requireStaff();
  const properties = await listProperties();

  if (properties.length === 0) {
    return (
      <section className={`${ui.card} flex flex-col items-start gap-3`}>
        <p className="text-body">No properties yet.</p>
        <Link href={adminPath("/properties/new")} className={`${ui.button} flex items-center`}>
          Add the first property
        </Link>
      </section>
    );
  }

  return (
    <ul className="flex flex-col overflow-hidden rounded-card border border-line bg-white">
      <li
        aria-hidden="true"
        className="hidden grid-cols-[140px_minmax(0,1fr)_160px_120px_130px] gap-4 border-b border-line px-5 py-2.5 text-xs font-semibold tracking-[0.5px] text-muted uppercase md:grid"
      >
        <span>Reference</span>
        <span>Name</span>
        <span>Client</span>
        <span>Status</span>
        <span>Site visit</span>
      </li>
      {properties.map((p) => (
        <li key={p.id} className="border-b border-line-soft last:border-b-0">
          <Link
            href={adminPath(`/properties/${p.id}`)}
            className="grid gap-1 px-5 py-3.5 hover:bg-lb-tint/40 md:grid-cols-[140px_minmax(0,1fr)_160px_120px_130px] md:items-center md:gap-4"
          >
            <span className="text-sm font-semibold text-muted tabular-nums">{p.reference}</span>
            <span className="font-semibold text-lb-deep">{p.name}</span>
            <span className="text-sm text-body">{p.client?.name ?? "—"}</span>
            <StatusBadge status={p.status} />
            <span className="text-sm text-body">
              <span className="md:hidden">Site visit: </span>
              {dateText(p.siteVisitedOn)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
