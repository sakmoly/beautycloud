import { KioskView } from "@/components/kiosk/kiosk-view";
import { AppShell } from "@/components/layout/app-shell";
import { getPublicBootstrap } from "@/lib/frappe/bootstrap";

export const metadata = { title: "Kiosk" };

export default async function KioskPage() {
  const bootstrap = await getPublicBootstrap();
  const salon =
    bootstrap.company_display_name ?? bootstrap.company ?? "Your salon";

  return (
    <AppShell bootstrap={bootstrap}>
      <div className="mb-8 text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--bc-primary)]">
          Self-service
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          {salon} Kiosk
        </h2>
        <p className="mt-2 text-base text-[color:var(--bc-muted)]">
          Walk in, pick a service, and get your queue number — no login required.
        </p>
      </div>
      <KioskView />
    </AppShell>
  );
}
