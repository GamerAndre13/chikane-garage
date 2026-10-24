import Link from "next/link";
import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-copper px-4 py-2 font-display text-[11px] uppercase tracking-widest text-black transition-colors hover:bg-copper-light disabled:opacity-50",
  secondary: "border border-border px-4 py-2 font-display text-[11px] uppercase tracking-widest text-foreground transition-colors hover:border-copper hover:text-copper disabled:opacity-50",
  ghost: "px-3 py-2 text-xs uppercase tracking-widest text-muted transition-colors hover:text-foreground disabled:opacity-50",
  danger: "border border-red/40 px-4 py-2 font-display text-[11px] uppercase tracking-widest text-red-light transition-colors hover:bg-red/10 disabled:opacity-50",
};

export const Button = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }>(
  ({ variant = "primary", className = "", ...props }, ref) => (
    <button ref={ref} className={`${variants[variant]} ${className}`} {...props} />
  ),
);
Button.displayName = "Button";

export function ButtonLink({ href, variant = "primary", className = "", children }: { href: string; variant?: Variant; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={`${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}
