import { forwardRef } from "react";

export const Card = forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string; title?: string; subtitle?: string; actions?: React.ReactNode }>(
  ({ children, className = "", title, subtitle, actions }, ref) => {
    return (
      <section ref={ref} className={`border border-border bg-surface ${className}`}>
        {(title || actions) && (
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
            <div>
              {title && <h2 className="font-display text-lg uppercase tracking-tight text-foreground">{title}</h2>}
              {subtitle && <p className="mt-1 text-sm leading-relaxed text-muted">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </header>
        )}
        <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
      </section>
    );
  },
);
Card.displayName = "Card";
