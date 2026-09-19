import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Geist_Mono, Inter, Playfair_Display } from "next/font/google";

import { InstallAppPrompt } from "@/components/layout/install-app-prompt";
import { getPublicBootstrap } from "@/lib/frappe/bootstrap";
import { buildMetadataIcons, resolveBrandFavicon } from "@/lib/theme/branding-assets";
import { mergeThemeVariables } from "@/lib/theme/variables";

import "./globals.css";

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const displayFont = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const iconPrefix = basePath ? `${basePath.replace(/\/$/, "")}` : "";

  try {
    const bootstrap = await getPublicBootstrap();
    const vars = mergeThemeVariables(bootstrap.branding?.css_variables);
    const title = bootstrap.application_title ?? "Beauty Cloud";
    const favicon = resolveBrandFavicon(bootstrap.branding);
    return {
      title: {
        default: title,
        template: `%s · ${title}`,
      },
      description: `${bootstrap.company_display_name ?? bootstrap.company} salon platform`,
      applicationName: title,
      manifest: `${iconPrefix}/manifest.webmanifest`,
      appleWebApp: {
        capable: true,
        title,
        statusBarStyle: "default",
      },
      ...buildMetadataIcons(favicon),
      themeColor: vars["--bc-primary"] ?? "#FF1B9A",
    };
  } catch {
    return {
      title: "Beauty Cloud",
      description: "Salon management platform",
      applicationName: "Beauty Cloud",
      manifest: `${iconPrefix}/manifest.webmanifest`,
      appleWebApp: { capable: true, title: "Beauty Cloud" },
      ...buildMetadataIcons("/assets/beauty_cloud/images/beauty-cloud-favicon.png"),
      themeColor: "#FF1B9A",
    };
  }
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  let themeStyle: CSSProperties = mergeThemeVariables();
  try {
    const bootstrap = await getPublicBootstrap();
    themeStyle = mergeThemeVariables(bootstrap.branding?.css_variables);
  } catch {
    // fall back to default theme tokens
  }

  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${displayFont.variable} ${geistMono.variable} h-full antialiased`}
      style={themeStyle}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <InstallAppPrompt />
      </body>
    </html>
  );
}
