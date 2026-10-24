import Link from "next/link";

type Filter = {
  label: string;
  value: string;
  href: string;
  count?: number;
};

export function FilterBar({ filters, active }: { filters: Filter[]; active: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {filters.map((filter) => {
        const isActive = active === filter.value;
        return (
          <Link
            key={filter.value || "all"}
            href={filter.href}
            className={`flex items-center gap-2 px-2.5 py-1.5 text-xs transition-colors ${
              isActive ? "bg-copper/15 text-copper" : "text-muted hover:text-foreground"
            }`}
          >
            <span>{filter.label}</span>
            {typeof filter.count === "number" && <span className="text-[10px] opacity-80">{filter.count}</span>}
          </Link>
        );
      })}
    </div>
  );
}
