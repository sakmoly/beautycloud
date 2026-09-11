import Link from "next/link";
import type { ReactNode } from "react";

import { StaffLogoutButton } from "@/components/layout/staff-logout-button";
import { StaffNav } from "@/components/layout/staff-nav";
import type { PublicBootstrap } from "@/lib/frappe/types";
import type { StaffSession } from "@/lib/frappe/types";

export function StaffShell({
  bootstrap,
  session,
  children,
  wide = false,
  compact = false,
}: {
  bootstrap: PublicBootstrap;
  session: StaffSession;
  children: ReactNode;
  wide?: boolean;
  compact?: boolean;
}) {
  const maxW = wide ? "max-w-[100rem]" : "max-w-7xl";
  const pad = compact ? "px-3 py-2 sm:px-4" : "px-4 py-4 sm:px-6";

  return (
    <div className="flex min-h-full flex-col text-[color:var(--bc-text)]">
      <header className="bc-hero mx-auto mb-0 w-full rounded-none border-x-0 border-t-0 sm:mx-4 sm:mt-3 sm:rounded-[var(--bc-radius-lg)] sm:border">
        <div className={`mx-auto flex w-full flex-wrap items-center justify-between gap-3 ${maxW} ${pad}`}>
          <div>
            <p className="text-xs font-medium text-[color:var(--bc-muted)]">Hello,</p>
            <p className="text-lg font-bold tracking-tight">
              {session.full_name ?? session.user}
            </p>
            <p className="text-xs text-[color:var(--bc-muted)]">Staff workspace</p>
          </div>
          <StaffLogoutButton />
        </div>
        <div className={`mx-auto w-full ${maxW} ${compact ? "px-3 pb-2 sm:px-4" : "px-4 pb-3 sm:px-6"}`}>
          <StaffNav compact={compact} workflow={bootstrap.staff_workflow} />
        </div>
      </header>

      <div className="mx-auto mb-2 flex w-full justify-end px-4 sm:px-6">
        <Link
          href="/"
          className="text-xs font-medium text-[color:var(--bc-muted)] hover:text-[color:var(--bc-secondary)]"
        >
          {bootstrap.application_title} →
        </Link>
      </div>

      <main className={`mx-auto w-full flex-1 ${maxW} ${pad}`}>{children}</main>
    </div>
  );
}
