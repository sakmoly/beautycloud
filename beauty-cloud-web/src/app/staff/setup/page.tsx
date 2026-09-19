import { SetupWizard } from "@/components/setup/setup-wizard";
import { StaffShell } from "@/components/layout/staff-shell";
import { requireManagerSession } from "@/lib/auth/staff-guard";
import { getFrappeConfig } from "@/lib/config";

export const metadata = { title: "Salon setup" };

export default async function SetupPage() {
  const [{ bootstrap, session }, frappe] = await Promise.all([
    requireManagerSession({ allowIncompleteSetup: true }),
    Promise.resolve(getFrappeConfig()),
  ]);

  return (
    <StaffShell bootstrap={bootstrap} session={session}>
      <h2 className="mb-2 text-2xl font-semibold">Salon setup wizard</h2>
      <p className="mb-6 text-sm text-[color:var(--bc-muted)]">
        Configure your salon company, branches, services, and team on this site. To open another location,
        add a new branch here — same site, same company.
      </p>
      <SetupWizard frappeBaseUrl={frappe.baseUrl} />
    </StaffShell>
  );
}
