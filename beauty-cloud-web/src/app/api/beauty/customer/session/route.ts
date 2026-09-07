import { NextResponse } from "next/server";

import {
  clearCustomerSession,
  getCustomerSession,
  setCustomerSession,
} from "@/lib/session/customer";

export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ verified: false });
  }

  return NextResponse.json({
    verified: true,
    mobile: session.mobile,
    email: session.email,
    expires_at: session.expires_at,
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    mobile?: string;
    email?: string;
    verification_token?: string;
    ttl_minutes?: number;
  };

  if (!body.verification_token || (!body.mobile?.trim() && !body.email?.trim())) {
    return NextResponse.json(
      { error: "verification_token and mobile or email are required" },
      { status: 400 },
    );
  }

  const ttlMinutes = body.ttl_minutes ?? 30;
  const verifiedAt = new Date();
  const expiresAt = new Date(verifiedAt.getTime() + ttlMinutes * 60 * 1000);

  await setCustomerSession({
    mobile: body.mobile?.trim(),
    email: body.email?.trim(),
    verification_token: body.verification_token,
    verified_at: verifiedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
  });

  return NextResponse.json({
    verified: true,
    mobile: body.mobile?.trim(),
    email: body.email?.trim(),
    expires_at: expiresAt.toISOString(),
  });
}

export async function DELETE() {
  await clearCustomerSession();
  return NextResponse.json({ verified: false });
}
