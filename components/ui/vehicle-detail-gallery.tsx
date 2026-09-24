"use client";

import { useState } from "react";

type Photo = { url: string; alt?: string };

export function VehicleDetailGallery({ photos, title }: { photos: Photo[]; title: string }) {
  const [active, setActive] = useState(0);
  const current = photos[active];
  const move = (delta: number) => setActive((index) => (index + delta + photos.length) % photos.length);

  if (!current) return (
    <div className="flex aspect-[4/3] items-center justify-center rounded border border-border bg-[#141414]">
      <div className="flex flex-col items-center"><span className="text-6xl">🚗</span><span className="mt-3 font-display text-xs uppercase tracking-[0.3em] text-copper">Chikane Garage</span></div>
    </div>
  );

  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-4">
      <div className="flex max-h-[36rem] flex-col gap-2 overflow-y-auto pr-1 max-lg:flex-row max-lg:col-span-2 max-lg:order-2 max-lg:max-h-none max-lg:overflow-x-auto max-lg:overflow-y-hidden max-lg:pr-0">
        {photos.map((photo, index) => (
          <button key={`${photo.url}-${index}`} type="button" onClick={() => setActive(index)} aria-label={`Ver fotografia ${index + 1}`} aria-pressed={active === index} className={`h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-copper sm:h-[5.5rem] sm:w-[5.5rem] ${active === index ? "border-copper" : "border-border hover:border-muted"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt={photo.alt || `${title}, fotografia ${index + 1}`} loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      <div className="relative order-1 aspect-[4/3] min-w-0 overflow-hidden rounded border border-border bg-[#141414] max-lg:col-span-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={current.url} src={current.url} alt={current.alt || title} className="h-full w-full object-contain" />
        {photos.length > 1 && <>
          <button type="button" onClick={() => move(-1)} aria-label="Fotografia anterior" className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-black/60 text-2xl text-white backdrop-blur hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-copper">‹</button>
          <button type="button" onClick={() => move(1)} aria-label="Fotografia seguinte" className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-black/60 text-2xl text-white backdrop-blur hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-copper">›</button>
          <span className="absolute bottom-3 right-3 rounded bg-black/65 px-2 py-1 text-xs text-white">{active + 1} / {photos.length}</span>
        </>}
      </div>
    </div>
  );
}
