"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PublicStylistSummary } from "@/lib/frappe/types";

function StylistPhoto({ name, image }: { name: string; image?: string | null }) {
  const [failed, setFailed] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  if (!image || failed) {
    return (
      <div className="bc-cms-stylist-fallback" aria-hidden>
        <span>{initial}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt={name} className="h-full w-full object-cover" onError={() => setFailed(true)} />
  );
}

export function StylistCarousel({
  stylists,
  title,
  subtitle,
}: {
  stylists: PublicStylistSummary[];
  title?: string | null;
  subtitle?: string | null;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  const scroll = (direction: "prev" | "next") => {
    const el = trackRef.current;
    if (!el) return;
    const amount = Math.max(280, el.clientWidth * 0.85);
    el.scrollBy({ left: direction === "next" ? amount : -amount, behavior: "smooth" });
    window.setTimeout(updateArrows, 320);
  };

  useEffect(() => {
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [stylists.length, updateArrows]);

  if (!stylists.length) return null;

  return (
    <section className="bc-cms-stylists">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            {subtitle ? <p className="bc-cms-eyebrow">{subtitle}</p> : null}
            {title ? <h2 className="bc-cms-heading mt-2">{title}</h2> : null}
          </div>
          {stylists.length > 4 ? (
            <div className="flex gap-2">
              <button
                type="button"
                className="bc-cms-carousel-btn"
                onClick={() => scroll("prev")}
                disabled={!canPrev}
                aria-label="Previous stylists"
              >
                ‹
              </button>
              <button
                type="button"
                className="bc-cms-carousel-btn"
                onClick={() => scroll("next")}
                disabled={!canNext}
                aria-label="Next stylists"
              >
                ›
              </button>
            </div>
          ) : null}
        </div>

        <div ref={trackRef} className="bc-cms-stylist-track" onScroll={updateArrows}>
          {stylists.map((stylist) => (
            <article key={stylist.name} className="bc-cms-stylist-card">
              <div className="bc-cms-stylist-photo">
                <StylistPhoto name={stylist.employee_name} image={stylist.image} />
              </div>
              <div className="bc-cms-stylist-info">
                <p className="font-display text-lg leading-tight">{stylist.employee_name}</p>
                {stylist.designation ? (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[color:var(--bc-secondary)]">
                    {stylist.designation}
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
