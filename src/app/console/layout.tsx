import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { template: "%s · LuxuryBoma console", default: "LuxuryBoma console" },
  robots: { index: false, follow: false },
};

export default function ConsoleLayout({ children }: LayoutProps<"/console">) {
  return (
    <div className="flex flex-1 flex-col bg-page text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-14 w-full max-w-[1180px] items-center gap-2 px-4">
          <span className="font-lb text-lg font-extrabold tracking-tight text-lb-deep">LuxuryBoma</span>
          <span className="rounded-chip bg-lb-tint px-2 py-0.5 font-lb text-xs font-bold text-lb">console</span>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
