import { NextResponse } from "next/server";

import { frappeCall } from "@/lib/frappe/client";
import { toClientError } from "@/lib/frappe/errors";
import { setCustomerSession } from "@/lib/session/customer";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: "request" | "verify";
      mobile?: string;
      email?: string;
      channel?: string;
      purpose?: string;
      otp?: string;
      request_id?: string;
    };

    if (!body.mobile?.trim() && !body.email?.trim()) {
      return NextResponse.json(
        { error: "mobile or email is required" },
        { status: 400 },
      );
    }

    if (body.action === "request" || !body.action) {
      const result = await frappeCall<{
        request_id?: string;
        dev_otp?: string;
        message?: string;
        channel?: string;
      }>("beauty_cloud.api.otp.request_customer_otp", {
        body: {
          mobile: body.mobile?.trim() || undefined,
          email: body.email?.trim() || undefined,
          purpose: body.purpose ?? "Booking",
          channel: body.channel,
        },
      });

      return NextResponse.json(result);
    }

    if (body.action === "verify") {
      if (!body.otp) {
        return NextResponse.json({ error: "otp is required" }, { status: 400 });
      }

      const result = await frappeCall<{
        verification_token: string;
        mobile?: string;
        email?: string;
      }>("beauty_cloud.api.otp.verify_customer_otp", {
        body: {
          mobile: body.mobile?.trim() || undefined,
          email: body.email?.trim() || undefined,
          otp: body.otp,
          request_id: body.request_id,
        },
      });

      const verifiedAt = new Date();
      const expiresAt = new Date(verifiedAt.getTime() + 30 * 60 * 1000);

      await setCustomerSession({
        mobile: result.mobile ?? body.mobile?.trim(),
        email: result.email ?? body.email?.trim(),
        verification_token: result.verification_token,
        verified_at: verifiedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      });

      return NextResponse.json({
        verified: true,
        mobile: result.mobile ?? body.mobile?.trim(),
        email: result.email ?? body.email?.trim(),
        expires_at: expiresAt.toISOString(),
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const clientError = toClientError(error);
    return NextResponse.json(clientError, { status: clientError.status });
  }
}
