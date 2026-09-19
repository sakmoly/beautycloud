"use client";

import { useEffect, useState, type ReactNode } from "react";

export function CatalogPhoto({
  src,
  alt,
  fallback,
  className = "h-full w-full object-cover",
}: {
  src?: string | null;
  alt: string;
  fallback: ReactNode;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setFailed(true)}
        className={className}
      />
    );
  }

  return <>{fallback}</>;
}
