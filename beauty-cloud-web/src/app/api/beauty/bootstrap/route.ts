import { NextResponse } from "next/server";

import { getPublicBootstrap } from "@/lib/frappe/bootstrap";
import { toClientError } from "@/lib/frappe/errors";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get("company") ?? undefined;
    const branch = searchParams.get("branch") ?? undefined;
    const bootstrap = await getPublicBootstrap(company, branch);
    return NextResponse.json(bootstrap);
  } catch (error) {
    const clientError = toClientError(error);
    return NextResponse.json(clientError, { status: clientError.status });
  }
}
