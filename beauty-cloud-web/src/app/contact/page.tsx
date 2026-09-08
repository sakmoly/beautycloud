import Link from "next/link";

import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { CmsPageView } from "@/components/marketing/cms-page-view";
import { getPublicBootstrap } from "@/lib/frappe/bootstrap";
import { getPublicWebPage } from "@/lib/frappe/catalog";
import { ErrorState } from "@/components/ui/states";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const page = await getPublicWebPage("contact");
    return {
      title: page.title,
      description: page.meta_description ?? page.subtitle ?? undefined,
    };
  } catch {
    return { title: "Contact" };
  }
}

export default async function ContactPage() {
  const bootstrap = await getPublicBootstrap();

  try {
    const page = await getPublicWebPage("contact");
    return (
      <AppShell bootstrap={bootstrap} fullWidth>
        <CmsPageView page={page} />
      </AppShell>
    );
  } catch {
    return (
      <AppShell bootstrap={bootstrap}>
        <ErrorState
          title="Contact page not available"
          description="Publish the Contact page in ERPNext → Beauty Web Page."
        />
      </AppShell>
    );
  }
}
