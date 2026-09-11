"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { InstallAppButton } from "@/components/layout/install-app-prompt";
import type { StaffWorkflowCapabilities } from "@/lib/frappe/types";
import { withBasePath } from "@/lib/base-path";
import { staffNavItems } from "@/lib/staff-nav";

export function StaffNav({
  compact = false,
  workflow,
}: {
  compact?: boolean;
  workflow?: StaffWorkflowCapabilities;
}) {
  const pathname = usePathname();
  const items = staffNavItems(workflow, compact);

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
