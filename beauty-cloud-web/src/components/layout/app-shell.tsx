import Link from "next/link";
import type { ReactNode } from "react";

import { NavLinks } from "@/components/layout/nav-links";
import { CustomerSessionBar } from "@/components/booking/customer-session-bar";
import type { PublicBootstrap } from "@/lib/frappe/types";

export function AppShell({
  bootstrap,
  children,
}: {
  bootstrap: PublicBootstrap;
  children: ReactNode;
}) {
  const title = bootstrap.application_title ?? "Beauty Cloud";
  const subtitle =
    bootstrap.company_display_name ?? bootstrap.company ?? "Salon Platform";

  return (
    <div className="flex min-h-full flex-col text-[color:var(--bc-text)]">
      <header className="bc-hero mx-auto w-full rounded-none border-x-0 border-t-0 sm:rounded-b-[var(--bc-radius-lg)] sm:border-x sm:border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="group flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-xl shadow-sm">
              ✦
            </span>
            <div>
              <p className="text-xs font-medium text-[color:var(--bc-muted)]">Welcome to</p>
              <h1 className="text-lg font-bold leading-tight group-hover:text-[color:var(--bc-secondary)]">
                {subtitle}
              </h1>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--bc-secondary)]">
                {title}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <CustomerSessionBar />
            <NavLinks />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
      <footer className="mt-auto border-t border-[color:var(--bc-border)]/80 bg-white/70 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-5 text-sm text-[color:var(--bc-muted)] sm:px-6">
          <p>
            {bootstrap.branding?.custom_footer_text ??
              `${title} · Powered by ERPNext`}
          </p>
          {bootstrap.branding?.support_email ? (
            <p>{bootstrap.branding.support_email}</p>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
