import type { ReactNode } from "react";

import type { Branding } from "@/lib/frappe/types";
import { resolveBrandLogo } from "@/lib/theme/branding-assets";

export function BrandLogo({
  branding,
  alt,
  className,
  fallback,
}: {
  branding?: Branding | null;
  alt: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const src = resolveBrandLogo(branding);
  if (!src) {
    return fallback ?? null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  );
}
