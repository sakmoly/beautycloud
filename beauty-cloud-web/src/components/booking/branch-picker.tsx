"use client";

import type { BeautyBranch } from "@/lib/api/types";

export function BranchPicker({
  branches,
  value,
  onChange,
  variant = "default",
}: {
  branches: BeautyBranch[];
  value: string;
  onChange: (branchId: string) => void;
  variant?: "default" | "kiosk";
}) {
  if (!branches.length) {
    return (
      <p className={variant === "kiosk" ? "bc-kiosk-schedule-empty-sub" : "text-sm text-[color:var(--bc-muted)]"}>
        No branches are available for online booking right now.
      </p>
    );
  }

  const isOnline = variant === "default";

  return (
    <div>
      <p className={isOnline ? "bc-schedule-section-title" : "bc-kiosk-sidebar-label"}>
        {variant === "kiosk" ? "Location" : "Salon location"}
      </p>
      <div
        className={
          variant === "kiosk"
            ? "bc-kiosk-mode-grid mt-3"
            : "bc-branch-grid mt-2.5"
        }
        role="group"
        aria-label="Select a branch"
      >
        {branches.map((branch) => {
          const selected = value === branch.name;
          if (isOnline) {
            return (
              <button
                key={branch.name}
                type="button"
                onClick={() => onChange(branch.name)}
                aria-pressed={selected}
                className={`bc-branch-card ${selected ? "active" : ""}`}
              >
                <span className="bc-branch-card-icon" aria-hidden>
                  📍
                </span>
                <span className="bc-branch-card-body">
                  <span className="bc-branch-card-name">
                    {selected ? (
                      <span className="bc-branch-card-check" aria-hidden>
                        ✓
                      </span>
                    ) : null}
                    {branch.branch_name}
                  </span>
                  <span className="bc-branch-card-meta">
                    {branch.address || "Book appointments at this location"}
                  </span>
                  {branch.phone ? (
                    <span className="bc-branch-card-meta">{branch.phone}</span>
                  ) : null}
                </span>
              </button>
            );
          }

          return (
            <button
              key={branch.name}
              type="button"
              onClick={() => onChange(branch.name)}
              aria-pressed={selected}
              className={`bc-kiosk-mode-card ${selected ? "active" : ""}`}
            >
              <span className="bc-kiosk-stylist-name">
                {selected ? "✓ " : ""}
                {branch.branch_name}
              </span>
              {branch.address ? (
                <span className="bc-kiosk-stylist-meta">{branch.address}</span>
              ) : null}
              {branch.phone ? (
                <span className="bc-kiosk-stylist-meta">{branch.phone}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      {!value ? (
        <p
          className={
            variant === "kiosk"
              ? "bc-kiosk-schedule-empty-sub mt-3"
              : "bc-schedule-hint mt-3 !border-[color:var(--bc-border)] !bg-[color:var(--bc-accent-muted)] !text-[color:var(--bc-muted)]"
          }
        >
          Tap a location to see available times.
        </p>
      ) : null}
    </div>
  );
}
