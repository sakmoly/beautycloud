import type { ReactNode } from "react";

import { PublicHeader } from "@/components/marketing/public-header";
import { SiteFooter } from "@/components/layout/site-footer";
import type { PublicBootstrap, WebNavItem } from "@/lib/frappe/types";

function flattenFooterLinks(items: WebNavItem[]): WebNavItem[] {
  const flat: WebNavItem[] = [];
  for (const item of items) {
    flat.push(item);
    for (const child of item.children ?? []) {
      flat.push(child);
    }
  }
  return flat;
}

export function AppShell({
  bootstrap,
  children,
  fullWidth = false,
}: {
  bootstrap: PublicBootstrap;
  children: ReactNode;
  fullWidth?: boolean;
}) {
  const branding = bootstrap.branding;
  const companyName = bootstrap.company_display_name ?? bootstrap.company ?? "Bahyea Beauty";
  const footerNav = bootstrap.footer_navigation?.length
    ? flattenFooterLinks(bootstrap.footer_navigation)
    : flattenFooterLinks((branding?.footer_menu_items ?? []).map((item) => ({ ...item, children: [] })));

  return (
    <div className="flex min-h-full flex-col text-[color:var(--bc-text)]">
      <PublicHeader bootstrap={bootstrap} />

      <main
        className={
          fullWidth
            ? "flex-1"
            : "mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-10 sm:px-6 sm:py-12"
        }
      >
        {children}
      </main>

      <SiteFooter branding={branding} companyName={companyName} footerNav={footerNav} />
    </div>
  );
}
