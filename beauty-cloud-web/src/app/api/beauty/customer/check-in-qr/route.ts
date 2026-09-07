import { NextResponse } from "next/server";

import { frappeCall } from "@/lib/frappe/client";
import { toClientError } from "@/lib/frappe/errors";
import { getCustomerSession } from "@/lib/session/customer";

export async function GET(request: Request) {
  try {
    const session = await getCustomerSession();
    if (!session?.mobile && !session?.email) {
      return NextResponse.json(
        { error: "Verify your mobile or email first" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const appointment = searchParams.get("appointment");
    if (!appointment) {
      return NextResponse.json({ error: "appointment is required" }, { status: 400 });
    }

    const result = await frappeCall("beauty_cloud.api.booking.get_customer_check_in_qr", {
      params: {
        name: appointment,
        mobile: session.mobile,
        email: session.email,
      },
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    const clientError = toClientError(error);
    return NextResponse.json(clientError, { status: clientError.status });
  }
}
