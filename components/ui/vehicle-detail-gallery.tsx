"use client";

import { useState } from "react";
import Image from "next/image";

type Photo = { url: string; alt?: string };

function GalleryPhoto({ url, alt }: { url: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      <Image
        src={url}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 66vw"
        className={`kenburns object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
      />
      {!loaded && <div aria-hidden="true" className="shimmer absolute inset-0" />}
    </>
  );
}

export function VehicleDetailGallery({ photos, title }: { photos: Photo[]; title: string }) {
  const [active, setActive] = useState(0);
  const current = photos[active];
  const move = (delta: number) => setActive((index) => (index + delta + photos.length) % photos.length);

  if (!current) return (
    <div className="flex aspect-[3/2] w-full items-center justify-center border border-border bg-surface-mid">
      <div className="flex flex-col items-center"><span className="text-6xl">🚗</span><span className="mt-3 font-display text-xs uppercase tracking-[0.3em] text-copper">Chikane Garage</span></div>
    </div>
  );

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="relative order-1 aspect-[3/2] w-full min-w-0 overflow-hidden border border-border bg-surface-mid">
        <GalleryPhoto key={current.url} url={current.url} alt={current.alt || title} />
        {photos.length > 1 && <>
          <button type="button" onClick={() => move(-1)} aria-label="Fotografia anterior" className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-black/60 text-2xl text-white backdrop-blur hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-copper">‹</button>
          <button type="button" onClick={() => move(1)} aria-label="Fotografia seguinte" className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-black/60 text-2xl text-white backdrop-blur hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-copper">›</button>
          <span className="absolute bottom-3 right-3 rounded bg-black/65 px-2 py-1 text-xs text-white">{active + 1} / {photos.length}</span>
        </>}
      </div>
      <div className="order-2 flex gap-2 overflow-x-auto pb-1">
        {photos.map((photo, index) => (
          <button key={`${photo.url}-${index}`} type="button" onClick={() => setActive(index)} aria-label={`Ver fotografia ${index + 1}`} aria-pressed={active === index} className={`aspect-[4/3] w-24 shrink-0 overflow-hidden border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-copper sm:w-28 ${active === index ? "border-copper" : "border-border hover:border-muted"}`}>
            <Image src={photo.url} alt={photo.alt || `${title}, fotografia ${index + 1}`} fill sizes="112px" className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
