import Link from "next/link";

type Tab = {
  label: string;
  value: string;
  href: string;
  count?: number;
};

export function Tabs({ tabs, active }: { tabs: Tab[]; active: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border">
      {tabs.map((tab) => {
        const isActive = active === tab.value;
        return (
          <Link
            key={tab.value || "all"}
            href={tab.href}
            className={`relative -mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-xs uppercase tracking-widest transition-colors ${
              isActive ? "border-copper text-foreground" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <span
                className={`inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] ${
                  isActive ? "bg-copper/15 text-copper" : "bg-surface-raised text-muted"
                }`}
              >
                {tab.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
