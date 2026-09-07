import { frappeCall } from "@/lib/frappe/client";
import type { PublicBootstrap } from "@/lib/frappe/types";

export async function getPublicBootstrap(
  company?: string,
  branch?: string,
): Promise<PublicBootstrap> {
  return frappeCall<PublicBootstrap>(
    "beauty_cloud.api.bootstrap.get_public_bootstrap",
    {
      params: { company, branch },
      cache: "no-store",
    },
  );
}
