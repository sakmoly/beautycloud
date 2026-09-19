import Link from "next/link";

import { CmsImage } from "@/components/marketing/cms-image";
import { StylistCarousel } from "@/components/marketing/stylist-carousel";
import type { WebPageContent, WebPageSection, WebPageWhyUsItem } from "@/lib/frappe/types";
import { CatalogPhoto } from "@/components/ui/catalog-photo";
import { categoryEmoji } from "@/lib/category-emoji";
import { withBasePath } from "@/lib/base-path";

function resolveHref(url?: string | null) {
  if (!url) return withBasePath("/");
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return withBasePath(url.startsWith("/") ? url : `/${url}`);
}

function CmsButton({
  label,
  url,
  variant = "outline",
  className = "",
}: {
  label?: string | null;
  url?: string | null;
  variant?: "outline" | "dark" | "ghost-light";
  className?: string;
}) {
  if (!label || !url) return null;
  const href = resolveHref(url);
  const external = href.startsWith("http");
  const styles = {
    outline: "bc-btn-outline",
    dark: "bc-btn-dark",
    "ghost-light": "bc-btn-ghost-light",
  }[variant];

  if (external) {
    return (
      <a href={href} className={`${styles} inline-flex text-xs ${className}`} target="_blank" rel="noreferrer">
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={`${styles} inline-flex text-xs ${className}`}>
      {label}
    </Link>
  );
}

function CmsButtonRow({ section }: { section: WebPageSection }) {
  return (
    <div className="mt-8 flex flex-wrap gap-4">
      <CmsButton label={section.link_label} url={section.link_url} variant="dark" />
      <CmsButton label={section.secondary_link_label} url={section.secondary_link_url} variant="ghost-light" />
    </div>
  );
}

const WHY_US_ICONS: Record<string, string> = {
  team: "👥",
  scissors: "✂️",
  sparkle: "✨",
  booking: "📅",
  branch: "📍",
  star: "⭐",
  shield: "🛡️",
  clock: "🕐",
};

function WhyUsIcon({ icon }: { icon?: string | null }) {
  const glyph = WHY_US_ICONS[icon ?? ""] ?? "✦";
  return <span className="text-3xl" aria-hidden>{glyph}</span>;
}

function SectionHero({ section }: { section: WebPageSection }) {
  return (
    <section className="bc-hero-full bc-cms-hero">
      {section.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={section.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[color:var(--bc-primary)]" />
      )}
      <div className="bc-hero-full-overlay bc-cms-hero-overlay" />
      <div className="bc-hero-full-content mx-auto w-full max-w-7xl px-6 sm:px-8">
        {section.subtitle ? (
          <p className="max-w-2xl text-sm font-light tracking-[0.2em] text-white/90 uppercase">{section.subtitle}</p>
        ) : null}
        {section.title ? (
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-bold tracking-wide text-white uppercase sm:text-6xl lg:text-7xl">
            {section.title}
          </h1>
        ) : null}
        {section.body ? (
          <div
            className="prose prose-invert prose-lg mt-5 max-w-xl text-white/90"
            dangerouslySetInnerHTML={{ __html: section.body }}
          />
        ) : null}
        <CmsButtonRow section={section} />
      </div>
    </section>
  );
}

function SectionTrustChips({ section }: { section: WebPageSection }) {
  const chips = (section.trust_chips ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!chips.length) return null;
  return (
    <section className="bc-cms-trust-bar" aria-label="Highlights">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="bc-cms-trust-track">
          {chips.map((chip, index) => (
            <span key={`${chip}-${index}`} className="bc-cms-trust-chip">
              {chip}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionWhyUs({ section }: { section: WebPageSection }) {
  const items = section.why_us ?? [];
  if (!items.length) return null;
  return (
    <section className="bc-cms-section bc-cms-section-alt">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          {section.subtitle ? <p className="bc-cms-eyebrow">{section.subtitle}</p> : null}
          {section.title ? <h2 className="bc-cms-heading mt-2">{section.title}</h2> : null}
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item: WebPageWhyUsItem, index) => (
            <article key={`${item.title}-${index}`} className="bc-cms-feature-card">
              <div className="bc-cms-feature-icon">
                <WhyUsIcon icon={item.icon} />
              </div>
              <h3 className="mt-4 font-display text-xl">{item.title}</h3>
              {item.description ? (
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--bc-muted)]">{item.description}</p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionServicesGrid({ section }: { section: WebPageSection }) {
  const categories = section.categories ?? [];
  if (!categories.length) return null;
  return (
    <section className="bc-cms-section">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            {section.subtitle ? <p className="bc-cms-eyebrow">{section.subtitle}</p> : null}
            {section.title ? <h2 className="bc-cms-heading mt-2">{section.title}</h2> : null}
          </div>
          <CmsButton label={section.link_label ?? "See all"} url={section.link_url ?? "/services"} variant="outline" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.name}
              href={withBasePath(`/services?c=${encodeURIComponent(category.name)}`)}
              className="bc-cms-service-card group"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-[color:var(--bc-accent-muted)]">
                <CatalogPhoto
                  src={category.image}
                  alt={category.label}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  fallback={<div className="flex h-full items-center justify-center text-5xl opacity-60">{categoryEmoji(category.label)}</div>}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-80" />
                <p className="absolute bottom-4 left-4 font-display text-2xl text-white">{category.label}</p>
              </div>
              <div className="p-4">
                <p className="text-sm text-[color:var(--bc-muted)]">
                  {category.is_group ? "Browse subcategories →" : `${category.service_count} services available`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionBranches({ section }: { section: WebPageSection }) {
  const branches = section.branches ?? [];
  if (!branches.length) return null;
  return (
    <section className="bc-cms-section">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            {section.subtitle ? <p className="bc-cms-eyebrow">{section.subtitle}</p> : null}
            {section.title ? <h2 className="bc-cms-heading mt-2">{section.title}</h2> : null}
          </div>
          <CmsButton label={section.link_label ?? "View all"} url={section.link_url ?? "/branches"} variant="outline" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {branches.map((branch) => (
            <article key={branch.name} className="bc-cms-branch-card">
              <h3 className="font-display text-xl">{branch.branch_name}</h3>
              {branch.address ? <p className="mt-3 text-sm leading-relaxed text-[color:var(--bc-muted)]">{branch.address}</p> : null}
              {branch.phone ? <p className="mt-3 text-sm font-semibold text-[color:var(--bc-secondary)]">{branch.phone}</p> : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionStylists({ section }: { section: WebPageSection }) {
  const stylists = section.stylists ?? [];
  return <StylistCarousel stylists={stylists} title={section.title} subtitle={section.subtitle} />;
}

function SectionFaq({ section }: { section: WebPageSection }) {
  const items = section.faq ?? [];
  if (!items.length) return null;
  return (
    <section className="bc-cms-section bc-cms-section-alt">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {section.title ? <h2 className="bc-cms-heading mb-8 text-center">{section.title}</h2> : null}
        <div className="space-y-3">
          {items.map((item, index) => (
            <details key={`${item.question}-${index}`} className="bc-cms-faq-item">
              <summary>{item.question}</summary>
              {item.answer ? (
                <div className="bc-cms-faq-answer prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: item.answer }} />
              ) : null}
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionTextImage({ section }: { section: WebPageSection }) {
  const imageRight = section.image_position === "Right";
  return (
    <section className="bc-cms-section">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
        <div className={imageRight ? "lg:order-1" : "lg:order-2"}>
          <CmsImage src={section.image} className="bc-cms-split-image" />
        </div>
        <div className={imageRight ? "lg:order-2" : "lg:order-1"}>
          {section.subtitle ? <p className="bc-cms-eyebrow">{section.subtitle}</p> : null}
          {section.title ? <h2 className="bc-cms-heading mt-2">{section.title}</h2> : null}
          {section.body ? (
            <div className="bc-cms-prose mt-5" dangerouslySetInnerHTML={{ __html: section.body }} />
          ) : null}
          <CmsButton label={section.link_label} url={section.link_url} variant="outline" className="mt-6" />
        </div>
      </div>
    </section>
  );
}

function SectionRichText({ section }: { section: WebPageSection }) {
  return (
    <section className="bc-cms-section bc-cms-story">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {section.title ? (
          <div className="mb-10 text-center">
            <p className="bc-cms-eyebrow">Our story</p>
            <h2 className="bc-cms-heading mt-2">{section.title}</h2>
            <div className="bc-cms-divider mx-auto mt-6" />
          </div>
        ) : null}
        {section.body ? <div className="bc-cms-prose bc-cms-prose-story mx-auto" dangerouslySetInnerHTML={{ __html: section.body }} /> : null}
      </div>
    </section>
  );
}

function SectionCta({ section }: { section: WebPageSection }) {
  return (
    <section className="bc-cms-cta-banner">
      <div className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-20">
        {section.title ? <h2 className="font-display text-4xl text-white sm:text-5xl">{section.title}</h2> : null}
        {section.subtitle ? <p className="mx-auto mt-4 max-w-lg text-lg text-white/90">{section.subtitle}</p> : null}
        {section.body ? (
          <div className="prose prose-invert mx-auto mt-4 max-w-none" dangerouslySetInnerHTML={{ __html: section.body }} />
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <CmsButton label={section.link_label} url={section.link_url} variant="ghost-light" />
          <CmsButton label={section.secondary_link_label} url={section.secondary_link_url} variant="outline" className="!border-white !text-white hover:!bg-white hover:!text-[color:var(--bc-primary)]" />
        </div>
      </div>
    </section>
  );
}

function SectionBookCta({ section }: { section: WebPageSection }) {
  return <SectionCta section={{ ...section, link_label: section.link_label ?? "Book Now", link_url: section.link_url ?? "/book" }} />;
}

function SectionImageBanner({ section }: { section: WebPageSection }) {
  return (
    <section className="relative min-h-[320px] overflow-hidden sm:min-h-[420px]">
      {section.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={section.image} alt={section.title ?? ""} className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      {section.title ? (
        <div className="absolute inset-x-0 bottom-0 px-6 py-10 sm:py-14">
          <p className="mx-auto max-w-7xl font-display text-3xl text-white sm:text-4xl">{section.title}</p>
        </div>
      ) : null}
    </section>
  );
}

function SectionGallery({ section }: { section: WebPageSection }) {
  const items = section.gallery ?? [];
  if (!items.length && !section.image) return null;
  return (
    <section className="bc-cms-section bc-cms-section-alt">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {section.title ? (
          <div className="mb-8 text-center">
            <p className="bc-cms-eyebrow">Gallery</p>
            <h2 className="bc-cms-heading mt-2">{section.title}</h2>
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) =>
            item.image ? (
              <figure key={index} className="bc-cms-gallery-item group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image} alt={item.caption ?? ""} className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-105" />
                {item.caption ? (
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-sm text-white">
                    {item.caption}
                  </figcaption>
                ) : null}
              </figure>
            ) : null,
          )}
        </div>
      </div>
    </section>
  );
}

export function CmsSectionRenderer({ section }: { section: WebPageSection }) {
  switch (section.section_type) {
    case "Hero":
      return <SectionHero section={section} />;
    case "Trust Chips":
      return <SectionTrustChips section={section} />;
    case "Why Us":
      return <SectionWhyUs section={section} />;
    case "Services Grid":
      return <SectionServicesGrid section={section} />;
    case "Branches":
      return <SectionBranches section={section} />;
    case "Stylists":
      return <SectionStylists section={section} />;
    case "Text & Image":
      return <SectionTextImage section={section} />;
    case "Rich Text":
      return <SectionRichText section={section} />;
    case "CTA":
      return <SectionCta section={section} />;
    case "Book CTA":
      return <SectionBookCta section={section} />;
    case "Image Banner":
      return <SectionImageBanner section={section} />;
    case "Gallery":
      return <SectionGallery section={section} />;
    default:
      return null;
  }
}

export function CmsPageView({ page }: { page: WebPageContent }) {
  const hasSections = (page.sections?.length ?? 0) > 0;

  if (hasSections) {
    return (
      <article className="bc-cms-page">
        {page.sections!.map((section, index) => (
          <CmsSectionRenderer key={`${section.section_type}-${section.sort_order}-${index}`} section={section} />
        ))}
      </article>
    );
  }

  return (
    <article className="overflow-hidden border border-[color:var(--bc-border)] bg-white shadow-sm">
      {page.hero_image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={page.hero_image} alt="" className="h-56 w-full object-cover sm:h-72" />
      ) : (
        <div className="h-40 bg-gradient-to-r from-[color:var(--bc-accent-muted)] to-[color:var(--bc-accent-light)] sm:h-56" />
      )}
      <div className="p-8 sm:p-10">
        {page.subtitle ? <p className="bc-cms-eyebrow">{page.subtitle}</p> : null}
        <h1 className="bc-cms-heading mt-2">{page.title}</h1>
        {page.body ? <div className="bc-cms-prose mt-6" dangerouslySetInnerHTML={{ __html: page.body }} /> : null}
      </div>
    </article>
  );
}
