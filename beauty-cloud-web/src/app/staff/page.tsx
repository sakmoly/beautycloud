import { redirect } from "next/navigation";

import { getStaffSession } from "@/lib/session/staff";

export default async function StaffIndexPage() {
  const session = await getStaffSession();
  redirect(session ? "/staff/reception" : "/staff/login");
}
