"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";

type Photo = { url: string; alt?: string };

export function VehicleCardGallery({ photos, href, title, children }: { photos: Photo[]; href: string; title: string; children?: ReactNode }) {
  const [active, setActive] = useState(0);
  const current = photos[active];
  const move = (delta: number) => setActive((index) => (index + delta + photos.length) % photos.length);

  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-[#1c1c1c]">
      {current ? <Link href={href} aria-label={`Ver ${title}`} className="group/image block h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={current.url} src={current.url} alt={current.alt || title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover/image:scale-[1.03]" />
      </Link> : <Link href={href} className="flex h-full w-full flex-col items-center justify-center"><span className="text-5xl">🚗</span><span className="mt-3 font-display text-xs uppercase tracking-[0.3em] text-copper">Chikane Garage</span></Link>}
      {children}
      {photos.length > 1 && <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5">
        <button type="button" aria-label={`Fotografia anterior de ${title}`} onClick={() => move(-1)} className="grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-black/70 text-xl leading-none text-white hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-copper">‹</button>
        <span className="min-w-10 rounded bg-black/70 px-2 py-1 text-center text-[11px] text-white">{active + 1}/{photos.length}</span>
        <button type="button" aria-label={`Fotografia seguinte de ${title}`} onClick={() => move(1)} className="grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-black/70 text-xl leading-none text-white hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-copper">›</button>
      </div>}
    </div>
  );
}
