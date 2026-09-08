"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CategoryServicePicker } from "@/components/marketing/category-service-picker";
import type { PublicCatalogService } from "@/lib/frappe/types";
import { withBasePath } from "@/lib/base-path";

export function ServicesBrowser({ initialCategory }: { initialCategory?: string | null }) {
  const [selected, setSelected] = useState<PublicCatalogService[]>([]);

  const selectedIds = useMemo(() => selected.map((s) => s.name), [selected]);

  function toggleService(name: string, service?: PublicCatalogService) {
    setSelected((prev) => {
      if (prev.some((s) => s.name === name)) {
        return prev.filter((s) => s.name !== name);
      }
      if (service) return [...prev, service];
      return prev;
    });
  }

  const bookHref =
    selectedIds.length > 0
      ? withBasePath(`/book?services=${encodeURIComponent(selectedIds.join(","))}`)
      : withBasePath("/book");

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <CategoryServicePicker
        variant="cards"
        initialCategory={initialCategory}
        selectedServices={selectedIds}
        onToggleService={toggleService}
      />
      <aside className="sticky top-4 rounded-[var(--bc-radius-lg)] border border-[color:var(--bc-border)] bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-[color:var(--bc-muted)]">Selection</p>
        <p className="mt-2 text-2xl font-bold">{selected.length}</p>
        <p className="text-sm text-[color:var(--bc-muted)]">services selected</p>
        {selected.length ? (
          <ul className="mt-4 space-y-2 text-sm">
            {selected.map((service) => (
              <li key={service.name} className="flex justify-between gap-2">
                <span>{service.service_name}</span>
                <span className="shrink-0 text-[color:var(--bc-muted)]">SAR {service.standard_selling_price ?? 0}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <Link href={bookHref} className="bc-btn-dark mt-5 w-full">
          Continue to booking
        </Link>
      </aside>
    </div>
  );
}
