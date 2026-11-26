import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found" };

// For addresses that match no page at all. Light and plain on purpose: it
// renders inside the root layout only, without a site's header.
export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-1 flex-col items-center justify-center gap-4 bg-page px-5 text-center text-ink">
      <h1 className="text-[28px] font-extrabold text-navy">Page not found</h1>
      <p className="max-w-[420px] text-muted">The address may be mistyped, or the page has moved.</p>
      <Link
        href="/"
        className="flex min-h-11 items-center rounded-control bg-blue px-5 text-[15px] font-bold text-white hover:bg-blue-hover"
      >
        Go to the home page
      </Link>
    </main>
  );
}
