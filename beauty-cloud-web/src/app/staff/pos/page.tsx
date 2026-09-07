import { Suspense } from "react";

import { PosWorkspace } from "@/components/pos/pos-workspace";
import { StaffShell } from "@/components/layout/staff-shell";
import { requireStaffSession } from "@/lib/auth/staff-guard";
import { getPublicBootstrap } from "@/lib/frappe/bootstrap";
import { LoadingState } from "@/components/ui/states";

export const metadata = { title: "POS" };

export default async function PosPage() {
  const [bootstrap, session] = await Promise.all([
    getPublicBootstrap(),
    requireStaffSession(),
  ]);

  return (
    <StaffShell bootstrap={bootstrap} session={session} wide compact>
      <Suspense fallback={<LoadingState title="Loading POS" description="Opening checkout" />}>
        <PosWorkspace />
      </Suspense>
    </StaffShell>
  );
}
