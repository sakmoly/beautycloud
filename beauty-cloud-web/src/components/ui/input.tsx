import type { InputHTMLAttributes } from "react";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`min-h-12 w-full rounded-full border border-[color:var(--bc-border)] bg-white px-4 text-sm shadow-sm outline-none transition placeholder:text-[color:var(--bc-muted)]/70 focus:border-[color:var(--bc-secondary)] focus:ring-4 focus:ring-[color:var(--bc-accent)]/30 ${className}`}
      {...props}
    />
  );
}

export function Label({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[color:var(--bc-muted)]"
    >
      {children}
    </label>
  );
}

export function Textarea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`min-h-24 w-full rounded-[var(--bc-radius-lg)] border border-[color:var(--bc-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[color:var(--bc-secondary)] focus:ring-4 focus:ring-[color:var(--bc-accent)]/30 ${className}`}
      {...props}
    />
  );
}
