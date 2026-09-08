import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { CmsSectionRenderer } from "@/components/marketing/cms-page-view";
import { HeroCarousel } from "@/components/marketing/hero-carousel";
import { getPublicBootstrap } from "@/lib/frappe/bootstrap";
import { getPublicHomePage } from "@/lib/frappe/catalog";

export default async function HomePage() {
  const bootstrap = await getPublicBootstrap();
  const branding = bootstrap.branding;
  let homeSections = [] as NonNullable<Awaited<ReturnType<typeof getPublicHomePage>>>["sections"];

  try {
    const homePage = await getPublicHomePage();
    homeSections = homePage?.sections ?? [];
  } catch {
    homeSections = [];
  }

  return (
    <AppShell bootstrap={bootstrap} fullWidth>
      <HeroCarousel
        slides={branding?.hero_slides ?? []}
        fallbackImage={branding?.booking_header_image}
        fallbackTitle={branding?.hero_title ?? "HAIR & BEAUTY"}
        fallbackSubtitle={branding?.hero_subtitle ?? undefined}
        fallbackEyebrow={branding?.tagline ?? "Find Out More"}
      />

      {homeSections.length ? (
        <div>
          {homeSections.map((section, index) => (
            <CmsSectionRenderer key={`home-${section.sort_order}-${index}`} section={section} />
          ))}
        </div>
      ) : null}
    </AppShell>
  );
}
