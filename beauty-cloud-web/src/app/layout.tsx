import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Geist, Geist_Mono } from "next/font/google";

import { getPublicBootstrap } from "@/lib/frappe/bootstrap";
import { mergeThemeVariables } from "@/lib/theme/variables";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const bootstrap = await getPublicBootstrap();
    return {
      title: {
        default: bootstrap.application_title ?? "Beauty Cloud",
        template: `%s · ${bootstrap.application_title ?? "Beauty Cloud"}`,
      },
      description: `${bootstrap.company_display_name ?? bootstrap.company} salon platform`,
    };
  } catch {
    return {
      title: "Beauty Cloud",
      description: "Salon management platform",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={themeStyle}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
