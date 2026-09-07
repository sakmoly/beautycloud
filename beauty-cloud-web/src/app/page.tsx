import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { ErrorState } from "@/components/ui/states";
import { getPublicBootstrap } from "@/lib/frappe/bootstrap";
import { withBasePath } from "@/lib/base-path";

const CUSTOMER_LINKS = [
  { href: "/book", title: "Book appointment", desc: "Services, slots, OTP, confirm" },
  { href: "/book/appointments", title: "My appointments", desc: "Look up by mobile" },
  { href: "/kiosk", title: "Kiosk", desc: "Self-service device booking" },
];

const STAFF_LINKS = [
  { href: "/staff/reception", title: "Reception", desc: "Dashboard, walk-in, queue" },
  { href: "/staff/reception/calendar", title: "Calendar", desc: "Daily, weekly & monthly views" },
  { href: "/staff/beautician", title: "Beautician", desc: "Tablet schedule & consultation" },
  { href: "/staff/inventory", title: "Inventory", desc: "Branch stock & assignments" },
  { href: "/staff/pos", title: "POS", desc: "Validate & checkout" },
  { href: "/staff/commission", title: "Commission", desc: "Reports" },
  { href: "/staff/loyalty", title: "Loyalty", desc: "Packages, wallet, gift cards" },
  { href: "/staff/reports", title: "Reports", desc: "Management dashboards" },
  { href: "/staff/admin", title: "Admin", desc: "Branding & tenant" },
];

function FeaturePill({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        enabled
          ? "bg-[color:var(--bc-success)]/10 text-[color:var(--bc-success)]"
          : "bg-[color:var(--bc-muted)]/10 text-[color:var(--bc-muted)]"
      }`}
    >
      {label}
    </span>
  );
}

export default async function HomePage() {
  try {
    const bootstrap = await getPublicBootstrap();
    const features = bootstrap.features ?? {};

    return (
      <AppShell bootstrap={bootstrap}>
        <section className="rounded-[var(--bc-radius)] border border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[color:var(--bc-primary)]">
            {bootstrap.application_title}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            {bootstrap.company_display_name ?? bootstrap.company}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--bc-muted)]">
            Customer booking, staff reception, beautician tablet, POS, inventory,
            loyalty, kiosk, and management reports — all connected to{" "}
            <code className="rounded bg-black/5 px-1.5 py-0.5 text-sm">site.beautycloud</code>.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/book"
              className="inline-flex min-h-11 items-center rounded-full bg-[color:var(--bc-primary)] px-5 text-sm font-medium text-white"
            >
              Book now
            </Link>
            <Link
              href="/staff/login"
              className="inline-flex min-h-11 items-center rounded-full border border-[color:var(--bc-border)] px-5 text-sm font-medium"
            >
              Staff login
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-lg font-semibold">Customer</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {CUSTOMER_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-[var(--bc-radius)] border border-[color:var(--bc-border)] bg-white p-4 hover:border-[color:var(--bc-primary)]/40"
                >
                  <p className="font-medium">{link.title}</p>
                  <p className="mt-1 text-sm text-[color:var(--bc-muted)]">{link.desc}</p>
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-lg font-semibold">Staff (login required)</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {STAFF_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-[var(--bc-radius)] border border-[color:var(--bc-border)] bg-white p-4 hover:border-[color:var(--bc-primary)]/40"
                >
                  <p className="font-medium">{link.title}</p>
                  <p className="mt-1 text-sm text-[color:var(--bc-muted)]">{link.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[var(--bc-radius)] border border-[color:var(--bc-border)] bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Plan features</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(features).map(([key, enabled]) => (
              <FeaturePill key={key} label={key.replaceAll("_", " ")} enabled={Boolean(enabled)} />
            ))}
          </div>
        </section>
      </AppShell>
    );
  } catch (error) {
    return (
      <main className="mx-auto flex min-h-full w-full max-w-3xl items-center px-4 py-16">
        <ErrorState
          title="Could not load Beauty Cloud bootstrap"
          description={
            error instanceof Error
              ? error.message
              : "Check FRAPPE_* env vars and that site.beautycloud is reachable."
          }
          action={
            <a
              href={withBasePath("/api/beauty/bootstrap")}
              className="rounded-full bg-[color:var(--bc-primary)] px-4 py-2 text-sm font-medium text-white"
            >
              Try BFF bootstrap route
            </a>
          }
        />
      </main>
    );
  }
}
