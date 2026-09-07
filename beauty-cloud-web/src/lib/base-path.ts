/** Client-safe base path prefix (matches NEXT_PUBLIC_BASE_PATH). */
export function getBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH ?? "";
}

/** Prefix an app-relative path with the Next.js basePath. */
export function withBasePath(path: string): string {
  const base = getBasePath();
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  if (!base) return path;
  return `${base.replace(/\/$/, "")}${path}`;
}
