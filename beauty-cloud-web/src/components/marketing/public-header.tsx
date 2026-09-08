"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { CustomerSessionBar } from "@/components/booking/customer-session-bar";
import { withBasePath } from "@/lib/base-path";
import type { PublicBootstrap, WebNavItem } from "@/lib/frappe/types";

export function PromoBar({ text }: { text: string }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div className="bc-promo-bar relative">
      <p>{text}</p>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none opacity-80 hover:opacity-100"
        aria-label="Dismiss announcement"
      >
        ×
      </button>
    </div>
  );
}

function resolveNavHref(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return withBasePath(url.startsWith("/") ? url : `/${url}`);
}

function NavLink({ item }: { item: WebNavItem }) {
  const href = resolveNavHref(item.url);
  const className = item.highlight ? "bc-btn-outline text-xs" : "bc-nav-link";
  const external = href.startsWith("http");

  if (external || item.open_in_new_tab) {
    return (
      <a href={href} className={className} target="_blank" rel="noreferrer">
        {item.label}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {item.label}
    </Link>
  );
}

function NavDropdown({ item }: { item: WebNavItem }) {
  const [open, setOpen] = useState(false);
  const href = resolveNavHref(item.url);
  const children = item.children ?? [];

  if (!children.length) {
    return <NavLink item={item} />;
  }

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <Link href={href} className="bc-nav-link inline-flex items-center gap-1">
        {item.label}
        <span className="text-[10px]" aria-hidden>
          ▾
        </span>
      </Link>
      {open ? (
        <div className="absolute left-0 top-full z-50 min-w-[200px] pt-2">
          <div className="border border-[color:var(--bc-border)] bg-white py-2 shadow-lg">
            {children.map((child) => {
              const childHref = resolveNavHref(child.url);
              const external = childHref.startsWith("http");
              return external || child.open_in_new_tab ? (
                <a
                  key={`${child.label}-${child.url}`}
                  href={childHref}
                  className="block px-4 py-2 text-sm hover:bg-[color:var(--bc-accent-muted)]"
                  target="_blank"
                  rel="noreferrer"
                >
                  {child.label}
                </a>
              ) : (
                <Link
                  key={`${child.label}-${child.url}`}
                  href={childHref}
                  className="block px-4 py-2 text-sm hover:bg-[color:var(--bc-accent-muted)]"
                >
                  {child.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DesktopNav({ items }: { items: WebNavItem[] }) {
  const regular = items.filter((item) => !item.highlight);
  const highlights = items.filter((item) => item.highlight);

  return (
    <>
      <nav className="hidden items-center gap-6 lg:flex">
        {regular.map((item) =>
          item.children?.length ? (
            <NavDropdown key={`${item.label}-${item.url}`} item={item} />
          ) : (
            <NavLink key={`${item.label}-${item.url}`} item={item} />
          ),
        )}
      </nav>
      <div className="hidden items-center gap-3 sm:flex">
        {highlights.map((item) => (
          <NavLink key={`${item.label}-${item.url}`} item={item} />
        ))}
      </div>
    </>
  );
}

function flattenNav(items: WebNavItem[]): WebNavItem[] {
  const flat: WebNavItem[] = [];
  for (const item of items) {
    flat.push(item);
    for (const child of item.children ?? []) {
      flat.push(child);
    }
  }
  return flat;
}

function MobileNav({ items, pathname }: { items: WebNavItem[]; pathname: string }) {
  const [open, setOpen] = useState(false);
  const flat = flattenNav(items);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="relative lg:hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} className="bc-nav-link px-2 py-1" aria-expanded={open}>
        Menu {open ? "▴" : "▾"}
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 border-b border-[color:var(--bc-border)] bg-white px-4 py-4 shadow-lg">
          <div className="flex flex-col gap-3">
            {flat.map((item) => (
              <NavLink key={`mobile-${item.label}-${item.url}`} item={item} />
            ))}
            <Link href={withBasePath("/book/appointments")} className="text-sm text-[color:var(--bc-muted)]">
              My bookings
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PublicHeader({ bootstrap }: { bootstrap: PublicBootstrap }) {
  const pathname = usePathname();
  const branding = bootstrap.branding;
  const salon = bootstrap.company_display_name ?? bootstrap.company ?? "Salon";
  const logo = branding?.logo_light ?? branding?.logo_dark;
  const showPromo = branding?.promo_bar_enabled && branding?.promo_bar_text;
  const navigation = bootstrap.navigation ?? [];

  return (
    <>
      {showPromo ? <PromoBar text={branding.promo_bar_text!} /> : null}
      <header className="bc-site-header">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href={withBasePath("/")} className="group flex min-w-0 items-center">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={salon} className="h-10 w-auto max-w-[180px] object-contain" />
            ) : (
              <span className="font-display text-3xl tracking-[0.08em] text-[color:var(--bc-gold)]">
                {salon.split(" ")[0]?.toUpperCase() ?? "SALON"}
              </span>
            )}
          </Link>
          <div className="flex items-center gap-4">
            <CustomerSessionBar />
          </div>
        </div>
        <div className="border-t border-[color:var(--bc-border)]">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <DesktopNav items={navigation} />
            <MobileNav items={navigation} pathname={pathname} />
          </div>
        </div>
      </header>
    </>
  );
}
