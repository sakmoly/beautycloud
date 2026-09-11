import { formatUserMessage } from "@/lib/format-user-message";

export function UserMessage({
  message,
  tone = "danger",
  className = "",
}: {
  message: string;
  tone?: "danger" | "warning" | "muted";
  className?: string;
}) {
  const text = formatUserMessage(message);
  const toneClass =
    tone === "warning"
      ? "border-[color:var(--bc-warning)]/40 bg-[color:var(--bc-warning)]/10 text-[color:var(--bc-warning)]"
      : tone === "muted"
        ? "border-[color:var(--bc-border)] bg-[color:var(--bc-accent-muted)] text-[color:var(--bc-muted)]"
        : "border-[color:var(--bc-danger)]/30 bg-[color:var(--bc-danger)]/5 text-[color:var(--bc-danger)]";

  return (
    <p className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${toneClass} ${className}`}>
      {text}
    </p>
  );
}
