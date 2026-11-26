"use client";

import { useRef, useState, useSyncExternalStore } from "react";

const noSubscribe = () => () => {};
/** Whether this browser lets a page go full screen (iPhones do not, for anything but video). False on the server. */
function useCanFullscreen() {
  return useSyncExternalStore(noSubscribe, () => Boolean(document.fullscreenEnabled), () => false);
}
import type { Photo, Walkthrough } from "@/lib/portal/listing-model";

// The property page gallery: the walkthrough video, the 3D tour, then the
// photos. The video and the tour are shown as the cover photo with a play
// button, and nothing of them loads until a buyer taps it, because most
// arrive on a phone over mobile data. The tour plays inside the gallery
// (Realsee allows embedding), never in a new tab.

type Item =
  | { kind: "video"; url: string }
  | { kind: "tour"; url: string }
  | { kind: "photo"; url: string; caption: string | null };

function PlayIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}

function CubeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2 3 7v10l9 5 9-5V7z" />
      <path d="m3 7 9 5 9-5M12 12v10" />
    </svg>
  );
}

function Cover({ src }: { src: string | undefined }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- Storage URLs; sized by CSS
    <img src={src} alt="" fetchPriority="high" className="absolute inset-0 size-full object-cover opacity-80" />
  ) : (
    <span className="hatch absolute inset-0" />
  );
}

