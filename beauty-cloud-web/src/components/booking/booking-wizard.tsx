"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { BookingStepper } from "@/components/booking/booking-stepper";
import { AppointmentCheckInQr } from "@/components/booking/appointment-check-in-qr";
import {
  completeDemoPayment,
  createBooking,
  fetchBootstrap,
  getBranches,
  getServices,
  getSlots,
  requestCustomerOtp,
  verifyCustomerOtp,
} from "@/lib/api/browser-client";
import type {
  AvailabilitySlot,
  BeautyBranch,
  BeautyService,
  BookingPaymentSession,
} from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { customerInitials } from "@/components/pos/pos-utils";

type Step = "services" | "slots" | "otp" | "confirm" | "payment" | "done";

function BeauticianAvatar({
  name,
  image,
  size = "md",
}: {
  name: string;
  image?: string;
  size?: "sm" | "md" | "lg";
}) {
  const [failed, setFailed] = useState(false);
  const sizeClass =
    size === "lg" ? "h-16 w-16 text-lg" : size === "sm" ? "h-10 w-10 text-xs" : "h-12 w-12 text-sm";

  useEffect(() => {
    setFailed(false);
  }, [image]);

  if (image && !failed) {
    return (
      <img
        src={image}
        alt={name}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${sizeClass} shrink-0 rounded-full border-2 border-white object-cover shadow-sm`}
      />
    );
  }

  return <span className={`bc-avatar shrink-0 ${sizeClass}`}>{customerInitials(name)}</span>;
}

function serviceIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("hair") || n.includes("cut")) return "✂️";
  if (n.includes("facial")) return "✨";
  if (n.includes("mani") || n.includes("pedi")) return "💅";
  if (n.includes("blow")) return "💨";
  return "💆";
}

function formatDateLabel(iso: string) {
  if (!iso) return "—";
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function BookingWizard() {
  const [step, setStep] = useState<Step>("services");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [branches, setBranches] = useState<BeautyBranch[]>([]);
  const [services, setServices] = useState<BeautyService[]>([]);
  const [branch, setBranch] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);

  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [otp, setOtp] = useState("");
  const [requestId, setRequestId] = useState<string>();
  const [devOtp, setDevOtp] = useState<string>();
  const [verified, setVerified] = useState(false);
  const [requirePayment, setRequirePayment] = useState(false);
  const [paymentSession, setPaymentSession] = useState<BookingPaymentSession | null>(
    null,
  );
  const [bookingResult, setBookingResult] = useState<{ name?: string } | null>(
    null,
  );

  useEffect(() => {
    Promise.all([getBranches(), getServices(), fetchBootstrap()])
      .then(([b, s, bootstrap]) => {
        setBranches(b);
        setServices(s);
        setRequirePayment(
          Boolean(bootstrap?.booking_payment?.require_payment_at_booking),
        );
        if (b[0]) setBranch(b[0].name);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setDate(tomorrow.toISOString().slice(0, 10));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const selectedServiceDetails = useMemo(
    () => services.filter((s) => selectedServices.includes(s.name)),
    [services, selectedServices],
  );

  const totalPrice = selectedServiceDetails.reduce(
    (sum, s) => sum + (s.standard_selling_price ?? 0),
    0,
  );

  const totalDuration = selectedServiceDetails.reduce(
    (sum, s) => sum + (s.default_duration ?? 0),
    0,
  );

  const branchLabel =
    branches.find((b) => b.name === branch)?.branch_name ?? branch;

  function toggleService(name: string) {
    setSelectedServices((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name],
    );
  }

  async function loadSlots() {
    if (!branch || !date || selectedServices.length === 0) {
      setError("Select branch, date, and at least one service.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await getSlots({
        beauty_branch: branch,
        appointment_date: date,
        services: selectedServices,
      });
      setSlots(result);
      if (result.length === 0) {
        setError(
          selectedServices.length > 1
            ? "No beautician is available for all selected services on this date. Try fewer services, or pick services that the same stylist offers."
            : "No time slots available for this date. Try another date or branch.",
        );
      }
      setStep("slots");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load slots");
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp() {
    setBusy(true);
    setError(null);
    try {
      const result = await requestCustomerOtp({ mobile, email });
      setRequestId(result.request_id);
      setDevOtp(result.dev_otp);
      setStep("otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OTP request failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirmOtp() {
    setBusy(true);
    setError(null);
    try {
      await verifyCustomerOtp({ mobile, email, otp, request_id: requestId });
      setVerified(true);
      setStep("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid OTP");
    } finally {
      setBusy(false);
    }
  }

  async function submitBooking() {
    if (!selectedSlot) return;
    setBusy(true);
    setError(null);
    try {
      const result = (await createBooking({
        beauty_branch: branch,
        appointment_date: date,
        start_time: selectedSlot.start_time,
        employee: selectedSlot.employee,
        services: selectedServices,
        service_location: "Salon",
        mobile,
        email,
        customer_name: customerName,
        notes: "",
      })) as BookingPaymentSession & { payment?: BookingPaymentSession };

      const payment = result.payment ?? result;
      if (payment.payment_required) {
        setPaymentSession({ ...payment, appointment: payment.appointment ?? result.name });
        setStep("payment");
        return;
      }

      setBookingResult({ name: result.name });
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  }

  async function payWithDemo() {
    if (!paymentSession?.payment_name || !paymentSession.demo_token) return;
    setBusy(true);
    setError(null);
    try {
      const result = (await completeDemoPayment({
        payment_name: paymentSession.payment_name,
        demo_token: paymentSession.demo_token,
      })) as BookingPaymentSession;
      if (!result.confirmed) {
        setError("Demo payment could not be completed.");
        return;
      }
      setBookingResult({ name: result.appointment });
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  function payWithTelr() {
    if (!paymentSession?.payment_url) {
      setError("Telr payment URL is not available.");
      return;
    }
    window.location.href = paymentSession.payment_url;
  }

  if (loading) {
    return (
      <LoadingState
        title="Loading booking"
        description="Fetching branches and services"
      />
    );
  }

  if (error && step === "services" && branches.length === 0) {
    return <ErrorState title="Booking unavailable" description={error} />;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="space-y-6">
        <BookingStepper current={step} requirePayment={requirePayment} />

        {error ? (
          <div
            className="flex gap-3 rounded-xl border border-[color:var(--bc-danger)]/20 bg-[color:var(--bc-danger)]/5 px-4 py-3 text-sm text-[color:var(--bc-danger)]"
            role="alert"
          >
            <span className="text-base" aria-hidden>
              ⚠
            </span>
            <p>{error}</p>
          </div>
        ) : null}

        {step === "services" ? (
          <Card
            title="Choose branch & services"
            description="Select one or more treatments. We'll find a beautician who can perform all of them."
            elevated
          >
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="branch">Branch</Label>
                  <select
                    id="branch"
                    className="min-h-11 w-full rounded-xl border border-[color:var(--bc-border)] bg-white px-3.5 text-sm shadow-sm outline-none focus:border-[color:var(--bc-primary)] focus:ring-4 focus:ring-[color:var(--bc-primary)]/10"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                  >
                    {branches.map((b) => (
                      <option key={b.name} value={b.name}>
                        {b.branch_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="date">Preferred date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-[color:var(--bc-text)]">
                  Services
                  <span className="ml-2 font-normal text-[color:var(--bc-muted)]">
                    tap to select multiple
                  </span>
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {services.map((service) => {
                    const active = selectedServices.includes(service.name);
                    return (
                      <button
                        key={service.name}
                        type="button"
                        onClick={() => toggleService(service.name)}
                        className={`group relative flex items-start gap-3 rounded-[var(--bc-radius-lg)] border p-4 text-left transition ${
                          active
                            ? "border-[color:var(--bc-secondary)] bg-[color:var(--bc-accent-muted)] shadow-md ring-2 ring-[color:var(--bc-secondary)]/15"
                            : "border-[color:var(--bc-border)] bg-white hover:border-[color:var(--bc-accent)] hover:shadow-sm"
                        }`}
                      >
                        <span
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl ${
                            active
                              ? "bg-[color:var(--bc-primary)] text-white"
                              : "bg-[color:var(--bc-beige)] text-[color:var(--bc-text)]"
                          }`}
                        >
                          {serviceIcon(service.service_name ?? "")}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className="font-semibold leading-snug">
                              {service.service_name}
                            </span>
                            {active ? (
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--bc-primary)] text-[10px] text-white">
                                ✓
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[color:var(--bc-muted)]">
                            <span className="rounded-full bg-black/5 px-2 py-0.5">
                              {service.default_duration} min
                            </span>
                            <span className="font-semibold text-[color:var(--bc-secondary)]">
                              SAR {service.standard_selling_price}
                            </span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                className="w-full sm:w-auto"
                onClick={loadSlots}
                disabled={busy || selectedServices.length === 0}
              >
                {busy ? "Finding available times…" : "Continue to time slots →"}
              </Button>
            </div>
          </Card>
        ) : null}

        {step === "slots" ? (
          <Card title="Pick a time" description="Available slots for your selected services." elevated>
            {slots.length === 0 ? (
              <p className="text-sm text-[color:var(--bc-muted)]">
                No slots available for this date.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {slots.map((slot) => (
                  <button
                    key={`${slot.employee}-${slot.start_time}`}
                    type="button"
                    onClick={() => {
                      setSelectedSlot(slot);
                      setStep("otp");
                    }}
                    className="flex items-start gap-3 rounded-[var(--bc-radius-lg)] border border-[color:var(--bc-border)] bg-white p-4 text-left transition hover:border-[color:var(--bc-secondary)] hover:bg-[color:var(--bc-accent-muted)] hover:shadow-md"
                  >
                    <BeauticianAvatar
                      name={slot.employee_name}
                      image={slot.employee_image}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{slot.employee_name}</p>
                      <p className="mt-1 text-lg font-bold text-[color:var(--bc-secondary)]">
                        {slot.start_time.slice(11, 16)}
                        <span className="mx-1 font-normal text-[color:var(--bc-muted)]">–</span>
                        {slot.end_time.slice(11, 16)}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--bc-muted)]">
                        {slot.duration_minutes} min session
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <Button variant="ghost" className="mt-5" onClick={() => setStep("services")}>
              ← Back to services
            </Button>
          </Card>
        ) : null}

        {step === "otp" ? (
          <Card
            title="Verify your contact details"
            description="We send a one-time code to your mobile and email. Both are saved as your customer ID for bookings and check-in."
            elevated
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Nora Al-Rashid"
                />
              </div>
              <div>
                <Label htmlFor="mobile">Mobile number</Label>
                <Input
                  id="mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+966 5XX XXX XXXX"
                />
              </div>
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              {!verified && devOtp ? (
                <div className="rounded-xl border border-[color:var(--bc-warning)]/30 bg-[color:var(--bc-warning)]/8 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--bc-warning)]">
                    Verification code
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold tracking-[0.3em] text-[color:var(--bc-text)]">
                    {devOtp}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--bc-muted)]">
                    SMS/email delivery is not configured — use this code to continue.
                  </p>
                </div>
              ) : null}
              {!requestId ? (
                <Button
                  onClick={sendOtp}
                  disabled={busy || !mobile || !email || !customerName}
                  className="w-full sm:w-auto"
                >
                  Send verification code
                </Button>
              ) : (
                <>
                  <div>
                    <Label htmlFor="otp">Enter code</Label>
                    <Input
                      id="otp"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="6-digit code"
                      inputMode="numeric"
                      className="font-mono text-lg tracking-widest"
                    />
                  </div>
                  <Button
                    onClick={confirmOtp}
                    disabled={busy || otp.length < 4}
                    className="w-full sm:w-auto"
                  >
                    Verify & continue
                  </Button>
                </>
              )}
            </div>
          </Card>
        ) : null}

        {step === "confirm" && selectedSlot ? (
          <Card title="Confirm your appointment" elevated>
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-[color:var(--bc-accent-muted)] p-4">
              <BeauticianAvatar
                name={selectedSlot.employee_name}
                image={selectedSlot.employee_image}
                size="lg"
              />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--bc-muted)]">
                  Your beautician
                </p>
                <p className="text-lg font-bold">{selectedSlot.employee_name}</p>
              </div>
            </div>
            <dl className="divide-y divide-[color:var(--bc-border)] text-sm">
              {[
                ["Date", formatDateLabel(date)],
                ["Time", selectedSlot.start_time.slice(11, 16)],
                ["Branch", branchLabel],
                ["Mobile", mobile],
                ["Email", email],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-3">
                  <dt className="text-[color:var(--bc-muted)]">{label}</dt>
                  <dd className="font-medium text-right">{value}</dd>
                </div>
              ))}
            </dl>
            <Button className="mt-6 w-full sm:w-auto" onClick={submitBooking} disabled={busy}>
              {busy
                ? requirePayment
                  ? "Creating booking…"
                  : "Confirming…"
                : requirePayment
                  ? "Continue to payment"
                  : "Confirm booking"}
            </Button>
          </Card>
        ) : null}

        {step === "payment" && paymentSession ? (
          <Card
            title="Complete payment"
            description="Pay securely with Telr to confirm your appointment."
            elevated
          >
            <div className="space-y-4">
              <div className="rounded-xl border border-[color:var(--bc-border)] bg-[color:var(--bc-surface-muted)]/40 p-4">
                <p className="text-sm text-[color:var(--bc-muted)]">Amount due now</p>
                <p className="text-3xl font-bold">
                  {paymentSession.currency ?? "SAR"} {paymentSession.amount ?? totalPrice}
                </p>
                {paymentSession.payment_type === "Deposit Only" ? (
                  <p className="mt-1 text-sm text-[color:var(--bc-muted)]">
                    Deposit · total visit SAR {paymentSession.appointment_total ?? totalPrice}
                  </p>
                ) : null}
              </div>

              {paymentSession.demo_mode ? (
                <div className="space-y-4 rounded-xl border border-dashed border-[color:var(--bc-primary)]/30 bg-[color:var(--bc-primary)]/5 p-4">
                  <p className="text-sm font-medium">Telr demo mode</p>
                  <p className="text-sm text-[color:var(--bc-muted)]">
                    No live charge is made. Use the demo card below when testing a real Telr
                    sandbox later, or click the button to simulate a successful payment now.
                  </p>
                  {paymentSession.demo_card ? (
                    <dl className="grid gap-2 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-[color:var(--bc-muted)]">Card</dt>
                        <dd className="font-mono">{paymentSession.demo_card.number}</dd>
                      </div>
                      <div>
                        <dt className="text-[color:var(--bc-muted)]">Expiry</dt>
                        <dd>{paymentSession.demo_card.expiry}</dd>
                      </div>
                      <div>
                        <dt className="text-[color:var(--bc-muted)]">CVV</dt>
                        <dd className="font-mono">{paymentSession.demo_card.cvv}</dd>
                      </div>
                    </dl>
                  ) : null}
                  <Button className="w-full sm:w-auto" onClick={payWithDemo} disabled={busy}>
                    {busy ? "Processing…" : "Simulate successful payment"}
                  </Button>
                </div>
              ) : (
                <Button className="w-full sm:w-auto" onClick={payWithTelr} disabled={busy}>
                  Pay with Telr
                </Button>
              )}
            </div>
          </Card>
        ) : null}

        {step === "done" ? (
          <Card title="You're all set!" elevated>
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--bc-success)]/10 text-2xl">
                ✓
              </span>
              <div>
                <p className="text-[color:var(--bc-muted)]">
                  Booking reference
                </p>
                <p className="text-2xl font-bold tracking-tight">
                  {bookingResult?.name ?? "—"}
                </p>
                <p className="mt-2 text-sm text-[color:var(--bc-muted)]">
                  We look forward to seeing you at {branchLabel}.
                  {email ? (
                    <>
                      {" "}
                      A confirmation with your check-in QR code was sent to{" "}
                      <span className="font-medium text-[color:var(--bc-text)]">{email}</span>.
                    </>
                  ) : null}
                </p>
              </div>
            </div>
            {bookingResult?.name ? (
              <div className="mt-6">
                <AppointmentCheckInQr appointment={bookingResult.name} guest />
              </div>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/book/appointments">
                <Button variant="secondary">My appointments</Button>
              </Link>
              <Button variant="ghost" onClick={() => window.location.reload()}>
                Book another
              </Button>
            </div>
          </Card>
        ) : null}
      </div>

      <aside className="lg:sticky lg:top-24">
        <Card
          className="overflow-hidden border-[color:var(--bc-primary)]/15 p-0"
          elevated
        >
          <div className="bg-gradient-to-br from-[color:var(--bc-primary)] to-[#8b6cff] px-6 py-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] opacity-90">
              Your visit
            </p>
            <p className="mt-1 text-2xl font-bold">
              {totalPrice > 0 ? `SAR ${totalPrice}` : "—"}
            </p>
            {selectedServiceDetails.length > 0 ? (
              <p className="mt-1 text-sm opacity-90">
                {selectedServiceDetails.length} service
                {selectedServiceDetails.length === 1 ? "" : "s"} · {totalDuration} min
              </p>
            ) : (
              <p className="mt-1 text-sm opacity-80">No services selected yet</p>
            )}
          </div>
          <div className="space-y-4 p-6">
            {date ? (
              <p className="text-sm text-[color:var(--bc-muted)]">
                <span className="font-medium text-[color:var(--bc-text)]">Date:</span>{" "}
                {formatDateLabel(date)}
              </p>
            ) : null}
            {selectedSlot ? (
              <div className="flex items-center gap-3 text-sm text-[color:var(--bc-muted)]">
                <BeauticianAvatar
                  name={selectedSlot.employee_name}
                  image={selectedSlot.employee_image}
                  size="sm"
                />
                <p>
                  <span className="font-medium text-[color:var(--bc-text)]">Time:</span>{" "}
                  {selectedSlot.start_time.slice(11, 16)} with {selectedSlot.employee_name}
                </p>
              </div>
            ) : null}
            {selectedServiceDetails.length > 0 ? (
              <ul className="space-y-2 border-t border-[color:var(--bc-border)] pt-4">
                {selectedServiceDetails.map((s) => (
                  <li
                    key={s.name}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span>{serviceIcon(s.service_name ?? "")}</span>
                      {s.service_name}
                    </span>
                    <span className="font-medium">SAR {s.standard_selling_price}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-sm text-[color:var(--bc-muted)] py-4">
                Select services to see your summary here
              </p>
            )}
          </div>
        </Card>
      </aside>
    </div>
  );
}
