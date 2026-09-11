import { KioskShell } from "@/components/kiosk/kiosk-shell";
import { KioskView } from "@/components/kiosk/kiosk-view";
import { getPublicBootstrap } from "@/lib/frappe/bootstrap";

export const metadata = { title: "Kiosk" };

export default async function KioskPage() {
  const bootstrap = await getPublicBootstrap();
  const salon = bootstrap.company_display_name ?? bootstrap.company ?? "Your salon";

  return (
    <KioskShell salonName={`${salon} Kiosk`}>
      <KioskView />
    </KioskShell>
  );
}
