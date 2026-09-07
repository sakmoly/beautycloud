"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { completeTelrReturn, getPaymentStatus } from "@/lib/api/browser-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/states";

function PaymentReturnContent() {
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
              result === "cancelled"
                ? "Payment was cancelled."
                : "Payment was declined.",
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

    verify();
  }, [orderRef, paymentName, result]);

  if (busy) {
    return (
      <LoadingState
        title="Verifying payment"
        description="Please wait while we confirm your payment with Telr."
      />
    );
  }

  if (error) {
    return (
      <Card title="Payment not completed" elevated>
        <p className="text-sm text-[color:var(--bc-muted)]">{error}</p>
        <div className="mt-6 flex gap-3">
          <Link href="/book">
            <Button>Back to booking</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card title={confirmed ? "Payment successful" : "Payment pending"} elevated>
      {confirmed ? (
        <div>
          <p className="text-sm text-[color:var(--bc-muted)]">
            Your appointment is confirmed.
          </p>
          <p className="mt-2 text-2xl font-bold">{appointment || "—"}</p>
        </div>
      ) : (
        <p className="text-sm text-[color:var(--bc-muted)]">
          We could not confirm payment yet. Please contact the salon if you were charged.
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/book/appointments">
          <Button variant="secondary">My appointments</Button>
        </Link>
        <Link href="/book">
          <Button variant="ghost">Book another</Button>
        </Link>
      </div>
    </Card>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <LoadingState
          title="Loading"
          description="Preparing payment confirmation"
        />
      }
    >
      <PaymentReturnContent />
    </Suspense>
  );
}
