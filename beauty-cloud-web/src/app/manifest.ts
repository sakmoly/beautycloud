import type { MetadataRoute } from "next";

import { getPublicBootstrap } from "@/lib/frappe/bootstrap";
import { mergeThemeVariables } from "@/lib/theme/variables";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function prefixPath(path: string): string {
  if (!basePath) return path;
  return `${basePath.replace(/\/$/, "")}${path}`;
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let name = "Beauty Cloud";
  let shortName = "Beauty Cloud";
  let themeColor = "#2F523F";
  let backgroundColor = "#ffffff";

  try {
    const bootstrap = await getPublicBootstrap();
    name = bootstrap.application_title ?? name;
    shortName = (bootstrap.application_title ?? shortName).slice(0, 12);
    const vars = mergeThemeVariables(bootstrap.branding?.css_variables);
    themeColor = vars["--bc-primary"] ?? themeColor;
    backgroundColor = vars["--bc-surface"] ?? backgroundColor;
  } catch {
    /* defaults */
  }

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
    icons: [
      {
        src: prefixPath("/icons/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: prefixPath("/icons/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: prefixPath("/icons/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
