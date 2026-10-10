import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

type Photo = { url: string; alt?: string };

const galleryClass = "absolute inset-0 h-full w-full object-cover";

export function VehicleCardGallery({ photos, href, title, children, className }: { photos: Photo[]; href: string; title: string; children?: ReactNode; className?: string }) {
  const [first, second] = photos;

  return (
    <div className={`group/gallery relative aspect-[4/3] overflow-hidden bg-surface-raised ${className || ""}`}>
      <Link href={href} aria-label={`Ver ${title}`} className="absolute inset-0 block">
        {first ? <>
          <Image
            src={first.url}
            alt={first.alt || title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className={`${galleryClass} transition-[opacity,transform] duration-700 group-hover/gallery:scale-[1.06]`}
          />
          {second && <>
            <Image
              src={second.url}
              alt={second.alt || title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className={`${galleryClass} opacity-0 transition-[opacity,transform] duration-700 group-hover/gallery:scale-[1.06] group-hover/gallery:opacity-100`}
            />
          </>}
        </> : <span className="flex h-full w-full flex-col items-center justify-center"><span className="text-5xl">🚗</span><span className="mt-3 font-display text-xs uppercase tracking-[0.3em] text-copper">Chikane Garage</span></span>}
      </Link>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 border border-transparent transition-all duration-300 group-hover/gallery:border-copper/80 group-hover/gallery:shadow-[inset_0_0_30px_rgba(244,119,36,0.18),0_0_22px_rgba(244,119,36,0.25)]" />
      {children}
    </div>
  );
}