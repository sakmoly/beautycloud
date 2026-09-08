"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CatalogBreadcrumb,
  CategoryCard,
  ServiceCard,
} from "@/components/marketing/catalog-cards";
import { CategoryNav } from "@/components/marketing/category-nav";
import { getServiceCatalog, getServices } from "@/lib/api/browser-client";
import type {
  PublicCatalogCategory,
  PublicCatalogService,
  PublicServiceCatalog,
} from "@/lib/frappe/types";
import { LoadingState } from "@/components/ui/states";

import { ServiceListRow } from "./catalog-cards";

export function CategoryServicePicker({
  selectedServices,
  onToggleService,
  initialCategory,
  variant = "wizard",
}: {
  selectedServices: string[];
  onToggleService: (serviceName: string, service?: PublicCatalogService) => void;
  initialCategory?: string | null;
  variant?: "wizard" | "cards";
}) {
  if (variant === "cards") {
    return (
      <CardGridPicker
        selectedServices={selectedServices}
        onToggleService={onToggleService}
        initialCategory={initialCategory}
      />
    );
  }

  return (
    <WizardListPicker
      selectedServices={selectedServices}
      onToggleService={onToggleService}
      initialCategory={initialCategory}
    />
  );
}

function WizardListPicker({
  selectedServices,
  onToggleService,
  initialCategory,
}: {
  selectedServices: string[];
  onToggleService: (serviceName: string, service?: PublicCatalogService) => void;
  initialCategory?: string | null;
}) {
  const [rootCategories, setRootCategories] = useState<PublicCatalogCategory[]>([]);
  const [activeRoot, setActiveRoot] = useState<string>(initialCategory ?? "featured");
  const [childCategories, setChildCategories] = useState<PublicCatalogCategory[]>([]);
  const [activeChild, setActiveChild] = useState<string | null>(null);
  const [services, setServices] = useState<PublicCatalogService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoot = useCallback(async () => {
    const result = await getServiceCatalog();
    setRootCategories(result.categories);
  }, []);

  const loadFeatured = useCallback(async () => {
    setLoading(true);
    setError(null);
    setChildCategories([]);
    setActiveChild(null);
    try {
      const all = await getServices();
      setServices(all as PublicCatalogService[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load services");
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategoryBranch = useCallback(async (categoryName: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getServiceCatalog(categoryName);

      if (result.services.length) {
        setChildCategories([]);
        setActiveChild(categoryName);
        setServices(result.services);
        return;
      }

      if (result.categories.length) {
        setChildCategories(result.categories);
        const first = result.categories.find((c) => !c.is_group) ?? result.categories[0];
        if (first) {
          setActiveChild(first.name);
          const leaf = first.is_group
            ? await getServiceCatalog(first.name)
            : await getServiceCatalog(first.name);
          setServices(leaf.services);
        } else {
          setServices([]);
        }
        return;
      }

      setChildCategories([]);
      setActiveChild(null);
      setServices([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load services");
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChildServices = useCallback(async (childName: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getServiceCatalog(childName);
      if (result.services.length) {
        setServices(result.services);
        return;
      }
      if (result.categories.length) {
        const first = result.categories.find((c) => !c.is_group) ?? result.categories[0];
        if (first) {
          const leaf = await getServiceCatalog(first.name);
          setServices(leaf.services);
        } else {
          setServices([]);
        }
        return;
      }
      setServices([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load services");
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRoot();
  }, [loadRoot]);

  useEffect(() => {
    if (activeRoot === "featured") {
      void loadFeatured();
      return;
    }
    void loadCategoryBranch(activeRoot);
  }, [activeRoot, loadCategoryBranch, loadFeatured]);

  function selectChild(name: string) {
    setActiveChild(name);
    void loadChildServices(name);
  }

  const activeRootCategory = rootCategories.find((c) => c.name === activeRoot);
  const activeChildCategory =
    childCategories.find((c) => c.name === activeChild) ??
    (activeChild && !childCategories.length ? activeRootCategory : undefined);

  const breadcrumb = useMemo(() => {
    if (activeRoot === "featured") return [{ label: "Featured", key: "featured" }];
    const parts: Array<{ label: string; key: string }> = [];
    if (activeRootCategory) parts.push({ label: activeRootCategory.label, key: activeRootCategory.name });
    if (activeChildCategory && activeChildCategory.name !== activeRootCategory?.name) {
      parts.push({ label: activeChildCategory.label, key: activeChildCategory.name });
    }
    return parts;
  }, [activeRoot, activeRootCategory, activeChildCategory]);

  function selectRoot(name: string) {
    setActiveRoot(name);
    setActiveChild(null);
    setChildCategories([]);
  }

  return (
    <div className="bc-service-picker">
      <CategoryNav
        rootCategories={rootCategories}
        activeRoot={activeRoot}
        childCategories={childCategories}
        activeChild={activeChild}
        onSelectRoot={selectRoot}
        onSelectChild={selectChild}
      />

      <div className="bc-service-panel">
        <div className="bc-service-panel-header">
          <nav className="bc-service-breadcrumb" aria-label="Category path">
            {breadcrumb.map((crumb, index) => (
              <span key={crumb.key} className="flex items-center gap-2">
                {index > 0 ? <span className="text-[color:var(--bc-muted)]" aria-hidden>/</span> : null}
                <span
                  className={
                    index === breadcrumb.length - 1
                      ? "font-semibold text-[color:var(--bc-primary)]"
                      : "text-[color:var(--bc-muted)]"
                  }
                >
                  {crumb.label}
                </span>
              </span>
            ))}
          </nav>
          <p className="bc-service-panel-count">
            {loading ? "Loading…" : `${services.length} service${services.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {error ? <p className="px-4 pt-3 text-sm text-[color:var(--bc-danger)]">{error}</p> : null}

        {loading ? (
          <div className="py-14">
            <LoadingState title="Loading services" description="Please wait" />
          </div>
        ) : services.length ? (
          <div className="bc-service-list">
            {services.map((service) => (
              <ServiceListRow
                key={service.name}
                service={service}
                categoryLabel={activeChildCategory?.label ?? activeRootCategory?.label}
                selected={selectedServices.includes(service.name)}
                onToggle={(name) => onToggleService(name, service)}
              />
            ))}
          </div>
        ) : (
          <p className="py-14 text-center text-sm text-[color:var(--bc-muted)]">
            No services available in this category yet.
          </p>
        )}
      </div>
    </div>
  );
}

function CardGridPicker({
  selectedServices,
  onToggleService,
  initialCategory,
}: {
  selectedServices: string[];
  onToggleService: (serviceName: string, service?: PublicCatalogService) => void;
  initialCategory?: string | null;
}) {
  const [parentCategory, setParentCategory] = useState<string | null>(initialCategory ?? null);
  const [catalog, setCatalog] = useState<PublicServiceCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCatalog = useCallback(async (parent: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getServiceCatalog(parent ?? undefined);
      setCatalog(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load services");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog(parentCategory);
  }, [loadCatalog, parentCategory]);

  if (loading && !catalog) {
    return <LoadingState title="Loading services" description="Fetching categories" />;
  }

  return (
    <div className="space-y-4">
      <CatalogBreadcrumb
        items={catalog?.breadcrumb ?? []}
        onNavigate={(name) => setParentCategory(name)}
      />
      {error ? <p className="text-sm text-[color:var(--bc-danger)]">{error}</p> : null}
      {catalog?.categories.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.categories.map((category) => (
            <CategoryCard key={category.name} category={category} onSelect={setParentCategory} />
          ))}
        </div>
      ) : null}
      {catalog?.services.length ? (
        <div className="bc-service-panel">
          <div className="bc-service-list">
            {catalog.services.map((service) => (
              <ServiceListRow
                key={service.name}
                service={service}
                selected={selectedServices.includes(service.name)}
                onToggle={(name) => onToggleService(name, service)}
              />
            ))}
          </div>
        </div>
      ) : null}
      {!loading && !catalog?.categories.length && !catalog?.services.length ? (
        <p className="rounded-xl border border-dashed border-[color:var(--bc-border)] px-4 py-8 text-center text-sm text-[color:var(--bc-muted)]">
          No services available in this category yet.
        </p>
      ) : null}
    </div>
  );
}
