import { KioskShell } from "@/components/kiosk/kiosk-shell";
import { KioskView } from "@/components/kiosk/kiosk-view";
import { getPublicBootstrap } from "@/lib/frappe/bootstrap";
import { resolveBrandLogo } from "@/lib/theme/branding-assets";

export const metadata = { title: "Kiosk" };

export default async function KioskPage() {
  const bootstrap = await getPublicBootstrap();
  const salon = bootstrap.company_display_name ?? bootstrap.company ?? "Your salon";
  const logoUrl = resolveBrandLogo(bootstrap.branding);

  return (
    <KioskShell salonName={`${salon} Kiosk`} logoUrl={logoUrl}>
      <KioskView />
    </KioskShell>
  );
}
