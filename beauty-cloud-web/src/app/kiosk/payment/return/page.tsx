"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { KioskShell } from "@/components/kiosk/kiosk-shell";
import { completeTelrReturn, getPaymentStatus } from "@/lib/api/browser-client";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/states";
import { withBasePath } from "@/lib/base-path";

function KioskPaymentReturnContent() {
  const searchParams = useSearchParams();
  const paymentName = searchParams.get("payment") ?? "";
  const orderRef = searchParams.get("order_ref") ?? searchParams.get("ref") ?? "";
  const result = searchParams.get("result");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [appointment, setAppointment] = useState<string>("");

  useEffect(() => {
    async function verify() {
      try {
        if (orderRef) {
          const data = await completeTelrReturn(orderRef);
          setConfirmed(Boolean(data.confirmed));
          setAppointment(data.appointment ?? "");
          return;
        }

        if (paymentName) {
          const data = await getPaymentStatus(paymentName);
          setConfirmed(Boolean(data.confirmed));
          setAppointment(data.appointment ?? "");
          if (result === "failed" || result === "cancelled") {
            setError(
              result === "cancelled" ? "Payment was cancelled." : "Payment was declined.",
            );
          }
          return;
        }

        setError("Missing payment reference.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not verify payment");
      } finally {
        setBusy(false);
      }
    }

    void verify();
  }, [orderRef, paymentName, result]);

  if (busy) {
    return (
      <LoadingState
        title="Verifying payment"
        description="Please wait while we confirm your card payment with Telr."
      />
    );
  }

  if (error) {
    return (
      <div className="bc-kiosk-step mx-auto w-full max-w-3xl">
        <div className="bc-kiosk-panel">
          <h2 className="bc-kiosk-panel-title">Payment not completed</h2>
          <p className="bc-kiosk-panel-sub">{error}</p>
          <Link href={withBasePath("/kiosk")}>
            <Button className="bc-kiosk-primary-btn mt-6">Back to kiosk</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bc-kiosk-step mx-auto w-full max-w-3xl">
      <div className="bc-kiosk-panel bc-kiosk-panel-center">
        <span className="bc-kiosk-success-icon">{confirmed ? "✓" : "…"}</span>
        <h2 className="bc-kiosk-panel-title">
          {confirmed ? "Payment successful" : "Payment pending"}
        </h2>
        {confirmed ? (
          <>
            <p className="bc-kiosk-panel-sub">Your appointment is confirmed.</p>
            <div className="bc-kiosk-ref-box">
              <p className="bc-kiosk-ref-label">Reference</p>
              <p className="bc-kiosk-ref-value">{appointment || "—"}</p>
            </div>
          </>
        ) : (
          <p className="bc-kiosk-panel-sub max-w-lg">
            We could not confirm payment yet. Please ask reception for help if you were charged.
          </p>
        )}
        <Link href={withBasePath("/kiosk")}>
          <Button className="bc-kiosk-primary-btn mt-8 min-w-[240px]">New booking</Button>
        </Link>
      </div>
    </div>
  );
}

export default function KioskPaymentReturnPage() {
  return (
    <KioskShell salonName="Bahyea Beauty Kiosk">
      <Suspense
        fallback={
          <LoadingState title="Loading" description="Preparing payment confirmation" />
        }
      >
        <KioskPaymentReturnContent />
      </Suspense>
    </KioskShell>
  );
}
