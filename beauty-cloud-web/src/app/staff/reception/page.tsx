import { ReceptionDashboardView } from "@/components/reception/reception-dashboard";
import { StaffShell } from "@/components/layout/staff-shell";
import { requireStaffSession } from "@/lib/auth/staff-guard";
import { getPublicBootstrap } from "@/lib/frappe/bootstrap";

export const metadata = { title: "Reception" };

export default async function ReceptionPage() {
  const [bootstrap, session] = await Promise.all([
    getPublicBootstrap(),
    requireStaffSession(),
  ]);

  return (
    <StaffShell bootstrap={bootstrap} session={session}>
      <h2 className="mb-6 text-2xl font-semibold">Reception dashboard</h2>
      <ReceptionDashboardView />
    </StaffShell>
  );
}
