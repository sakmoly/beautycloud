import { NextResponse } from "next/server";

import { frappeCall } from "@/lib/frappe/client";
import { toClientError } from "@/lib/frappe/errors";
import { getStaffSession } from "@/lib/session/staff";

interface MethodRequestBody {
  method?: string;
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: Record<string, unknown>;
  guest?: boolean;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as MethodRequestBody;
    if (!payload.method) {
      return NextResponse.json({ error: "method is required" }, { status: 400 });
    }

    let sid: string | undefined;
    if (!payload.guest) {
      const session = await getStaffSession();
      if (!session) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
      sid = session.sid;
    }

    const result = await frappeCall(payload.method, {
      params: payload.params,
      body: payload.body,
      sid,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    const clientError = toClientError(error);
    return NextResponse.json(clientError, { status: clientError.status });
  }
}
