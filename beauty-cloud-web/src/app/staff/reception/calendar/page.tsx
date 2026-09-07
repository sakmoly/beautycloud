import { ReceptionCalendarView } from "@/components/reception/reception-calendar";
import { StaffShell } from "@/components/layout/staff-shell";
import { requireStaffSession } from "@/lib/auth/staff-guard";
import { getPublicBootstrap } from "@/lib/frappe/bootstrap";

export const metadata = { title: "Calendar" };

export default async function ReceptionCalendarPage() {
  const [bootstrap, session] = await Promise.all([
    getPublicBootstrap(),
    requireStaffSession(),
  ]);

  return (
    <StaffShell bootstrap={bootstrap} session={session}>
      <h2 className="mb-6 text-2xl font-semibold">Calendar</h2>
      <ReceptionCalendarView />
    </StaffShell>
  );
}
