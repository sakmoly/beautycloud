import { KioskShell } from "@/components/kiosk/kiosk-shell";
import { KioskView } from "@/components/kiosk/kiosk-view";
import { getPublicBootstrap } from "@/lib/frappe/bootstrap";
import { withBasePath } from "@/lib/base-path";
import { DEFAULT_BRAND_LOGO } from "@/lib/theme/brand-palette";

export const metadata = { title: "Kiosk" };

export default async function KioskPage() {
  const bootstrap = await getPublicBootstrap();
  const branding = bootstrap.branding;
  const salon = bootstrap.company_display_name ?? bootstrap.company ?? "Your salon";
  const logoUrl =
    branding?.logo_light ?? branding?.logo_dark ?? withBasePath(DEFAULT_BRAND_LOGO);

  return (
    <KioskShell salonName={`${salon} Kiosk`} logoUrl={logoUrl}>
      <KioskView />
    </KioskShell>
  );
}
