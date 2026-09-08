"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { HeroSlide } from "@/lib/frappe/types";
import { withBasePath } from "@/lib/base-path";

function resolveHref(link?: string | null) {
  if (!link) return withBasePath("/book");
  if (link.startsWith("http")) return link;
  return withBasePath(link.startsWith("/") ? link : `/${link}`);
}

export function HeroCarousel({
  slides,
  fallbackImage,
  fallbackTitle,
  fallbackSubtitle,
  fallbackEyebrow,
}: {
  slides: HeroSlide[];
  fallbackImage?: string | null;
  fallbackTitle?: string | null;
  fallbackSubtitle?: string | null;
  fallbackEyebrow?: string | null;
}) {
  const items: HeroSlide[] =
    slides.length > 0
      ? slides
      : [
          {
            image: fallbackImage ?? null,
            title: fallbackTitle ?? "HAIR & BEAUTY",
            subtitle: fallbackSubtitle ?? undefined,
            eyebrow: fallbackEyebrow ?? "Find Out More",
            cta_label: "Book Now",
            cta_link: "/book",
          },
        ];

  const [index, setIndex] = useState(0);
  const active = items[index] ?? items[0];

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % items.length);
  }, [items.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = window.setInterval(next, 7000);
    return () => window.clearInterval(timer);
  }, [items.length, next]);

  return (
    <section className="bc-hero-full">
      {active.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={active.image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(135deg, #3d3d3d 0%, #1a1a1a 50%, #2d2520 100%)",
          }}
        />
      )}
      <div className="bc-hero-full-overlay" />
      <div className="bc-hero-full-content mx-auto w-full max-w-7xl">
        {active.eyebrow ? (
          <p className="text-sm font-light tracking-[0.15em] text-white/90 uppercase">
            {active.eyebrow}
          </p>
        ) : null}
        <h1 className="mt-3 max-w-xl font-display text-5xl font-bold tracking-wide text-white uppercase sm:text-6xl lg:text-7xl">
          {active.title}
        </h1>
        {active.subtitle ? (
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-white/85">{active.subtitle}</p>
        ) : null}
        <div className="mt-8">
          <Link href={resolveHref(active.cta_link)} className="bc-btn-ghost-light">
            {active.cta_label ?? "Know More"}
          </Link>
        </div>
      </div>
      {items.length > 1 ? (
        <>
          <button type="button" className="bc-hero-carousel-btn prev" onClick={prev} aria-label="Previous slide">
            ‹
          </button>
          <button type="button" className="bc-hero-carousel-btn next" onClick={next} aria-label="Next slide">
            ›
          </button>
          <div className="absolute bottom-6 left-1/2 z-3 flex -translate-x-1/2 gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-white" : "w-1.5 bg-white/50"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
