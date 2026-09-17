import type { MetadataRoute } from "next";

import { getPublicBootstrap } from "@/lib/frappe/bootstrap";
import { resolveBrandFavicon } from "@/lib/theme/branding-assets";
import { mergeThemeVariables } from "@/lib/theme/variables";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function prefixPath(path: string): string {
  if (!basePath) return path;
  return `${basePath.replace(/\/$/, "")}${path}`;
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let name = "Beauty Cloud";
  let shortName = "Beauty Cloud";
  let themeColor = "#FF1B9A";
  let backgroundColor = "#ffffff";
  let iconUrl: string | null = null;

  try {
    const bootstrap = await getPublicBootstrap();
    name = bootstrap.application_title ?? name;
    shortName = (bootstrap.application_title ?? shortName).slice(0, 12);
    const vars = mergeThemeVariables(bootstrap.branding?.css_variables);
    themeColor = vars["--bc-primary"] ?? themeColor;
    backgroundColor = vars["--bc-surface"] ?? backgroundColor;
    iconUrl = resolveBrandFavicon(bootstrap.branding);
  } catch {
    /* defaults */
  }

  const icons: MetadataRoute.Manifest["icons"] = iconUrl
    ? [
        { src: iconUrl, sizes: "192x192", purpose: "any" },
        { src: iconUrl, sizes: "512x512", purpose: "any" },
        { src: iconUrl, sizes: "512x512", purpose: "maskable" },
      ]
    : [];

  return {
    name,
    short_name: shortName,
    description: "Salon booking, reception, POS, and staff tools",
    start_url: prefixPath("/"),
    scope: prefixPath("/"),
    display: "standalone",
    orientation: "portrait-primary",
    background_color: backgroundColor,
    theme_color: themeColor,
    icons,
  };
}
