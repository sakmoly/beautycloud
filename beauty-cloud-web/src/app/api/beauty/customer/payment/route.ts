import { NextResponse } from "next/server";

import { frappeCall } from "@/lib/frappe/client";
import { toClientError } from "@/lib/frappe/errors";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentName = searchParams.get("payment_name");

    if (!paymentName) {
      return NextResponse.json({ error: "payment_name is required" }, { status: 400 });
    }

    const result = await frappeCall(
      "beauty_cloud.api.payment.get_booking_payment_status",
      { params: { payment_name: paymentName } },
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    const clientError = toClientError(error);
    return NextResponse.json(clientError, { status: clientError.status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = body.action as string | undefined;

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    if (action === "initiate") {
      const result = await frappeCall("beauty_cloud.api.payment.initiate_payment", {
        body: { appointment: body.appointment },
      });
      return NextResponse.json({ data: result });
    }

    if (action === "demo_complete") {
      const result = await frappeCall(
        "beauty_cloud.api.payment.complete_demo_payment_session",
        {
          body: {
            payment_name: body.payment_name,
            demo_token: body.demo_token,
          },
        },
      );
      return NextResponse.json({ data: result });
    }

    if (action === "telr_return") {
      const result = await frappeCall("beauty_cloud.api.payment.telr_return", {
        body: { order_ref: body.order_ref },
      });
      return NextResponse.json({ data: result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const clientError = toClientError(error);
    return NextResponse.json(clientError, { status: clientError.status });
  }
}
