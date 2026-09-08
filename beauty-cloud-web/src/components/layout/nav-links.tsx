"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { withBasePath } from "@/lib/base-path";

const PUBLIC_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/branches", label: "Branches" },
  { href: "/book", label: "Book" },
  { href: "/book/appointments", label: "My bookings" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 text-sm lg:flex">
      {PUBLIC_LINKS.map((link) => {
        const href = withBasePath(link.href);
        const active =
          link.href === "/"
            ? pathname === href || pathname === link.href
            : pathname === href || pathname.startsWith(`${href}/`) || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            className={`rounded-full px-3.5 py-2 font-medium transition ${
              active
                ? "bg-[color:var(--bc-primary)] text-white shadow-sm"
                : "bg-white/70 text-[color:var(--bc-muted)] hover:bg-white hover:text-[color:var(--bc-text)]"
            }`}
            href={href}
          >
            {link.label}
          </Link>
        );
      })}
      <Link
        href={withBasePath("/staff/login")}
        className="rounded-full px-3.5 py-2 font-medium text-[color:var(--bc-muted)] hover:bg-white hover:text-[color:var(--bc-text)]"
      >
        Staff
      </Link>
    </nav>
  );
}

export function MobileNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto pb-1 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {PUBLIC_LINKS.map((link) => {
        const href = withBasePath(link.href);
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={link.href}
            href={href}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              active ? "bg-[color:var(--bc-primary)] text-white" : "bg-white/80 text-[color:var(--bc-muted)]"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
