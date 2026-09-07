"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { InstallAppButton } from "@/components/layout/install-app-prompt";
import { withBasePath } from "@/lib/base-path";

const NAV = [
  { href: "/staff/reception", label: "Reception", icon: "🏠" },
  { href: "/staff/reception/calendar", label: "Calendar", icon: "📅" },
  { href: "/staff/reception/queue", label: "Queue", icon: "👥" },
  { href: "/staff/beautician", label: "Beautician", icon: "✨" },
  { href: "/staff/inventory", label: "Inventory", icon: "📦" },
  { href: "/staff/pos", label: "POS", icon: "💳" },
  { href: "/staff/commission", label: "Commission", icon: "💰" },
  { href: "/staff/loyalty", label: "Loyalty", icon: "🎁" },
  { href: "/staff/reports", label: "Reports", icon: "📊" },
  { href: "/staff/admin", label: "Admin", icon: "⚙️" },
];

const COMPACT_NAV = [
  { href: "/staff/pos", label: "POS", icon: "💳" },
  { href: "/staff/reception/queue", label: "Queue", icon: "👥" },
];

export function StaffNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const items = compact ? COMPACT_NAV : NAV;

  return (
    <nav className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={withBasePath(item.href)}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition ${
              active
                ? "bg-[color:var(--bc-primary)] text-white shadow-md"
                : "bg-white/80 text-[color:var(--bc-muted)] hover:bg-[color:var(--bc-accent-light)] hover:text-[color:var(--bc-text)]"
            }`}
          >
            <span aria-hidden className="text-base">
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
      <InstallAppButton />
    </nav>
  );
}
