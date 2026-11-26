import Link from "next/link";

// Shown inside the portal's header and footer when a godown or page isn't
// there: most often a shared link to a godown that has since been let, sold
// or paused. Next.js marks this page noindex.
export default function PortalNotFound() {
  return (
    <section className="mx-auto flex max-w-[1180px] flex-col items-start gap-4 px-5 pt-14 pb-20">
      <span className="flex items-center gap-2.5 text-xs font-semibold tracking-[1.6px] text-blue uppercase">
        <span className="h-0.5 w-7 bg-blue" />
        Not listed
      </span>
      <h1 className="text-[32px] leading-[38px] font-extrabold text-navy sm:text-[40px] sm:leading-[46px]">
        This godown isn&apos;t listed right now.
      </h1>
      <p className="max-w-[560px] text-[17px] leading-[27px] text-muted">
        It may have been let or sold, or the link may be mistyped. See the godowns we have now, or message us and
        we&apos;ll tell you what&apos;s coming up.
      </p>
      <div className="flex flex-wrap gap-2.5">
        <Link
          href="/properties"
          className="flex min-h-11 items-center rounded-control bg-blue px-5 text-[15px] font-bold text-white hover:bg-blue-hover"
        >
          See all godowns
        </Link>
        <Link
          href="/"
          className="flex min-h-11 items-center rounded-control border border-line-strong bg-white px-5 text-[15px] font-semibold text-navy hover:border-blue"
        >
          Home page
        </Link>
      </div>
    </section>
  );
}
