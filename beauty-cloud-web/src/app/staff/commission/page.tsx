import { CommissionReportView } from "@/components/commission/commission-report";
import { StaffShell } from "@/components/layout/staff-shell";
import { requireStaffSession } from "@/lib/auth/staff-guard";
import { getPublicBootstrap } from "@/lib/frappe/bootstrap";

export const metadata = { title: "Commission" };

export default async function CommissionPage() {
  const [bootstrap, session] = await Promise.all([
    getPublicBootstrap(),
    requireStaffSession(),
  ]);

  return (
    <StaffShell bootstrap={bootstrap} session={session}>
      <h2 className="mb-6 text-2xl font-semibold">Commission</h2>
      <CommissionReportView />
    </StaffShell>
  );
}
