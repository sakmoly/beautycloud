import type { Metadata } from "next";

import type { Branding } from "@/lib/frappe/types";

/** Official Beauty Cloud mark when Branding Settings has no upload. */
export const DEFAULT_BRAND_LOGO = "/assets/beauty_cloud/images/beauty-cloud-wordmark.png";
export const DEFAULT_BRAND_MARK = "/assets/beauty_cloud/images/beauty-cloud-logo.png";
export const DEFAULT_BRAND_FAVICON = "/assets/beauty_cloud/images/beauty-cloud-favicon.png";

/** Primary header logo from Beauty Cloud Branding Settings. */
export function resolveBrandLogo(branding?: Branding | null): string {
  const url = branding?.logo_light ?? branding?.logo_dark ?? null;
  return url?.trim() || DEFAULT_BRAND_LOGO;
}

/** Tab / PWA icon: favicon first, then logo fallbacks from settings. */
export function resolveBrandFavicon(branding?: Branding | null): string {
  const url = branding?.favicon ?? branding?.logo_light ?? branding?.logo_dark ?? null;
  return url?.trim() || DEFAULT_BRAND_FAVICON;
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
