import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { CmsPageView } from "@/components/marketing/cms-page-view";
import { getPublicBootstrap } from "@/lib/frappe/bootstrap";
import { getPublicWebPage } from "@/lib/frappe/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const page = await getPublicWebPage(slug);
    return {
      title: page.title,
      description: page.meta_description ?? page.subtitle ?? undefined,
    };
  } catch {
    return { title: slug };
  }
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const bootstrap = await getPublicBootstrap();
  const { slug } = await params;

  if (slug === "about") {
    redirect("/about");
  }

  if (slug === "contact") {
    redirect("/contact");
  }

  try {
    const page = await getPublicWebPage(slug);
    return (
      <AppShell bootstrap={bootstrap} fullWidth>
        <CmsPageView page={page} />
      </AppShell>
    );
  } catch {
    notFound();
  }
}
