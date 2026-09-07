import { NextResponse } from "next/server";

import { frappeCall } from "@/lib/frappe/client";
import { toClientError } from "@/lib/frappe/errors";
import { getCustomerSession } from "@/lib/session/customer";

function sessionContactParams(session: {
  mobile?: string;
  email?: string;
}) {
  return {
    mobile: session.mobile,
    email: session.email,
  };
}

export async function GET() {
  try {
    const session = await getCustomerSession();
    if (!session?.mobile && !session?.email) {
      return NextResponse.json(
        { error: "Verify your mobile or email to view appointments" },
        { status: 401 },
      );
    }

    const result = await frappeCall("beauty_cloud.api.booking.get_my_appointments", {
      params: sessionContactParams(session),
    });

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

    const session = await getCustomerSession();

    if (action === "create") {
      const bookingBody = { ...body };
      delete bookingBody.action;

      if (session?.verification_token && !bookingBody.verification_token) {
        bookingBody.verification_token = session.verification_token;
      }
      if (session?.mobile && !bookingBody.mobile) {
        bookingBody.mobile = session.mobile;
      }
      if (session?.email && !bookingBody.email) {
        bookingBody.email = session.email;
      }

      const result = await frappeCall(
        "beauty_cloud.api.booking.create_online_booking",
        { body: bookingBody },
      );
      return NextResponse.json({ data: result });
    }

    if (action === "reschedule") {
      const result = await frappeCall(
        "beauty_cloud.api.booking.reschedule_online_booking",
        {
          body: {
            name: body.name,
            start_time: body.start_time,
            employee: body.employee,
          },
        },
      );
      return NextResponse.json({ data: result });
    }

    if (action === "cancel") {
      const result = await frappeCall(
        "beauty_cloud.api.booking.cancel_online_booking",
        {
          body: { name: body.name, reason: body.reason },
        },
      );
      return NextResponse.json({ data: result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const clientError = toClientError(error);
    return NextResponse.json(clientError, { status: clientError.status });
  }
}
