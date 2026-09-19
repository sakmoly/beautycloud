"use client";

import type { ReactNode } from "react";

export function KioskShell({
  salonName,
  branchName,
  logoUrl,
  children,
}: {
  salonName: string;
  branchName?: string | null;
  logoUrl?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="bc-kiosk-app flex min-h-screen flex-col bg-[color:var(--bc-background)]">
      <header className="bc-kiosk-header">
        <div className="bc-kiosk-header-inner">
          <div className="bc-kiosk-heading">
            <p className="bc-kiosk-eyebrow">Self-service check-in</p>
            <h1 className="bc-kiosk-title">{salonName}</h1>
            {branchName ? <p className="bc-kiosk-branch">{branchName}</p> : null}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl || "/assets/beauty_cloud/images/beauty-cloud-wordmark.png"}
            alt="Beau-T-Cloud"
            className="bc-kiosk-logo"
          />
        </div>
      </header>
      <main className="bc-kiosk-main flex-1">{children}</main>
    </div>
  );
}
