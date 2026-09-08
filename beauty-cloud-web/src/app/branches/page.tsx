import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { getPublicBootstrap } from "@/lib/frappe/bootstrap";
import { frappeCall } from "@/lib/frappe/client";
import type { BeautyBranch } from "@/lib/api/types";
import { withBasePath } from "@/lib/base-path";

export const metadata = { title: "Branches" };

export default async function BranchesPage() {
  const bootstrap = await getPublicBootstrap();
  const branches = await frappeCall<BeautyBranch[]>("beauty_cloud.api.bootstrap.get_branches", {
    cache: "no-store",
  });

  return (
    <AppShell bootstrap={bootstrap}>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--bc-primary)]">
          Locations
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Our branches</h1>
        <p className="mt-3 max-w-2xl text-[color:var(--bc-muted)]">
          Visit us in salon or book online for your preferred branch.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {branches.map((branch) => (
          <article
            key={branch.name}
            className="rounded-[var(--bc-radius-lg)] border border-[color:var(--bc-border)] bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-semibold">{branch.branch_name}</h2>
            {branch.address ? (
              <p className="mt-3 text-sm leading-relaxed text-[color:var(--bc-muted)]">{branch.address}</p>
            ) : null}
            <div className="mt-4 space-y-1 text-sm">
              {branch.phone ? <p>📞 {branch.phone}</p> : null}
              {branch.email ? <p>✉️ {branch.email}</p> : null}
            </div>
            <Link href={withBasePath("/book")} className="bc-btn-dark mt-5">
              Book at this branch
            </Link>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
