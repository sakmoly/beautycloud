import { NextResponse } from "next/server";

import { frappeLogin, frappeLogout } from "@/lib/frappe/client";
import { toClientError } from "@/lib/frappe/errors";
import {
  clearStaffSession,
  getStaffSession,
  setStaffSession,
} from "@/lib/session/staff";

export async function GET() {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    user: session.user,
    full_name: session.full_name,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { usr?: string; pwd?: string };
    if (!body.usr || !body.pwd) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 },
      );
    }

    const login = await frappeLogin(body.usr, body.pwd);
    await setStaffSession({
      user: login.user,
      full_name: login.full_name,
      sid: login.sid,
    });

    return NextResponse.json({
      authenticated: true,
      user: login.user,
      full_name: login.full_name,
    });
  } catch (error) {
    const clientError = toClientError(error);
    return NextResponse.json(clientError, { status: clientError.status });
  }
}

export async function DELETE() {
  const session = await getStaffSession();
  if (session?.sid) {
    try {
      await frappeLogout(session.sid);
    } catch {
      // ignore logout failures; clear local session anyway
    }
  }
  await clearStaffSession();
  return NextResponse.json({ authenticated: false });
}
