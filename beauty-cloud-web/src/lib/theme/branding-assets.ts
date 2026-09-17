import type { Metadata } from "next";

import type { Branding } from "@/lib/frappe/types";

/** Primary header logo from Beauty Cloud Branding Settings. */
export function resolveBrandLogo(branding?: Branding | null): string | null {
  const url = branding?.logo_light ?? branding?.logo_dark ?? null;
  return url?.trim() || null;
}

/** Tab / PWA icon: favicon first, then logo fallbacks from settings. */
export function resolveBrandFavicon(branding?: Branding | null): string | null {
  const url = branding?.favicon ?? branding?.logo_light ?? branding?.logo_dark ?? null;
  return url?.trim() || null;
}

export function buildMetadataIcons(iconUrl: string | null): Pick<Metadata, "icons"> | undefined {
  if (!iconUrl) return undefined;
  return {
    icons: {
      icon: [{ url: iconUrl }],
      apple: [{ url: iconUrl, sizes: "180x180" }],
    },
  };
}
