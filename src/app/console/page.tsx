import { Suspense } from "react";
import { requireStaff, ROLE_LABEL } from "@/lib/console/staff";
import { signOut } from "./actions";
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

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className={ui.h1}>Console</h1>
          <p className={ui.lead}>
            Signed in as {staff.displayName ?? staff.email} · {ROLE_LABEL[staff.role]} · two-factor on
          </p>
        </div>
        <form action={signOut}>
          <button type="submit" className={ui.secondaryButton}>
            Sign out
          </button>
        </form>
      </div>
      <section className={`${ui.card} flex flex-col gap-2`}>
        <h2 className={ui.h2}>Properties</h2>
        <p className="text-body">
          Entering properties, facts with their provenance, documents and media comes next.
        </p>
      </section>
    </>
  );
}
