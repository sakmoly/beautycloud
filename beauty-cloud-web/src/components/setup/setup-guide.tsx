"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DESK_PATHS, deskUrl } from "@/lib/desk-links";
import { withBasePath } from "@/lib/base-path";

export function SetupGuide({
  setupComplete,
  frappeBaseUrl,
  branchCount = 0,
  onAddBranch,
}: {
  setupComplete: boolean;
  frappeBaseUrl: string;
  branchCount?: number;
  onAddBranch: () => void;
}) {
  if (!setupComplete) {
    return (
      <Card
        title="First-time setup"
        description="Complete the steps below once for your salon. You can add more branches on the same site later."
        elevated
        className="mb-6"
      >
        <p className="text-sm text-[color:var(--bc-muted)]">
          Work through each step in order. Sample data buttons help you go live quickly.
        </p>
      </Card>
    );
  }

  return (
    <div className="mb-6 space-y-4">
      <Card title="Salon is live on this site" elevated>
        <p className="text-sm text-[color:var(--bc-muted)]">
          Your company is configured. All branches share the same site, services, and company — reception
          and booking can work across locations.
          {branchCount > 0 ? (
            <>
              {" "}
              You currently have <strong>{branchCount}</strong> branch{branchCount === 1 ? "" : "es"}.
            </>
          ) : null}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={withBasePath("/staff/reception")}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[color:var(--bc-primary)] px-5 text-sm font-semibold text-white"
          >
            Open reception
          </Link>
          <Link
            href={withBasePath("/book")}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--bc-border)] bg-white px-5 text-sm font-semibold"
          >
            Preview online booking
          </Link>
        </div>
      </Card>

      <Card title="Open a new branch (same site, same company)" elevated>
        <p className="text-sm text-[color:var(--bc-muted)]">
          To add another shop or location under Bahyea Beauty — no new site needed. Each branch gets its
          own code, opening hours, POS profile, and staff schedules.
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-[color:var(--bc-muted)]">
          <li>
            <strong>Branch</strong> — create the location (unique code, e.g.{" "}
            <code className="rounded bg-[color:var(--bc-accent-muted)] px-1">JEDDAH</code> or{" "}
            <code className="rounded bg-[color:var(--bc-accent-muted)] px-1">MALL</code>)
          </li>
          <li>
            <strong>Opening hours</strong> — set branch schedule in step 4 or in Desk
          </li>
          <li>
            <strong>Team</strong> — assign employees, skills, and weekly schedules for that branch in Desk
          </li>
        </ol>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={onAddBranch}>Add new branch → step 3</Button>
          <a
            href={deskUrl(frappeBaseUrl, DESK_PATHS.branches)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-full border border-[color:var(--bc-border)] bg-white px-5 text-sm font-semibold"
          >
            Manage branches in Desk
          </a>
        </div>
      </Card>
    </div>
  );
}
