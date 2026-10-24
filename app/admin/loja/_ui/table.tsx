import { forwardRef } from "react";

export function Table({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full min-w-[760px] text-left text-sm">{children}</table>
    </div>
  );
}

export const THead = forwardRef<HTMLTableSectionElement, { children: React.ReactNode; className?: string }>(({ children, className = "" }, ref) => (
  <thead ref={ref} className={`border-b border-border ${className}`}>
    {children}
  </thead>
));
THead.displayName = "THead";

export const TBody = forwardRef<HTMLTableSectionElement, { children: React.ReactNode; className?: string }>(({ children, className = "" }, ref) => (
  <tbody ref={ref} className={`divide-y divide-border ${className}`}>
    {children}
  </tbody>
));
TBody.displayName = "TBody";

export const TH = forwardRef<HTMLTableCellElement, { children: React.ReactNode; className?: string; align?: "left" | "right" | "center" }>(
  ({ children, className = "", align = "left" }, ref) => (
    <th
      ref={ref}
      className={`py-2.5 pr-4 first:pl-0 font-display text-[10px] uppercase tracking-widest text-muted ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"} ${className}`}
    >
      {children}
    </th>
  ),
);
TH.displayName = "TH";

export const TD = forwardRef<HTMLTableCellElement, { children: React.ReactNode; className?: string; align?: "left" | "right" | "center" }>(
  ({ children, className = "", align = "left" }, ref) => (
    <td
      ref={ref}
      className={`py-3 pr-4 first:pl-0 align-middle ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"} ${className}`}
    >
      {children}
    </td>
  ),
);
TD.displayName = "TD";
