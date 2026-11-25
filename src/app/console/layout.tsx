import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getStaff } from "@/lib/console/staff";
import { signOut } from "./actions";

export const metadata: Metadata = {
  title: { template: "%s · LuxuryBoma console", default: "LuxuryBoma console" },
  robots: { index: false, follow: false },
};

export default function ConsoleLayout({ children }: LayoutProps<"/console">) {
  return (
    <div className="flex flex-1 flex-col bg-page text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex min-h-14 w-full max-w-[1180px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-lb text-lg font-extrabold tracking-tight text-lb-deep">LuxuryBoma</span>
            <span className="rounded-chip bg-lb-tint px-2 py-0.5 font-lb text-xs font-bold text-lb">console</span>
          </Link>
          <Suspense fallback={null}>
            <StaffNav />
          </Suspense>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}

// Shown only to a two-factor staff session; the sign-in pages get the bare header.
async function StaffNav() {
  const staff = await getStaff();
  if (!staff) return null;
  return (
    <>
      <nav className="flex items-center gap-1">
        <Link href="/properties" className="flex min-h-11 items-center px-2 font-semibold text-body hover:text-lb">
          Properties
        </Link>
      </nav>
      <form action={signOut} className="ml-auto flex items-center gap-3">
        <span className="text-sm text-muted max-sm:hidden">{staff.displayName ?? staff.email}</span>
        <button type="submit" className="min-h-11 text-sm font-semibold text-lb hover:text-lb-deep">
          Sign out
        </button>
      </form>
    </>
  );
}
