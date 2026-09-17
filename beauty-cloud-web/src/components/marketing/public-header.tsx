"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { CustomerSessionBar } from "@/components/booking/customer-session-bar";
import { withBasePath } from "@/lib/base-path";
import { DEFAULT_BRAND_LOGO } from "@/lib/theme/brand-palette";
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

function normalizePath(path: string) {
  const trimmed = path.replace(/\/$/, "");
  return trimmed || "/";
}

function isNavActive(pathname: string, url: string) {
  const href = resolveNavHref(url);
  const current = normalizePath(pathname);
  const target = normalizePath(href);
  const homePath = normalizePath(withBasePath("/"));

  if (url === "/" || target === homePath || target === "/") {
    return current === homePath || current === "/";
  }

  return current === target || current.startsWith(`${target}/`);
}

function NavLink({ item, pathname }: { item: WebNavItem; pathname: string }) {
  const href = resolveNavHref(item.url);
  const active = !item.highlight && isNavActive(pathname, item.url);
  const className = item.highlight
    ? "bc-btn-outline bc-header-cta"
    : active
      ? "bc-nav-link is-active"
      : "bc-nav-link";
  const external = href.startsWith("http");

  if (external || item.open_in_new_tab) {
    return (
      <a href={href} className={className} target="_blank" rel="noreferrer">
        {item.label}
      </a>
    );
  }
  return (
    <Link href={href} className={className} aria-current={active ? "page" : undefined}>
      {item.label}
    </Link>
  );
}

function NavDropdown({ item, pathname }: { item: WebNavItem; pathname: string }) {
  const [open, setOpen] = useState(false);
  const href = resolveNavHref(item.url);
  const children = item.children ?? [];
  const active =
    isNavActive(pathname, item.url) ||
    children.some((child) => isNavActive(pathname, child.url));

  if (!children.length) {
    return <NavLink item={item} pathname={pathname} />;
  }

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <Link
        href={href}
        className={`bc-nav-link inline-flex items-center gap-1 ${active ? "is-active" : ""}`}
        aria-current={active ? "page" : undefined}
      >
        {item.label}
        <span className="text-[10px]" aria-hidden>
          ▾
        </span>
      </Link>
      {open ? (
        <div className="absolute left-0 top-full z-50 min-w-[200px] pt-2">
          <div className="rounded-md border border-[color:var(--bc-border)] bg-white py-2 shadow-lg">
            {children.map((child) => {
              const childHref = resolveNavHref(child.url);
              const childActive = isNavActive(pathname, child.url);
              const external = childHref.startsWith("http");
              const childClass = `block px-4 py-2 text-sm transition hover:bg-[color:var(--bc-accent-muted)] ${
                childActive ? "font-semibold text-[color:var(--bc-secondary)]" : ""
              }`;

              return external || child.open_in_new_tab ? (
                <a
                  key={`${child.label}-${child.url}`}
                  href={childHref}
                  className={childClass}
                  target="_blank"
                  rel="noreferrer"
                >
                  {child.label}
                </a>
              ) : (
                <Link key={`${child.label}-${child.url}`} href={childHref} className={childClass}>
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

function DesktopNav({ items, pathname }: { items: WebNavItem[]; pathname: string }) {
  const regular = items.filter((item) => !item.highlight);
  const highlights = items.filter((item) => item.highlight);

  return (
    <div className="hidden min-w-0 flex-1 items-center justify-between gap-6 lg:flex">
      <nav className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 xl:gap-x-6" aria-label="Main">
        {regular.map((item) =>
          item.children?.length ? (
            <NavDropdown key={`${item.label}-${item.url}`} item={item} pathname={pathname} />
          ) : (
            <NavLink key={`${item.label}-${item.url}`} item={item} pathname={pathname} />
          ),
        )}
      </nav>
      {highlights.length ? (
        <div className="flex shrink-0 items-center gap-3">
          {highlights.map((item) => (
            <NavLink key={`${item.label}-${item.url}`} item={item} pathname={pathname} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StaffLoginLink({ pathname, className = "" }: { pathname: string; className?: string }) {
  const href = withBasePath("/staff/login");
  const current = normalizePath(pathname);
  const target = normalizePath(href);
  const active = current === target || current.startsWith(`${normalizePath(withBasePath("/staff"))}/`);

  return (
    <Link
      href={href}
      className={`bc-header-staff-link ${active ? "is-active" : ""} ${className}`.trim()}
      aria-current={active ? "page" : undefined}
    >
      Staff login
    </Link>
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="bc-header-menu-btn"
        aria-expanded={open}
        aria-controls="bc-mobile-nav"
      >
        Menu {open ? "▴" : "▾"}
      </button>
      {open ? (
        <div
          id="bc-mobile-nav"
          className="absolute right-0 top-full z-50 mt-2 min-w-[min(100vw-2rem,18rem)] rounded-lg border border-[color:var(--bc-border)] bg-white px-4 py-4 shadow-lg"
        >
          <div className="flex flex-col gap-1">
            {flat.map((item) => (
              <NavLink key={`mobile-${item.label}-${item.url}`} item={item} pathname={pathname} />
            ))}
            <Link
              href={withBasePath("/book/appointments")}
              className="bc-nav-link mt-2 border-t border-[color:var(--bc-border)] pt-3 text-[color:var(--bc-muted)]"
            >
              My bookings
            </Link>
            <StaffLoginLink pathname={pathname} className="mt-1" />
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
  const logo = branding?.logo_light ?? branding?.logo_dark ?? withBasePath(DEFAULT_BRAND_LOGO);
  const showPromo = branding?.promo_bar_enabled && branding?.promo_bar_text;
  const navigation = bootstrap.navigation ?? [];

  return (
    <>
      {showPromo ? <PromoBar text={branding.promo_bar_text!} /> : null}
      <header className="bc-site-header">
        <div className="bc-site-header-inner mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3 sm:gap-6 sm:px-6">
          <Link href={withBasePath("/")} className="group flex shrink-0 items-center" aria-label={`${salon} home`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logo}
              alt={salon}
              className="h-9 w-auto max-w-[200px] object-contain sm:h-10 sm:max-w-[220px]"
            />
          </Link>

          <DesktopNav items={navigation} pathname={pathname} />

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-3 sm:flex">
              <CustomerSessionBar />
              <StaffLoginLink pathname={pathname} />
            </div>
            <MobileNav items={navigation} pathname={pathname} />
          </div>
        </div>
      </header>
    </>
  );
}
