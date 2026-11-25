import type { PortalProperty } from "@/lib/portal/listing-model";

// The property's main photo, or the CAD hatch with its reference when no photo
// has been taken yet.
export function PropertyPhoto({
  property,
  index = 0,
  className = "",
}: {
  property: Pick<PortalProperty, "name" | "reference" | "photos">;
  index?: number;
  className?: string;
}) {
  const photo = property.photos[index];
  if (photo) {
    return (
      // Photo hosts are not fixed yet (storage bucket comes with milestone 2,
      // step 5), so a plain img rather than next/image for now.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo.url}
        alt={photo.caption ?? property.name}
        loading="lazy"
        className={`w-full object-cover ${className}`}
      />
    );
  }

  return (
    <div className={`hatch flex w-full items-end justify-between p-3 ${className}`} aria-hidden="true">
      <span className="rounded-chip bg-white/85 px-2 py-0.5 font-mono text-[11px] text-muted">{property.reference}</span>
      <span className="text-[11px] font-semibold tracking-[0.6px] text-muted uppercase">Photos to follow</span>
    </div>
  );
}
