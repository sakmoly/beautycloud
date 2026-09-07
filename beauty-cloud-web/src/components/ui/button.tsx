import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";

const variants: Record<Variant, string> = {
  primary:
    "bg-[color:var(--bc-primary)] text-white shadow-[0_4px_14px_rgb(26_26_26/0.18)] hover:-translate-y-px hover:shadow-[0_6px_20px_rgb(26_26_26/0.22)] active:scale-[0.98] disabled:opacity-50 disabled:transform-none",
  secondary:
    "border border-[color:var(--bc-border)] bg-white text-[color:var(--bc-text)] shadow-sm hover:bg-[color:var(--bc-accent-muted)] disabled:opacity-50",
  ghost:
    "text-[color:var(--bc-muted)] hover:bg-[color:var(--bc-accent-light)] hover:text-[color:var(--bc-text)] disabled:opacity-50",
  danger:
    "bg-[color:var(--bc-danger)] text-white shadow-md hover:brightness-105 disabled:opacity-50",
  accent:
    "bg-[color:var(--bc-secondary)] text-white shadow-[0_4px_14px_rgb(194_24_91/0.25)] hover:brightness-105 active:scale-[0.98] disabled:opacity-50",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold transition ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
