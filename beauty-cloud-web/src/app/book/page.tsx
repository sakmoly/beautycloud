import Link from "next/link";

import { BookingWizard } from "@/components/booking/booking-wizard";
import { AppShell } from "@/components/layout/app-shell";
import { getPublicBootstrap } from "@/lib/frappe/bootstrap";

export const metadata = { title: "Book appointment" };

export default async function BookPage() {
  const bootstrap = await getPublicBootstrap();
  const salon =
    bootstrap.company_display_name ?? bootstrap.company ?? "Your salon";

  return (
    <AppShell bootstrap={bootstrap}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--bc-primary)]">
            Online booking
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Book at {salon}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[color:var(--bc-muted)]">
            Choose your services, pick a time with your beautician, verify your
            mobile, and confirm — all in a few steps.
          </p>
        </div>
        <Link
          href="/book/appointments"
          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--bc-border)] bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition hover:border-[color:var(--bc-primary)]/30 hover:text-[color:var(--bc-primary)]"
        >
          My appointments
          <span aria-hidden>→</span>
        </Link>
      </div>
      <BookingWizard />
    </AppShell>
  );
}
