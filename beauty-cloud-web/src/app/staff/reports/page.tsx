import { ManagementReportsView } from "@/components/reports/management-reports";
import { StaffShell } from "@/components/layout/staff-shell";
import { requireStaffSession } from "@/lib/auth/staff-guard";
import { getPublicBootstrap } from "@/lib/frappe/bootstrap";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const [bootstrap, session] = await Promise.all([
    getPublicBootstrap(),
    requireStaffSession(),
  ]);

  return (
    <StaffShell bootstrap={bootstrap} session={session}>
      <h2 className="mb-6 text-2xl font-semibold">Management reports</h2>
      <ManagementReportsView />
    </StaffShell>
  );
}
