import { cookies } from "next/headers";

import { getSessionCookieSecure } from "@/lib/config";
import { openPayload, sealPayload } from "@/lib/session/crypto";
import type { StaffSession } from "@/lib/frappe/types";

const COOKIE_NAME = "bc_staff_session";

export async function getStaffSession(): Promise<StaffSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return openPayload<StaffSession>(token);
}

export async function setStaffSession(session: StaffSession) {
  const store = await cookies();
  store.set(COOKIE_NAME, sealPayload(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: getSessionCookieSecure(),
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearStaffSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
