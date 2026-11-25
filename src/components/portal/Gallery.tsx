"use client";

import { useState } from "react";
import type { Photo, Walkthrough } from "@/lib/portal/listing-model";

// The property page gallery. The walkthrough video comes first, shown as its
// cover photo with a play button: nothing of the video downloads until a
// buyer taps play, because most arrive on a phone over mobile data. Photos
// after the first load lazily. The 3D tour opens in a new tab.

type Item = { kind: "video"; url: string } | { kind: "photo"; url: string; caption: string | null };

function PlayIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}

function CubeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2 3 7v10l9 5 9-5V7z" />
      <path d="m3 7 9 5 9-5M12 12v10" />
    </svg>
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
    ...photos.map((p) => ({ kind: "photo" as const, url: p.url, caption: p.caption })),
  ];
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const cover = photos[0]?.url;

  const go = (next: number) => {
    setPlaying(false);
    setIndex((next + items.length) % items.length);
  };

  const tourButton = tourUrl && (
    <a
      href={tourUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-11 items-center gap-2 rounded-control bg-white px-4 text-[15px] font-bold text-navy shadow-sm ring-1 ring-line hover:text-blue"
    >
      <CubeIcon />
      Walk through in 3D
    </a>
  );

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <div className="hatch flex aspect-[16/10] w-full items-end justify-between rounded-card p-3 md:aspect-[21/9]" aria-hidden="true">
          <span className="rounded-chip bg-white/85 px-2 py-0.5 font-mono text-[11px] text-muted">{reference}</span>
          <span className="text-[11px] font-semibold tracking-[0.6px] text-muted uppercase">Photos to follow</span>
        </div>
        {tourButton && <div className="flex">{tourButton}</div>}
      </div>
    );
  }

  const current = items[index];
  const photoNumber = (i: number) => (video ? i : i + 1);

  return (
    <section aria-label={`Photos${video ? " and video" : ""} of ${name}`} className="flex flex-col gap-2">
      <div className="relative overflow-hidden rounded-card bg-navy">
        <div className="aspect-[4/3] w-full sm:aspect-[16/9]">
          {current.kind === "video" ? (
            playing ? (
              <video src={current.url} poster={cover} controls autoPlay playsInline className="size-full bg-black object-contain">
                Your browser can&apos;t play this video.
              </video>
            ) : (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="group relative flex size-full items-center justify-center"
                aria-label={`Play the walkthrough video of ${name}`}
              >
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Storage URLs; sized by CSS
                  <img src={cover} alt="" fetchPriority="high" className="absolute inset-0 size-full object-cover opacity-80" />
                ) : (
                  <span className="hatch absolute inset-0" />
                )}
                <span className="relative flex flex-col items-center gap-2 text-white">
                  <span className="flex size-[72px] items-center justify-center rounded-full bg-blue shadow-lg transition-transform group-hover:scale-105">
                    <PlayIcon size={34} />
                  </span>
                  <span className="rounded-chip bg-navy/75 px-3 py-1 text-[15px] font-bold">Watch the walkthrough</span>
                </span>
              </button>
            )
          ) : (
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

        {items.length > 1 && !playing && (
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

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
          <span className="rounded-chip bg-navy/75 px-2 py-0.5 text-[13px] font-semibold text-white" aria-live="polite">
            {current.kind === "video" ? "Video" : current.caption ? `${current.caption} · ` : ""}
            {current.kind === "photo" && `${photoNumber(index)} / ${photos.length}`}
          </span>
          {tourButton && <span className="pointer-events-auto max-sm:hidden">{tourButton}</span>}
        </div>
      </div>

      {tourButton && <div className="flex sm:hidden">{tourButton}</div>}

      {items.length > 1 && (
        <ol className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0" aria-label="Choose a photo">
          {items.map((item, i) => (
            <li key={`${item.kind}-${item.url}`} className="shrink-0">
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={item.kind === "video" ? "Walkthrough video" : (item.caption ?? `Photo ${photoNumber(i)}`)}
                aria-current={i === index ? "true" : undefined}
                className={`relative block h-16 w-[88px] overflow-hidden rounded-chip ring-2 ${
                  i === index ? "ring-blue" : "ring-transparent hover:ring-line-strong"
                }`}
              >
                {item.kind === "video" ? (
                  <>
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Storage URLs; sized by CSS
                      <img src={cover} alt="" loading="lazy" className="size-full object-cover opacity-70" />
                    ) : (
                      <span className="hatch block size-full" />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-navy/30 text-white">
                      <PlayIcon size={22} />
                    </span>
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- Storage URLs; sized by CSS
                  <img src={item.url} alt="" loading="lazy" className="size-full object-cover" />
                )}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
