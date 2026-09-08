import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { CmsPageView } from "@/components/marketing/cms-page-view";
import { getPublicBootstrap } from "@/lib/frappe/bootstrap";
import { getPublicWebPage } from "@/lib/frappe/catalog";
import { ErrorState } from "@/components/ui/states";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const page = await getPublicWebPage("about");
    return {
      title: page.title,
      description: page.meta_description ?? page.subtitle ?? undefined,
    };
  } catch {
    return { title: "About" };
  }
}

export default async function AboutPage() {
  const bootstrap = await getPublicBootstrap();

  try {
    const page = await getPublicWebPage("about");
    return (
      <AppShell bootstrap={bootstrap} fullWidth>
        <CmsPageView page={page} />
      </AppShell>
    );
  } catch {
    return (
      <AppShell bootstrap={bootstrap}>
        <ErrorState
          title="About page not available"
          description="Publish the About page in ERPNext → Beauty Web Page."
        />
      </AppShell>
    );
  }
}
