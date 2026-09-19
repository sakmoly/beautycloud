"use client";

import type { PublicCatalogCategory } from "@/lib/frappe/types";
import { CatalogPhoto } from "@/components/ui/catalog-photo";
import { categoryEmoji } from "@/lib/category-emoji";

export function CategoryNav({
  rootCategories,
  activeRoot,
  childCategories,
  activeChild,
  onSelectRoot,
  onSelectChild,
}: {
  rootCategories: PublicCatalogCategory[];
  activeRoot: string;
  childCategories: PublicCatalogCategory[];
  activeChild: string | null;
  onSelectRoot: (name: string) => void;
  onSelectChild: (name: string) => void;
}) {
  return (
    <div className="bc-cat-nav">
      <div>
        <p className="bc-cat-nav-label">Categories</p>
        <div className="bc-cat-root-row">
          <button
            type="button"
            className={`bc-cat-root-pill ${activeRoot === "featured" ? "active" : ""}`}
            onClick={() => onSelectRoot("featured")}
          >
            <span className="bc-cat-root-icon" aria-hidden>
              ✦
            </span>
            <span>Featured</span>
          </button>
          {rootCategories.map((category) => (
            <button
              key={category.name}
              type="button"
              className={`bc-cat-root-pill ${activeRoot === category.name ? "active" : ""}`}
              onClick={() => onSelectRoot(category.name)}
            >
              <span className={`bc-cat-root-icon ${category.image ? "has-photo" : ""}`} aria-hidden>
                <CatalogPhoto src={category.image} alt="" fallback={categoryEmoji(category.label)} />
              </span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      {childCategories.length > 0 && activeRoot !== "featured" ? (
        <div className="bc-cat-sub-section">
          <p className="bc-cat-nav-label">Sub-categories</p>
          <div className="bc-cat-sub-row">
            {childCategories.map((category) => (
              <button
                key={category.name}
                type="button"
                className={`bc-cat-sub-pill ${activeChild === category.name ? "active" : ""}`}
                onClick={() => onSelectChild(category.name)}
              >
                <span className="bc-cat-sub-dot" aria-hidden />
                {category.label}
                {category.service_count ? (
                  <span className="bc-cat-sub-count">{category.service_count}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
