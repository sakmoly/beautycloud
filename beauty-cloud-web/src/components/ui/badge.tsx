type Tone = "default" | "success" | "warning" | "danger" | "muted" | "accent";

const tones: Record<Tone, string> = {
  default: "bg-[color:var(--bc-accent-light)] text-[color:var(--bc-secondary)]",
  accent: "bg-[color:var(--bc-secondary)]/10 text-[color:var(--bc-secondary)]",
  success: "bg-[color:var(--bc-success)]/10 text-[color:var(--bc-success)]",
  warning: "bg-[color:var(--bc-warning)]/10 text-[color:var(--bc-warning)]",
  danger: "bg-[color:var(--bc-danger)]/10 text-[color:var(--bc-danger)]",
  muted: "bg-[color:var(--bc-beige)] text-[color:var(--bc-muted)]",
};

export function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
