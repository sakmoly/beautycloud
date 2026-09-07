import type { PosSessionContext } from "@/components/pos/pos-session-types";

export function evaluatePosCheckoutReady(ctx: PosSessionContext, paired: boolean) {
  if (ctx.enforce_business_day && ctx.business_day?.status !== "Open") {
    return { ready: false, reason: "Open a business day before checkout" };
  }
  if (paired || ctx.enforce_register_session) {
    if (ctx.register_session?.status !== "Open") {
      return { ready: false, reason: "Open register session before checkout" };
    }
  }
  return { ready: true, reason: null as string | null };
}
