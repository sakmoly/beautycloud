import type { ReactNode } from "react";

export function Card({
  title,
  description,
  children,
  action,
  className = "",
  elevated = false,
  hero = false,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  elevated?: boolean;
  hero?: boolean;
}) {
  const shellClass = hero
    ? "bc-hero"
    : `bc-card p-6 sm:p-7 ${elevated ? "bc-card-elevated" : ""}`;

  return (
    <section className={`${shellClass} ${className}`}>
      {(title || action) && (
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            {title ? (
              <h2 className="bc-section-title text-xl">{title}</h2>
            ) : null}
            {description ? (
              <p className="bc-section-sub mt-1">{description}</p>
            ) : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
