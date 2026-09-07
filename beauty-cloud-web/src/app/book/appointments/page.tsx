import Link from "next/link";

import { MyAppointmentsList } from "@/components/booking/my-appointments";
import { AppShell } from "@/components/layout/app-shell";
import { getPublicBootstrap } from "@/lib/frappe/bootstrap";

export const metadata = { title: "My appointments" };

export default async function MyAppointmentsPage() {
  const bootstrap = await getPublicBootstrap();

  return (
    <AppShell bootstrap={bootstrap}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">My appointments</h2>
        <Link
          href="/book"
          className="text-sm font-medium text-[color:var(--bc-primary)] hover:underline"
        >
          ← Book new
        </Link>
      </div>
      <MyAppointmentsList />
    </AppShell>
  );
}
