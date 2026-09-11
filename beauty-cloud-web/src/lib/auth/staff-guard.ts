import { redirect } from "next/navigation";

import { frappeCall } from "@/lib/frappe/client";
import { getStaffSession } from "@/lib/session/staff";
import type { StaffSession } from "@/lib/frappe/types";

export async function requireStaffSession(options?: {
  allowIncompleteSetup?: boolean;
}): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) {
    redirect("/staff/login");
  }

  if (!options?.allowIncompleteSetup) {
    const status = await frappeCall<{ setup_complete?: boolean }>(
      "beauty_cloud.api.setup.get_status",
      { sid: session.sid },
    );
    if (!status.setup_complete) {
      redirect("/staff/setup");
    }
  }

  return session;
}
