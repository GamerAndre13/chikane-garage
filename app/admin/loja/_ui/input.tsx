import { forwardRef } from "react";

const base = "mt-2 block w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted/70 focus:border-copper focus:outline-none focus:ring-0";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className = "", ...props }, ref) => (
  <input ref={ref} className={`${base} ${className}`} {...props} />
));
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className = "", ...props }, ref) => (
  <select ref={ref} className={`${base} ${className}`} {...props} />
));
Select.displayName = "Select";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className = "", ...props }, ref) => (
  <textarea ref={ref} className={`${base} ${className}`} {...props} />
));
Textarea.displayName = "Textarea";

export function FieldLabel({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-xs uppercase tracking-widest text-muted ${className}`}>
      {label}
      {children}
    </label>
  );
}
