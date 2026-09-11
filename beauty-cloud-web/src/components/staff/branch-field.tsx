"use client";

import { Label } from "@/components/ui/input";
import type { StaffBranchRow } from "@/lib/use-staff-branch";

export function BranchField({
  branch,
  branches,
  branchLocked,
  branchLabel,
  onChange,
  id = "branch",
  className,
}: {
  branch: string;
  branches: StaffBranchRow[];
  branchLocked: boolean;
  branchLabel: string;
  onChange: (branch: string) => void;
  id?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id}>Branch</Label>
      {branchLocked ? (
        <p
          id={id}
          className="mt-1.5 min-h-11 rounded-xl border border-[color:var(--bc-border)] bg-[color:var(--bc-accent-muted)]/50 px-3 py-2.5 text-sm font-semibold"
        >
          {branchLabel || branch || "—"}
        </p>
      ) : (
        <select
          id={id}
          className="mt-1.5 min-h-11 w-full rounded-xl border border-[color:var(--bc-border)] bg-white px-3 shadow-sm"
          value={branch}
          onChange={(e) => onChange(e.target.value)}
        >
          {branches.map((row) => (
            <option key={row.name} value={row.name}>
              {row.branch_name ?? row.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
