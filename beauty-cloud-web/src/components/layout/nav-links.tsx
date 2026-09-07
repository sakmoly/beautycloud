"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { withBasePath } from "@/lib/base-path";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/book", label: "Book" },
  { href: "/book/appointments", label: "My bookings" },
  { href: "/kiosk", label: "Kiosk" },
  { href: "/staff/login", label: "Staff" },
  { href: "/app", label: "ERP Desk" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 text-sm sm:flex">
      {LINKS.map((link) => {
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
    </nav>
  );
}
