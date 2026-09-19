import { redirect } from "next/navigation";

import { getStaffBootstrap } from "@/lib/auth/staff-guard";
import { getStaffSession } from "@/lib/session/staff";
import { staffHomeHref } from "@/lib/staff-nav";

export default async function StaffIndexPage() {
  const session = await getStaffSession();
  if (!session) {
    redirect("/staff/login");
  }
  const bootstrap = await getStaffBootstrap(session);
  redirect(staffHomeHref(bootstrap.staff_workflow));
}
