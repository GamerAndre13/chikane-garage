"use client";

import { useState } from "react";

type Spec = { label: string; value: string };

export function VehicleSpecifications({ primary, additional }: { primary: Spec[]; additional: Spec[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? [...primary, ...additional] : primary;
  return <>
    <div className="mt-8 grid grid-cols-2 border-l border-t border-border bg-surface">
      {visible.map((spec) => <div key={spec.label} className="min-h-[78px] border-b border-r border-border px-4 py-3.5 sm:px-5"><p className="font-display text-[9px] uppercase tracking-[0.22em] text-muted">{spec.label}</p><p className="mt-1 font-display text-base text-foreground">{spec.value}</p></div>)}
    </div>
    {additional.length > 0 && <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="mt-3 w-full border border-border px-4 py-3 text-left font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-copper transition-colors hover:border-copper hover:bg-copper/5">{expanded ? "Mostrar menos informação" : "Mostrar mais informação"}<span className="float-right">{expanded ? "−" : "+"}</span></button>}
  </>;
}
