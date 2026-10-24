import Link from "next/link";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-border px-6 py-12 text-center">
      <p className="font-display text-lg uppercase tracking-tight text-foreground">{title}</p>
      {description && <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="mt-5 border border-copper px-4 py-2 font-display text-[11px] uppercase tracking-widest text-copper transition-colors hover:bg-copper hover:text-black">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
