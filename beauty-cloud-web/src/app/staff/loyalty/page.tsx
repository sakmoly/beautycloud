import { LoyaltyView } from "@/components/loyalty/loyalty-view";
import { StaffShell } from "@/components/layout/staff-shell";
import { requireStaffSession } from "@/lib/auth/staff-guard";
import { getPublicBootstrap } from "@/lib/frappe/bootstrap";

export const metadata = { title: "Loyalty" };

export default async function LoyaltyPage() {
  const [bootstrap, session] = await Promise.all([
    getPublicBootstrap(),
    requireStaffSession(),
  ]);

  return (
    <StaffShell bootstrap={bootstrap} session={session}>
      <h2 className="mb-6 text-2xl font-semibold">Packages & wallet</h2>
      <LoyaltyView />
    </StaffShell>
  );
}
