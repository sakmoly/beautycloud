import { frappeCall } from "@/lib/frappe/client";
import type { PublicServiceCatalog, WebPageContent } from "@/lib/frappe/types";

export async function getPublicServiceCatalog(parentCategory?: string) {
  return frappeCall<PublicServiceCatalog>("beauty_cloud.api.catalog.get_service_catalog", {
    params: { parent_category: parentCategory, online_only: 1 },
    cache: "no-store",
  });
}

export async function getPublicWebPage(pageSlug: string) {
  return frappeCall<WebPageContent>("beauty_cloud.api.catalog.get_web_page", {
    params: { page_slug: pageSlug },
    cache: "no-store",
  });
}

export async function getPublicHomePage() {
  return frappeCall<WebPageContent | null>("beauty_cloud.api.catalog.get_home_page", {
    cache: "no-store",
  });
}
