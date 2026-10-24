import Link from "next/link";

type Action = {
  label: string;
  href?: string;
  action?: (formData: FormData) => void | Promise<void>;
  variant?: "primary" | "ghost" | "secondary";
  icon?: React.ReactNode;
};

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions = [],
  backHref,
  backLabel = "Voltar",
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; href: string }[];
  actions?: Action[];
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="mb-7 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          {(breadcrumbs?.length || backHref) && (
            <nav className="flex flex-wrap items-center gap-2 text-[10px] font-display uppercase tracking-[0.22em] text-muted">
              {backHref && (
                <Link href={backHref} className="text-copper transition-colors hover:text-copper-light">
                  ← {backLabel}
                </Link>
              )}
              {breadcrumbs?.map((crumb, index) => (
                <span key={crumb.href} className="flex items-center gap-2">
                  {(backHref || index > 0) && <span className="text-border">/</span>}
                  <Link href={crumb.href} className="transition-colors hover:text-foreground">
                    {crumb.label}
                  </Link>
                </span>
              ))}
            </nav>
          )}
          <div>
            <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-foreground sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{subtitle}</p>}
          </div>
        </div>
        {actions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {actions.map((action) => {
              const classes =
                action.variant === "primary"
                  ? "bg-copper px-4 py-2 font-display text-[11px] uppercase tracking-widest text-black transition-colors hover:bg-copper-light"
                  : action.variant === "secondary"
                    ? "border border-border px-4 py-2 font-display text-[11px] uppercase tracking-widest text-foreground transition-colors hover:border-copper hover:text-copper"
                    : "px-3 py-2 text-xs uppercase tracking-widest text-muted transition-colors hover:text-foreground";
              if (action.href) {
                return (
                  <Link key={action.label} href={action.href} className={classes}>
                    {action.label}
                  </Link>
                );
              }
              if (action.action) {
                return (
                  <form key={action.label} action={action.action}>
                    <button className={classes}>{action.label}</button>
                  </form>
                );
              }
              return (
                <button key={action.label} className={classes}>
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
