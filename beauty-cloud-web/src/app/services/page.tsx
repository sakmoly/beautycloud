import Link from "next/link";

import { ServicesBrowser } from "@/components/marketing/services-browser";
import { AppShell } from "@/components/layout/app-shell";
import { getPublicBootstrap } from "@/lib/frappe/bootstrap";
import { withBasePath } from "@/lib/base-path";

export const metadata = { title: "Services" };

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const bootstrap = await getPublicBootstrap();
  const params = await searchParams;
  const initialCategory = params.c ?? null;

  return (
    <AppShell bootstrap={bootstrap}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--bc-primary)]">
            Treatments
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Salon services</h1>
          <p className="mt-3 max-w-2xl text-[color:var(--bc-muted)]">
            Browse by category, then book your preferred services online.
          </p>
        </div>
        <Link href={withBasePath("/book")} className="bc-btn-dark">
          Book now
        </Link>
      </div>
      <ServicesBrowser initialCategory={initialCategory} />
    </AppShell>
  );
}
