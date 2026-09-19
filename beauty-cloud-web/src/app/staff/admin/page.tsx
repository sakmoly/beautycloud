import { AdminBrandingView } from "@/components/admin/admin-branding";
import { StaffShell } from "@/components/layout/staff-shell";
import { requireManagerSession } from "@/lib/auth/staff-guard";
import { getFrappeConfig } from "@/lib/config";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const [{ bootstrap, session }, frappe] = await Promise.all([
    requireManagerSession(),
    Promise.resolve(getFrappeConfig()),
  ]);

  return (
    <StaffShell bootstrap={bootstrap} session={session}>
      <h2 className="mb-2 text-2xl font-semibold">Admin</h2>
      <p className="mb-6 text-sm text-[color:var(--bc-muted)]">
        Branding, subscription, features, and shortcuts to ERPNext Desk.
      </p>
      <AdminBrandingView bootstrap={bootstrap} frappeBaseUrl={frappe.baseUrl} />
    </StaffShell>
  );
}
