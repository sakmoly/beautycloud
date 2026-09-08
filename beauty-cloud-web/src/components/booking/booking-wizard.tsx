"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  BookingWizardHeader,
  type WizardStep,
} from "@/components/booking/booking-stepper";
import {
  BookingTicketSidebar,
  WizardCloseButton,
} from "@/components/booking/booking-ticket-sidebar";
import { AppointmentCheckInQr } from "@/components/booking/appointment-check-in-qr";
import { CategoryServicePicker } from "@/components/marketing/category-service-picker";
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
  BookingPaymentSession,
} from "@/lib/api/types";
import type { PublicBootstrap, PublicCatalogService } from "@/lib/frappe/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { customerInitials } from "@/components/pos/pos-utils";

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

function formatDateLabel(iso: string) {
  if (!iso) return "—";
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function BookingWizard({
  bootstrap,
  initialSelectedServices = [],
  initialCategory = null,
}: {
  bootstrap?: PublicBootstrap;
  initialSelectedServices?: string[];
  initialCategory?: string | null;
}) {
  const [step, setStep] = useState<WizardStep>("services");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [branches, setBranches] = useState<BeautyBranch[]>([]);
  const [selectedServiceDetails, setSelectedServiceDetails] = useState<PublicCatalogService[]>([]);
  const [branch, setBranch] = useState("");
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
  const [paymentSession, setPaymentSession] = useState<BookingPaymentSession | null>(null);
  const [bookingResult, setBookingResult] = useState<{ name?: string } | null>(null);

  const branchImage = bootstrap?.branding?.booking_header_image;
  const activeBranch = branches.find((b) => b.name === branch) ?? branches[0];

  useEffect(() => {
    Promise.all([getBranches(), fetchBootstrap()])
      .then(async ([b, boot]) => {
        setBranches(b);
        setRequirePayment(Boolean(boot?.booking_payment?.require_payment_at_booking));
        if (b[0]) setBranch(b[0].name);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setDate(tomorrow.toISOString().slice(0, 10));

        if (initialSelectedServices.length) {
          const all = await getServices();
          setSelectedServiceDetails(
            all.filter((s) => initialSelectedServices.includes(s.name)) as PublicCatalogService[],
          );
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [initialSelectedServices]);

  const selectedServices = useMemo(
    () => selectedServiceDetails.map((s) => s.name),
    [selectedServiceDetails],
  );

  const totalPrice = selectedServiceDetails.reduce(
    (sum, s) => sum + (s.standard_selling_price ?? 0),
    0,
  );

  const totalDuration = selectedServiceDetails.reduce(
    (sum, s) => sum + (s.default_duration ?? 0),
    0,
  );

  const branchLabel = activeBranch?.branch_name ?? branch;

  function toggleService(name: string, service?: PublicCatalogService) {
    setSelectedServiceDetails((prev) => {
      if (prev.some((s) => s.name === name)) {
        return prev.filter((s) => s.name !== name);
      }
      if (service) return [...prev, service];
      return prev;
    });
  }

  function goToVisit() {
    if (selectedServices.length === 0) {
      setError("Select at least one service to continue.");
      return;
    }
    setError(null);
    setStep("visit");
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

  const sidebarContinue = (() => {
    if (step === "services") {
      return {
        show: true,
        label: "Continue",
        disabled: selectedServices.length === 0,
        onContinue: goToVisit,
      };
    }
    if (step === "visit") {
      return {
        show: true,
        label: busy ? "Finding times…" : "Continue",
        disabled: busy || !branch || !date,
        onContinue: loadSlots,
      };
    }
    return { show: false };
  })();

  if (loading) {
    return (
      <div className="bc-wizard-shell">
        <div className="flex flex-1 items-center justify-center p-12">
          <LoadingState title="Loading booking" description="Fetching branches and services" />
        </div>
      </div>
    );
  }

  if (error && step === "services" && branches.length === 0) {
    return (
      <div className="bc-wizard-shell">
        <div className="flex flex-1 items-center justify-center p-12">
          <ErrorState title="Booking unavailable" description={error} />
        </div>
      </div>
    );
  }

  return (
    <div className="bc-wizard-shell">
      <BookingWizardHeader step={step} onClose={<WizardCloseButton />} />

      <div className="bc-wizard-body">
        <div className="bc-wizard-main">
          {error ? (
            <div
              className="mb-6 flex gap-3 border border-[color:var(--bc-danger)]/20 bg-[color:var(--bc-danger)]/5 px-4 py-3 text-sm text-[color:var(--bc-danger)]"
              role="alert"
            >
              <span aria-hidden>⚠</span>
              <p>{error}</p>
            </div>
          ) : null}

          {step === "services" ? (
            <CategoryServicePicker
              initialCategory={initialCategory}
              selectedServices={selectedServices}
              onToggleService={toggleService}
              variant="wizard"
            />
          ) : null}

          {step === "visit" ? (
            <div className="mx-auto max-w-lg space-y-6">
              <p className="text-[color:var(--bc-muted)]">
                Choose where and when you would like your appointment.
              </p>
              <div>
                <Label htmlFor="branch">Branch</Label>
                <select
                  id="branch"
                  className="mt-1.5 min-h-11 w-full border border-[color:var(--bc-border)] bg-white px-3.5 text-sm outline-none focus:border-[color:var(--bc-gold)]"
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
                  className="mt-1.5"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <Button variant="ghost" onClick={() => setStep("services")}>
                ← Back to services
              </Button>
            </div>
          ) : null}

          {step === "slots" ? (
            <div className="space-y-4">
              <p className="text-[color:var(--bc-muted)]">
                Available slots for {formatDateLabel(date)} at {branchLabel}.
              </p>
              {slots.length === 0 ? (
                <p className="text-sm text-[color:var(--bc-muted)]">No slots available for this date.</p>
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
                      className="flex items-start gap-3 border border-[color:var(--bc-border)] bg-white p-4 text-left transition hover:border-[color:var(--bc-gold)] hover:bg-[color:var(--bc-accent-muted)]"
                    >
                      <BeauticianAvatar name={slot.employee_name} image={slot.employee_image} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{slot.employee_name}</p>
                        <p className="mt-1 text-lg font-bold text-[color:var(--bc-gold)]">
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
              <Button variant="ghost" onClick={() => setStep("visit")}>
                ← Back to visit details
              </Button>
            </div>
          ) : null}

          {step === "otp" ? (
            <Card
              title="Verify your contact details"
              description="We send a one-time code to your mobile and email."
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
                  <div className="border border-[color:var(--bc-warning)]/30 bg-[color:var(--bc-warning)]/8 px-4 py-3">
                    <p className="text-xs font-medium uppercase text-[color:var(--bc-warning)]">
                      Verification code
                    </p>
                    <p className="mt-1 font-mono text-2xl font-bold tracking-[0.3em]">{devOtp}</p>
                  </div>
                ) : null}
                {!requestId ? (
                  <Button
                    onClick={sendOtp}
                    disabled={busy || !mobile || !email || !customerName}
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
                    <Button onClick={confirmOtp} disabled={busy || otp.length < 4}>
                      Verify & continue
                    </Button>
                  </>
                )}
                <Button variant="ghost" onClick={() => setStep("slots")}>
                  ← Back to time slots
                </Button>
              </div>
            </Card>
          ) : null}

          {step === "confirm" && selectedSlot ? (
            <Card title="Confirm your appointment" elevated>
              <div className="mb-4 flex items-center gap-3 bg-[color:var(--bc-accent-muted)] p-4">
                <BeauticianAvatar
                  name={selectedSlot.employee_name}
                  image={selectedSlot.employee_image}
                  size="lg"
                />
                <div>
                  <p className="text-xs font-medium uppercase text-[color:var(--bc-muted)]">
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
                    <dd className="text-right font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              <Button className="mt-6" onClick={submitBooking} disabled={busy}>
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
            <Card title="Complete payment" elevated>
              <div className="space-y-4">
                <div className="border border-[color:var(--bc-border)] bg-[color:var(--bc-accent-muted)] p-4">
                  <p className="text-sm text-[color:var(--bc-muted)]">Amount due now</p>
                  <p className="text-3xl font-bold">
                    {paymentSession.currency ?? "SAR"} {paymentSession.amount ?? totalPrice}
                  </p>
                </div>
                {paymentSession.demo_mode ? (
                  <Button onClick={payWithDemo} disabled={busy}>
                    {busy ? "Processing…" : "Simulate successful payment"}
                  </Button>
                ) : (
                  <Button onClick={payWithTelr} disabled={busy}>
                    Pay with Telr
                  </Button>
                )}
              </div>
            </Card>
          ) : null}

          {step === "done" ? (
            <Card title="You're all set!" elevated>
              <div className="flex items-start gap-4">
                <span className="flex h-14 w-14 items-center justify-center bg-[color:var(--bc-success)]/10 text-2xl">
                  ✓
                </span>
                <div>
                  <p className="text-[color:var(--bc-muted)]">Booking reference</p>
                  <p className="text-2xl font-bold">{bookingResult?.name ?? "—"}</p>
                  <p className="mt-2 text-sm text-[color:var(--bc-muted)]">
                    We look forward to seeing you at {branchLabel}.
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

        <BookingTicketSidebar
          branch={activeBranch}
          branchImage={branchImage}
          selectedServices={selectedServiceDetails}
          totalPrice={totalPrice}
          totalDuration={totalDuration}
          onRemoveService={(name) => toggleService(name)}
          showContinue={sidebarContinue.show}
          continueLabel={sidebarContinue.label}
          continueDisabled={sidebarContinue.disabled}
          onContinue={sidebarContinue.onContinue}
        />
      </div>
    </div>
  );
}
