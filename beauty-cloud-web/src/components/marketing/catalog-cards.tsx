"use client";

import type { PublicCatalogCategory, PublicCatalogService } from "@/lib/frappe/types";

import { CatalogPhoto } from "@/components/ui/catalog-photo";
import { categoryEmoji } from "@/lib/category-emoji";

export function CategoryCard({
  category,
  onSelect,
}: {
  category: PublicCatalogCategory;
  onSelect: (name: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(category.name)}
      className="group overflow-hidden rounded-[var(--bc-radius-lg)] border border-[color:var(--bc-border)] bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[color:var(--bc-primary)]/30 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[color:var(--bc-accent)]/30 to-[color:var(--bc-primary)]/10">
        <CatalogPhoto
          src={category.image}
          alt={category.label}
          className="h-full w-full object-cover transition group-hover:scale-105"
          fallback={<div className="flex h-full items-center justify-center text-5xl">{categoryEmoji(category.label)}</div>}
        />
      </div>
      <div className="p-4">
        <p className="text-lg font-semibold text-[color:var(--bc-text)]">{category.label}</p>
        <p className="mt-1 text-sm text-[color:var(--bc-muted)]">
          {category.is_group
            ? `${category.child_count} subcategories`
            : `${category.service_count} services`}
        </p>
      </div>
    </button>
  );
}

export function ServiceListRow({
  service,
  selected,
  onToggle,
  categoryLabel,
}: {
  service: PublicCatalogService;
  selected: boolean;
  onToggle: (name: string) => void;
  categoryLabel?: string;
}) {
  const duration = service.default_duration;
  const durationLabel = duration
    ? duration < 60
      ? `${duration} min`
      : `${Math.floor(duration / 60)}h${duration % 60 ? ` ${duration % 60}m` : ""}`
    : null;

  const icon = categoryEmoji(categoryLabel ?? service.service_name ?? "");

  return (
    <button
      type="button"
      onClick={() => onToggle(service.name)}
      className={`bc-service-list-row ${selected ? "selected" : ""}`}
    >
      <span className="bc-service-list-accent" aria-hidden />
      <span className={`bc-service-list-icon ${service.image ? "has-photo" : ""}`} aria-hidden>
        <CatalogPhoto src={service.image} alt="" fallback={icon} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="bc-service-list-title">{service.service_name}</span>
          {durationLabel ? (
            <span className="bc-service-duration-badge">{durationLabel}</span>
          ) : null}
        </span>
        {service.service_name_ar ? (
          <span className="mt-0.5 block text-xs text-[color:var(--bc-muted)]">{service.service_name_ar}</span>
        ) : null}
        {service.description ? (
          <span className="bc-service-list-desc">{service.description}</span>
        ) : null}
      </span>
      <span className="bc-service-list-price">From SAR {service.standard_selling_price ?? 0}</span>
      <span className="bc-service-add-btn" aria-hidden>
        {selected ? "✓" : "+"}
      </span>
    </button>
  );
}

export function ServiceCard({
  service,
  selected,
  onToggle,
}: {
  service: PublicCatalogService;
  selected: boolean;
  onToggle: (name: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(service.name)}
      className={`group flex items-start gap-3 rounded-[var(--bc-radius-lg)] border p-4 text-left transition ${
        selected
          ? "border-[color:var(--bc-secondary)] bg-[color:var(--bc-accent-muted)] shadow-md ring-2 ring-[color:var(--bc-secondary)]/15"
          : "border-[color:var(--bc-border)] bg-white hover:border-[color:var(--bc-accent)] hover:shadow-sm"
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-xl ${
          selected && !service.image ? "bg-[color:var(--bc-primary)] text-white" : "bg-[color:var(--bc-beige)]"
        }`}
      >
        <CatalogPhoto
          src={service.image}
          alt=""
          fallback={categoryEmoji(service.service_name ?? "")}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="font-semibold leading-snug">{service.service_name}</span>
          {selected ? (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--bc-primary)] text-[10px] text-white">
              ✓
            </span>
          ) : null}
        </span>
        {service.description ? (
          <span className="mt-1 block text-sm leading-relaxed text-[color:var(--bc-muted)] line-clamp-2">
            {service.description}
          </span>
        ) : null}
        <span className="mt-2 flex flex-wrap gap-3 text-sm">
          <span className="font-medium text-[color:var(--bc-text)]">
            SAR {service.standard_selling_price ?? 0}
          </span>
          {service.default_duration ? (
            <span className="text-[color:var(--bc-muted)]">{service.default_duration} min</span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

export function CatalogBreadcrumb({
  items,
  onNavigate,
}: {
  items: Array<{ name: string; label: string }>;
  onNavigate: (name: string | null) => void;
}) {
  if (items.length === 0) return null;
  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--bc-muted)]">
      <button type="button" className="font-medium hover:text-[color:var(--bc-primary)]" onClick={() => onNavigate(null)}>
        All categories
      </button>
      {items.map((item, index) => (
        <span key={item.name} className="flex items-center gap-2">
          <span aria-hidden>/</span>
          {index === items.length - 1 ? (
            <span className="font-medium text-[color:var(--bc-text)]">{item.label}</span>
          ) : (
            <button
              type="button"
              className="font-medium hover:text-[color:var(--bc-primary)]"
              onClick={() => onNavigate(item.name)}
            >
              {item.label}
            </button>
          )}
        </span>
      ))}
    </nav>
  );
}
