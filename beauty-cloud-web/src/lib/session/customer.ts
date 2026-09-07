import { cookies } from "next/headers";

import { getSessionCookieSecure } from "@/lib/config";
import { openPayload, sealPayload } from "@/lib/session/crypto";
import type { CustomerSession } from "@/lib/frappe/types";

const COOKIE_NAME = "bc_customer_session";

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = openPayload<CustomerSession>(token);
  if (!session) return null;

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    return null;
  }

  return session;
}

export async function setCustomerSession(session: CustomerSession) {
  const store = await cookies();
  store.set(COOKIE_NAME, sealPayload(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: getSessionCookieSecure(),
    path: "/",
    maxAge: 60 * 30,
  });
}

export async function clearCustomerSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
