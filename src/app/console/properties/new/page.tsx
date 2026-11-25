import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { listClients } from "@/lib/console/properties";
import { EMPTY_PROPERTY } from "@/lib/console/property-form";
import { requireStaff } from "@/lib/console/staff";
import { ui } from "../../ui";
import { createProperty } from "../actions";
import { PropertyForm } from "../property-form";

export const metadata: Metadata = { title: "New property" };

export default function NewPropertyPage() {
  return (
    <main className={`${ui.wideMain} max-w-[820px]!`}>
      <div className="flex flex-col gap-1">
        <Link href="/properties" className="text-sm font-semibold text-lb hover:text-lb-deep">
          ← Properties
        </Link>
        <h1 className={ui.h1}>New property</h1>
        <p className={ui.lead}>
          Starts as a draft. The listing, facts, photos and documents are added after it is created.
        </p>
      </div>
      <Suspense fallback={<p className={ui.lead}>Loading…</p>}>
        <NewPropertyForm />
      </Suspense>
    </main>
  );
}

async function NewPropertyForm() {
  await requireStaff();
  const clients = await listClients();
  return <PropertyForm mode="new" action={createProperty} initial={EMPTY_PROPERTY} clients={clients} />;
}
