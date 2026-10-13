"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

type Photo = { url: string; alt?: string };

function GalleryPhoto({ url, alt, priority }: { url: string; alt: string; priority?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      <Image
        src={url}
        alt={alt}
        fill
        priority={priority}
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
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const current = photos[active];
  const total = photos.length;
  const move = useCallback((delta: number) => setActive((index) => (index + delta + total) % total), [total]);

  // Visualizador aberto: congela o fundo, ouve o teclado (← → Esc) e
  // devolve o foco ao botão de fechar. Repõe tudo ao fechar.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      else if (event.key === "ArrowRight") move(1);
      else if (event.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, move]);

  if (!current) return (
    <div className="flex aspect-[3/2] w-full items-center justify-center border border-border bg-surface-mid">
      <div className="flex flex-col items-center"><span className="text-6xl">🚗</span><span className="mt-3 font-display text-xs uppercase tracking-[0.3em] text-copper">Chikane Garage</span></div>
    </div>
  );

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="relative order-1 aspect-[3/2] w-full min-w-0 overflow-hidden border border-border bg-surface-mid">
        <GalleryPhoto key={current.url} url={current.url} alt={current.alt || title} priority />

        {/* Abre o visualizador (mobile.de): área inteira clicável */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={total > 1 ? `Ver todas as fotografias (${total})` : "Ampliar fotografia"}
          className="absolute inset-0 z-10 cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-copper"
        />

        {total > 1 && <>
          <button type="button" onClick={() => move(-1)} aria-label="Fotografia anterior" className="absolute left-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-black/60 text-2xl text-white backdrop-blur hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-copper">‹</button>
          <button type="button" onClick={() => move(1)} aria-label="Fotografia seguinte" className="absolute right-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-black/60 text-2xl text-white backdrop-blur hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-copper">›</button>
          <span className="pointer-events-none absolute bottom-3 right-3 z-20 rounded bg-black/65 px-2 py-1 text-xs text-white">{active + 1} / {total}</span>
          <span className="pointer-events-none absolute bottom-3 left-3 z-20 hidden items-center gap-2 rounded bg-black/65 px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.16em] text-white sm:inline-flex">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
            Ver todas as fotos ({total})
          </span>
        </>}
      </div>

      {/* Miniaturas — o `relative` é obrigatório para o next/image com `fill` */}
      {total > 1 && (
        <div className="order-2 flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, index) => (
            <button key={`${photo.url}-${index}`} type="button" onClick={() => setActive(index)} aria-label={`Ver fotografia ${index + 1}`} aria-pressed={active === index} className={`relative aspect-[4/3] w-24 shrink-0 overflow-hidden border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-copper sm:w-28 ${active === index ? "border-copper" : "border-border hover:border-muted"}`}>
              <Image src={photo.url} alt={photo.alt || `${title}, fotografia ${index + 1}`} fill sizes="112px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Visualizador de ecrã inteiro */}
      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/95 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Fotografias de ${title}`}>
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <p className="font-display text-xs uppercase tracking-[0.2em] text-white/70">{active + 1} / {total}</p>
            <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="grid h-10 w-10 place-items-center border border-white/20 text-lg text-white transition-colors hover:border-copper hover:text-copper focus-visible:outline focus-visible:outline-2 focus-visible:outline-copper">✕</button>
          </div>

          <div className="relative flex-1 overflow-hidden" onClick={() => setOpen(false)}>
            <div className="relative mx-auto h-full w-full max-w-6xl p-2 sm:p-4" onClick={(event) => event.stopPropagation()}>
              <Image key={current.url} src={current.url} alt={current.alt || title} fill sizes="100vw" className="object-contain" priority />
            </div>
            {total > 1 && <>
              <button type="button" onClick={(event) => { event.stopPropagation(); move(-1); }} aria-label="Fotografia anterior" className="absolute left-2 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-black/60 text-3xl text-white backdrop-blur hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-copper sm:left-6">‹</button>
              <button type="button" onClick={(event) => { event.stopPropagation(); move(1); }} aria-label="Fotografia seguinte" className="absolute right-2 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-black/60 text-3xl text-white backdrop-blur hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-copper sm:right-6">›</button>
            </>}
          </div>

          {total > 1 && (
            <div className="flex gap-2 overflow-x-auto px-4 py-4 sm:px-6">
              {photos.map((photo, index) => (
                <button key={`${photo.url}-lb-${index}`} type="button" onClick={() => setActive(index)} aria-label={`Ver fotografia ${index + 1}`} aria-pressed={active === index} className={`relative aspect-[4/3] w-20 shrink-0 overflow-hidden border transition-colors sm:w-24 ${active === index ? "border-copper" : "border-white/15 hover:border-white/50"}`}>
                  <Image src={photo.url} alt={photo.alt || `${title}, fotografia ${index + 1}`} fill sizes="96px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
