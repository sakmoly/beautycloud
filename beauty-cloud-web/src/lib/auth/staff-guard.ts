import { redirect } from "next/navigation";

import { getStaffSession } from "@/lib/session/staff";
import type { StaffSession } from "@/lib/frappe/types";

export async function requireStaffSession(): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) {
    redirect("/staff/login");
  }
  return session;
}
