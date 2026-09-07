export const DESK_PATHS = {
  workspace: "/app/beauty-cloud",
  settings: "/app/beauty-cloud-settings",
  branding: "/app/beauty-cloud-branding-settings",
  plans: "/app/beauty-cloud-plan",
  tenants: "/app/beauty-cloud-tenant",
  branches: "/app/beauty-branch",
  services: "/app/beauty-service",
} as const;

export function deskUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export function frappeAssetUrl(baseUrl: string, path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return deskUrl(baseUrl, path.startsWith("/") ? path : `/${path}`);
}