export function Gallery({
  name,
  reference,
  photos,
  video,
  tourUrl,
}: {
  name: string;
  reference: string;
  photos: Photo[];
  video: Walkthrough | null;
  tourUrl: string | null;
}) {
  const items: Item[] = [
    ...(video ? [{ kind: "video" as const, url: video.url }] : []),
    ...(tourUrl ? [{ kind: "tour" as const, url: tourUrl }] : []),
    ...photos.map((p) => ({ kind: "photo" as const, url: p.url, caption: p.caption })),
  ];
  const tourIndex = items.findIndex((i) => i.kind === "tour");
  const [index, setIndex] = useState(0);
  // True while the video plays or the tour is open: the arrows step aside.
  const [active, setActive] = useState(false);
  const [tourLoaded, setTourLoaded] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const canFullscreen = useCanFullscreen();
  const cover = photos[0]?.url;
  const firstPhoto = items.findIndex((i) => i.kind === "photo");

  const go = (next: number) => {
    setActive(false);
    setTourLoaded(false);
    setIndex((next + items.length) % items.length);
  };

  const openTour = () => {
    setIndex(tourIndex);
    setActive(true);
    stage.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  if (items.length === 0) {
    return (
      <div className="hatch flex aspect-[16/10] w-full items-end justify-between rounded-card p-3 md:aspect-[21/9]" aria-hidden="true">
        <span className="rounded-chip bg-white/85 px-2 py-0.5 font-mono text-[11px] text-muted">{reference}</span>
        <span className="text-[11px] font-semibold tracking-[0.6px] text-muted uppercase">Photos to follow</span>
      </div>
    );
  }

  const current = items[index];
  const photoNumber = (i: number) => i - firstPhoto + 1;

  const tourButton = tourUrl && !(current.kind === "tour" && active) && (
    <button
      type="button"
      onClick={openTour}
      className="flex min-h-11 items-center gap-2 rounded-control bg-white px-4 text-[15px] font-bold text-navy shadow-sm ring-1 ring-line hover:text-blue"
    >
      <CubeIcon />
      Walk through in 3D
    </button>
  );

  return (
    <section aria-label={`Photos${video ? ", video" : ""}${tourUrl ? " and 3D tour" : ""} of ${name}`} className="flex flex-col gap-2">
      <div ref={stage} className="relative overflow-hidden rounded-card bg-navy">
        <div className={`w-full ${current.kind === "tour" && active ? "aspect-[3/4] sm:aspect-[16/9]" : "aspect-[4/3] sm:aspect-[16/9]"}`}>
          {current.kind === "video" &&
            (active ? (
              <video src={current.url} poster={cover} controls autoPlay playsInline className="size-full bg-black object-contain">
                Your browser can&apos;t play this video.
              </video>
            ) : (
              <button
                type="button"
                onClick={() => setActive(true)}
                className="group relative flex size-full items-center justify-center"
                aria-label={`Play the walkthrough video of ${name}`}
              >
                <Cover src={cover} />
                <span className="relative flex flex-col items-center gap-2 text-white">
                  <span className="flex size-[72px] items-center justify-center rounded-full bg-blue shadow-lg transition-transform group-hover:scale-105">
                    <PlayIcon size={34} />
                  </span>
                  <span className="rounded-chip bg-navy/75 px-3 py-1 text-[15px] font-bold">Watch the walkthrough</span>
                </span>
              </button>
            ))}

          {current.kind === "tour" &&
            (active ? (
              <div className="relative size-full bg-navy">
                {!tourLoaded && (
                  <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-[15px] font-semibold text-white" role="status">
                    Loading the 3D tour… On mobile data this can take a little while.
                  </p>
                )}
                <iframe
                  src={current.url}
                  title={`3D tour of ${name}`}
                  allow="fullscreen; accelerometer; gyroscope; magnetometer; xr-spatial-tracking"
                  referrerPolicy="strict-origin-when-cross-origin"
                  onLoad={() => setTourLoaded(true)}
                  className={`relative size-full border-0 ${tourLoaded ? "" : "opacity-0"}`}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setActive(true)}
                className="group relative flex size-full items-center justify-center"
                aria-label={`Open the 3D tour of ${name}`}
              >
                <Cover src={cover} />
                <span className="relative flex flex-col items-center gap-2 text-white">
                  <span className="flex size-[72px] items-center justify-center rounded-full bg-blue shadow-lg transition-transform group-hover:scale-105">
                    <CubeIcon size={32} />
                  </span>
                  <span className="rounded-chip bg-navy/75 px-3 py-1 text-[15px] font-bold">Walk through in 3D</span>
                </span>
              </button>
            ))}

          {current.kind === "photo" && (
            // eslint-disable-next-line @next/next/no-img-element -- Storage URLs; sized by CSS
            <img
              key={current.url}
              src={current.url}
              alt={current.caption ?? `${name}, photo ${photoNumber(index)}`}
              fetchPriority={index === 0 ? "high" : undefined}
              className="size-full object-cover"
            />
          )}
        </div>

        {items.length > 1 && !active && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous"
              className="absolute top-1/2 left-2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl font-bold text-navy shadow hover:bg-white"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next"
              className="absolute top-1/2 right-2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl font-bold text-navy shadow hover:bg-white"
            >
              ›
            </button>
          </>
        )}

        {!active && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
            <span className="rounded-chip bg-navy/75 px-2 py-0.5 text-[13px] font-semibold text-white" aria-live="polite">
              {current.kind === "video" && "Video"}
              {current.kind === "tour" && "3D tour"}
              {current.kind === "photo" && `${current.caption ? `${current.caption} · ` : ""}${photoNumber(index)} / ${photos.length}`}
            </span>
            {tourButton && current.kind !== "tour" && <span className="pointer-events-auto max-sm:hidden">{tourButton}</span>}
          </div>
        )}
      </div>

      {current.kind === "tour" && active && (
        // Below the tour, clear of Realsee's own buttons inside it.
        <div className="flex justify-between gap-2">
          <button
            type="button"
            onClick={() => go(firstPhoto === -1 ? index : firstPhoto)}
            className="flex min-h-11 items-center rounded-control border border-line-strong bg-white px-4 text-[15px] font-semibold text-navy hover:border-blue"
          >
            ‹ Back to photos
          </button>
          {canFullscreen && (
            <button
              type="button"
              onClick={() => void stage.current?.requestFullscreen()}
              className="flex min-h-11 items-center rounded-control border border-line-strong bg-white px-4 text-[15px] font-semibold text-navy hover:border-blue"
            >
              Full screen
            </button>
          )}
        </div>
      )}

      {tourButton && current.kind !== "tour" && <div className="flex sm:hidden">{tourButton}</div>}

      {items.length > 1 && (
        <ol className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0" aria-label="Choose a photo, the video or the 3D tour">
          {items.map((item, i) => (
            <li key={`${item.kind}-${item.url}`} className="shrink-0">
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={
                  item.kind === "video" ? "Walkthrough video" : item.kind === "tour" ? "3D tour" : (item.caption ?? `Photo ${photoNumber(i)}`)
                }
                aria-current={i === index ? "true" : undefined}
                className={`relative block h-16 w-[88px] overflow-hidden rounded-chip ring-2 ${
                  i === index ? "ring-blue" : "ring-transparent hover:ring-line-strong"
                }`}
              >
                {item.kind === "photo" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Storage URLs; sized by CSS
                  <img src={item.url} alt="" loading="lazy" className="size-full object-cover" />
                ) : (
                  <>
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Storage URLs; sized by CSS
                      <img src={cover} alt="" loading="lazy" className="size-full object-cover opacity-70" />
                    ) : (
                      <span className="hatch block size-full" />
                    )}
                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-navy/40 text-[11px] font-bold text-white">
                      {item.kind === "video" ? <PlayIcon size={20} /> : <CubeIcon size={20} />}
                      {item.kind === "tour" && "3D"}
                    </span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
