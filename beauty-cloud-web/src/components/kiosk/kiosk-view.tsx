"use client";

import { useCallback, useEffect, useState } from "react";

import { callBeautyMethod, kioskBootstrap } from "@/lib/api/browser-client";
import type { BeautyService } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { ErrorState, LoadingState } from "@/components/ui/states";

const DEVICE_ID =
  process.env.NEXT_PUBLIC_KIOSK_DEVICE_ID ?? "KIOSK-MAIN";
const API_KEY =
  process.env.NEXT_PUBLIC_KIOSK_API_KEY ?? "demo-kiosk-key-2026";

interface KioskBootstrap {
  device?: { device_name?: string; beauty_branch?: string };
  company?: string;
  beauty_branch?: string;
  services?: BeautyService[];
  salon_payment?: { require_payment_at_kiosk?: boolean; require_payment_before_service?: boolean };
  payment_methods?: string[];
}

type Step = "services" | "details" | "payment" | "done";

function serviceIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("hair") || n.includes("cut")) return "✂️";
  if (n.includes("facial")) return "✨";
  if (n.includes("mani") || n.includes("pedi")) return "💅";
  if (n.includes("blow")) return "💨";
  return "💆";
}

export function KioskView() {
  const [step, setStep] = useState<Step>("services");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bootstrap, setBootstrap] = useState<KioskBootstrap | null>(null);
  const [selectedService, setSelectedService] = useState<string>("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [bookingRef, setBookingRef] = useState<string>("");
  const [bookingTime, setBookingTime] = useState<string>("");
  const [bookingAmount, setBookingAmount] = useState<number>(0);

  const loadBootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await kioskBootstrap(DEVICE_ID, API_KEY)) as KioskBootstrap;
      setBootstrap(data);
      if (data.services?.[0]) {
        setSelectedService(data.services[0].name);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not connect to kiosk. Check device credentials.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBootstrap();
  }, [loadBootstrap]);

  const selectedServiceDetails = bootstrap?.services?.find(
    (s) => s.name === selectedService,
  );

  async function submitBooking() {
    if (!selectedService || !name.trim() || !mobile.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = (await callBeautyMethod<{
        name?: string;
        total_amount?: number;
        scheduled_start?: string;
        services?: Array<{ start_time?: string }>;
      }>({
        method: "beauty_cloud.api.kiosk.book",
        guest: true,
        body: {
          device_id: DEVICE_ID,
          api_key: API_KEY,
          services: [selectedService],
          customer_name: name.trim(),
          mobile: mobile.trim(),
        },
      })) as {
        name?: string;
        total_amount?: number;
        scheduled_start?: string;
        services?: Array<{ start_time?: string }>;
      };

      const start =
        result.scheduled_start ??
        result.services?.[0]?.start_time ??
        "";
      setBookingRef(result.name ?? "—");
      setBookingTime(start ? start.slice(11, 16) : "");
      setBookingAmount(Number(result.total_amount ?? selectedServiceDetails?.standard_selling_price ?? 0));

      if (bootstrap?.salon_payment?.require_payment_at_kiosk) {
        setStep("payment");
      } else {
        setStep("done");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  }

  async function payAtKiosk() {
    if (!bookingRef) return;
    setBusy(true);
    setError(null);
    try {
      await callBeautyMethod({
        method: "beauty_cloud.api.kiosk.collect_payment",
        guest: true,
        params: {
          device_id: DEVICE_ID,
          api_key: API_KEY,
          appointment: bookingRef,
          mode_of_payment: "Cash",
        },
      });
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    setStep("services");
    setName("");
    setMobile("");
    setBookingRef("");
    setBookingTime("");
    setBookingAmount(0);
    setError(null);
  }

  if (loading) {
    return (
      <LoadingState
        title="Starting kiosk"
        description="Loading services for this device"
      />
    );
  }

  if (error && !bootstrap) {
    return (
      <ErrorState
        title="Kiosk unavailable"
        description={error}
        action={
          <Button variant="secondary" onClick={loadBootstrap}>
            Try again
          </Button>
        }
      />
    );
  }

  const salonName = bootstrap?.company ?? "Salon";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {step === "services" ? (
        <Card
          title="What would you like today?"
          description={`Welcome to ${salonName}. Tap a service to continue.`}
          elevated
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {(bootstrap?.services ?? []).map((service) => {
              const active = selectedService === service.name;
              return (
                <button
                  key={service.name}
                  type="button"
                  onClick={() => setSelectedService(service.name)}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-[color:var(--bc-primary)] bg-gradient-to-br from-[color:var(--bc-primary)]/8 to-[color:var(--bc-accent)]/10 ring-2 ring-[color:var(--bc-primary)]/20 shadow-md"
                      : "border-[color:var(--bc-border)] bg-white hover:border-[color:var(--bc-primary)]/35"
                  }`}
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${
                      active
                        ? "bg-[color:var(--bc-primary)] text-white"
                        : "bg-[color:var(--bc-background)]"
                    }`}
                  >
                    {serviceIcon(service.service_name ?? "")}
                  </span>
                  <span>
                    <span className="block font-semibold">{service.service_name}</span>
                    <span className="mt-1 flex flex-wrap gap-2 text-xs text-[color:var(--bc-muted)]">
                      <span className="rounded-full bg-black/5 px-2 py-0.5">
                        {service.default_duration} min
                      </span>
                      <span className="font-semibold text-[color:var(--bc-primary)]">
                        SAR {service.standard_selling_price}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <Button
            className="mt-6 w-full sm:w-auto"
            disabled={!selectedService}
            onClick={() => setStep("details")}
          >
            Continue →
          </Button>
        </Card>
      ) : null}

      {step === "details" ? (
        <Card
          title="Your details"
          description={
            selectedServiceDetails
              ? `Booking ${selectedServiceDetails.service_name} — we'll find the next available slot.`
              : "Enter your details to complete the booking."
          }
          elevated
        >
          {error ? (
            <p className="mb-4 rounded-xl bg-[color:var(--bc-danger)]/10 px-4 py-3 text-sm text-[color:var(--bc-danger)]">
              {error}
            </p>
          ) : null}
          <div className="space-y-4">
            <div>
              <Label htmlFor="kiosk-name">Full name</Label>
              <Input
                id="kiosk-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
            <div>
              <Label htmlFor="kiosk-mobile">Mobile number</Label>
              <Input
                id="kiosk-mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+966 5XX XXX XXXX"
                autoComplete="tel"
                inputMode="tel"
              />
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                onClick={submitBooking}
                disabled={busy || !name.trim() || !mobile.trim()}
                className="min-w-[160px] flex-1 sm:flex-none"
              >
                {busy ? "Booking…" : "Confirm booking"}
              </Button>
              <Button variant="ghost" onClick={() => setStep("services")}>
                ← Back
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {step === "payment" ? (
        <Card
          title="Payment"
          description="Please pay now to confirm your appointment."
          elevated
        >
          {error ? (
            <p className="mb-4 rounded-xl bg-[color:var(--bc-danger)]/10 px-4 py-3 text-sm text-[color:var(--bc-danger)]">
              {error}
            </p>
          ) : null}
          <p className="text-3xl font-bold text-[color:var(--bc-primary)]">
            SAR {bookingAmount.toLocaleString()}
          </p>
          <p className="mt-2 text-sm text-[color:var(--bc-muted)]">
            {selectedServiceDetails?.service_name} · Ref {bookingRef}
          </p>
          <Button className="mt-6 w-full" onClick={payAtKiosk} disabled={busy}>
            {busy ? "Processing…" : "Pay with Cash"}
          </Button>
        </Card>
      ) : null}

      {step === "done" ? (
        <Card elevated>
          <div className="flex flex-col items-center py-4 text-center">
            <span className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[color:var(--bc-success)]/10 text-4xl text-[color:var(--bc-success)]">
              ✓
            </span>
            <h3 className="text-2xl font-bold tracking-tight">You&apos;re booked!</h3>
            <p className="mt-2 text-[color:var(--bc-muted)]">
              {selectedServiceDetails?.service_name}
              {bookingTime ? ` · ${bookingTime}` : ""}
            </p>
            <div className="mt-6 rounded-2xl bg-[color:var(--bc-background)] px-8 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--bc-muted)]">
                Reference
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-[color:var(--bc-primary)]">
                {bookingRef}
              </p>
            </div>
            <p className="mt-4 max-w-sm text-sm text-[color:var(--bc-muted)]">
              {bootstrap?.salon_payment?.require_payment_at_kiosk
                ? "Payment received. Please take a seat — our team will call you shortly."
                : "Please take a seat — reception will collect payment before your service starts."}
            </p>
            <Button className="mt-8 min-w-[200px]" onClick={startOver}>
              New booking
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
