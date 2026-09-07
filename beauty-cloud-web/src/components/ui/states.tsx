"use client";

import type { ReactNode } from "react";

export function LoadingState({
  title = "Loading",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] p-8 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--bc-primary)] border-t-transparent" />
      <div>
        <p className="font-medium text-[color:var(--bc-text)]">{title}</p>
        {description ? (
          <p className="mt-1 text-sm text-[color:var(--bc-muted)]">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] p-8 text-center">
      <p className="text-lg font-medium text-[color:var(--bc-text)]">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-[color:var(--bc-muted)]">{description}</p>
      ) : null}
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-[color:var(--bc-danger)]/30 bg-[color:var(--bc-danger)]/5 p-8 text-center">
      <p className="text-lg font-medium text-[color:var(--bc-text)]">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-[color:var(--bc-muted)]">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
