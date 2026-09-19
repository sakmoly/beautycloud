import { redirect } from "next/navigation";

import { frappeCall } from "@/lib/frappe/client";
import { getPublicBootstrap } from "@/lib/frappe/bootstrap";
import { getStaffSession } from "@/lib/session/staff";
import type { PublicBootstrap, StaffSession, StaffWorkflowCapabilities } from "@/lib/frappe/types";
import { isStaffManager, staffHomeHref } from "@/lib/staff-nav";

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
      const workflow = await getStaffWorkflow(session);
      if (isStaffManager(workflow)) {
        redirect("/staff/setup");
      }
    }
  }

  return session;
}

export async function getStaffWorkflow(session: StaffSession): Promise<StaffWorkflowCapabilities | undefined> {
  const bootstrap = await getPublicBootstrap(undefined, undefined, session.sid);
  return bootstrap.staff_workflow;
}

export async function getStaffBootstrap(session: StaffSession): Promise<PublicBootstrap> {
  return getPublicBootstrap(undefined, undefined, session.sid);
}

export async function requireManagerSession(options?: {
  allowIncompleteSetup?: boolean;
}): Promise<{ session: StaffSession; bootstrap: PublicBootstrap }> {
  const session = await requireStaffSession(options);
  const bootstrap = await getStaffBootstrap(session);
  if (!isStaffManager(bootstrap.staff_workflow)) {
    redirect(staffHomeHref(bootstrap.staff_workflow));
  }
  return { session, bootstrap };
}
