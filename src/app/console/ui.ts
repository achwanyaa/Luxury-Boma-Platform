// Shared class names for the console. LuxuryBoma's own identity (purple,
// Plus Jakarta Sans headings) with the platform's radii and 44px controls.
export const ui = {
  narrowMain: "mx-auto flex w-full max-w-[440px] flex-1 flex-col gap-5 px-4 py-12",
  wideMain: "mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-6 px-4 py-10",
  h1: "font-lb! text-2xl font-extrabold text-lb-deep",
  h2: "font-lb! text-lg font-bold text-lb-deep",
  lead: "text-muted",
  card: "rounded-card border border-line bg-white p-5",
  field: "flex flex-col gap-1.5",
  label: "text-sm font-semibold text-body",
  input:
    "h-11 w-full rounded-control border border-line-strong bg-white px-3 text-ink outline-none focus:border-lb focus:ring-2 focus:ring-lb/25",
  button:
    "h-11 rounded-control bg-lb px-5 font-semibold text-white hover:bg-lb-deep disabled:cursor-wait disabled:opacity-70",
  secondaryButton:
    "h-11 rounded-control border border-line-strong bg-white px-4 font-semibold text-lb-deep hover:bg-lb-tint",
  linkButton: "min-h-11 text-sm font-semibold text-lb underline underline-offset-2 hover:text-lb-deep",
  error: "rounded-control border border-fit-red/30 bg-fit-red/5 px-3 py-2 text-sm text-fit-red",
};
