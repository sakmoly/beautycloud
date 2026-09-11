"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { BranchPicker } from "@/components/booking/branch-picker";
import {
  ServiceSchedulePicker,
  scheduleSelectionReady,
} from "@/components/booking/service-schedule-picker";
import {
  callBeautyMethod,
  completeDemoPayment,
  getBranches,
  kioskBootstrap,
  kioskGetCatalog,
} from "@/lib/api/browser-client";
import type { BeautyBranch } from "@/lib/api/types";
import type { ScheduleSelection } from "@/lib/api/types";
import type {
  BookingPaymentSession,
  KioskPaymentConfig,
  PublicCatalogCategory,
  PublicCatalogService,
} from "@/lib/frappe/types";
import { categoryEmoji } from "@/lib/category-emoji";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ErrorState, LoadingState } from "@/components/ui/states";

const DEVICE_ID = process.env.NEXT_PUBLIC_KIOSK_DEVICE_ID ?? "KIOSK-MAIN";
const API_KEY = process.env.NEXT_PUBLIC_KIOSK_API_KEY ?? "demo-kiosk-key-2026";

interface KioskBootstrap {
  device?: { device_name?: string; beauty_branch?: string };
  company?: string;
  company_display_name?: string;
  beauty_branch?: string;
  branch_name?: string | null;
  salon_payment?: { require_payment_at_kiosk?: boolean; require_payment_before_service?: boolean };
  kiosk_payment?: KioskPaymentConfig;
}

type Step = "services" | "schedule" | "details" | "payment" | "done";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateLabel(iso: string) {
  if (!iso) return "—";
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(value: string) {
  return value.slice(11, 16);
}

function beauticianInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function KioskBeauticianAvatar({
  name,
  image,
  size = "slot",
}: {
  name: string;
  image?: string;
  size?: "slot" | "picker";
}) {
  const [failed, setFailed] = useState(false);
  const className =
    size === "picker" ? "bc-kiosk-picker-avatar" : "bc-kiosk-slot-avatar";

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
        className={className}
      />
    );
  }

  return (
    <span className={`${className} bc-kiosk-slot-avatar-fallback`}>{beauticianInitials(name)}</span>
  );
}

function serviceIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("hair") || n.includes("cut")) return "✂️";
  if (n.includes("facial")) return "✨";
  if (n.includes("mani") || n.includes("pedi")) return "💅";
  if (n.includes("blow")) return "💨";
  return "💆";
}

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function KioskView() {
  const [step, setStep] = useState<Step>("services");
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bootstrap, setBootstrap] = useState<KioskBootstrap | null>(null);
  const [rootCategories, setRootCategories] = useState<PublicCatalogCategory[]>([]);
  const [activeRoot, setActiveRoot] = useState<string | null>(null);
  const [childCategories, setChildCategories] = useState<PublicCatalogCategory[]>([]);
  const [activeChild, setActiveChild] = useState<string | null>(null);
  const [services, setServices] = useState<PublicCatalogService[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<Array<{ name: string; label: string }>>([]);

  const [selectedById, setSelectedById] = useState<Record<string, PublicCatalogService>>({});
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [bookingRef, setBookingRef] = useState<string>("");
  const [bookingTime, setBookingTime] = useState<string>("");
  const [paymentSession, setPaymentSession] = useState<BookingPaymentSession | null>(null);

  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const [branches, setBranches] = useState<BeautyBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [appointmentDate, setAppointmentDate] = useState(todayIso);
  const [scheduleSelection, setScheduleSelection] = useState<ScheduleSelection | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const selectedServices = useMemo(() => Object.values(selectedById), [selectedById]);
  const scheduleServices = useMemo(
    () =>
      selectedServices.map((service) => ({
        name: service.name,
        service_name: service.service_name ?? service.name,
        default_duration: service.default_duration,
      })),
    [selectedServices],
  );
  const kioskAuth = useMemo(
    () => ({ device_id: DEVICE_ID, api_key: API_KEY }),
    [],
  );
  const selectedIds = useMemo(() => Object.keys(selectedById), [selectedById]);
  const selectedTotal = useMemo(
    () => selectedServices.reduce((sum, service) => sum + Number(service.standard_selling_price ?? 0), 0),
    [selectedServices],
  );

  const kioskPayment = bootstrap?.kiosk_payment;
  const paymentRequired = kioskPayment?.require_payment ?? bootstrap?.salon_payment?.require_payment_at_kiosk ?? false;
  const paymentLabel = kioskPayment?.label ?? "Mada / Credit Card";
  const currency = kioskPayment?.currency ?? paymentSession?.currency ?? "SAR";

  const loadCategoryBranch = useCallback(async (categoryName: string) => {
    setCatalogLoading(true);
    setError(null);
    try {
      const result = await kioskGetCatalog(DEVICE_ID, API_KEY, categoryName);

      if (result.services.length) {
        setChildCategories([]);
        setActiveChild(categoryName);
        setServices(result.services);
        setBreadcrumb(result.breadcrumb ?? []);
        return;
      }

      if (result.categories.length) {
        setChildCategories(result.categories);
        const first =
          result.categories.find((category) => !category.is_group && category.service_count > 0) ??
          result.categories.find((category) => !category.is_group) ??
          result.categories[0];
        if (first) {
          setActiveChild(first.name);
          const leaf = await kioskGetCatalog(DEVICE_ID, API_KEY, first.name);
          setServices(leaf.services);
          setBreadcrumb(leaf.breadcrumb ?? result.breadcrumb ?? []);
        } else {
          setServices([]);
          setBreadcrumb(result.breadcrumb ?? []);
        }
        return;
      }

      setChildCategories([]);
      setActiveChild(null);
      setServices([]);
      setBreadcrumb(result.breadcrumb ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load services");
      setServices([]);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const loadRootCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const result = await kioskGetCatalog(DEVICE_ID, API_KEY);
      setRootCategories(result.categories);
      if (result.categories[0]) {
        setActiveRoot(result.categories[0].name);
        await loadCategoryBranch(result.categories[0].name);
      } else {
        setServices([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load categories");
    } finally {
      setCatalogLoading(false);
    }
  }, [loadCategoryBranch]);

  const loadBootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, branchRows] = await Promise.all([
        kioskBootstrap(DEVICE_ID, API_KEY) as Promise<KioskBootstrap>,
        getBranches(),
      ]);
      setBootstrap(data);
      setBranches(branchRows);
      setSelectedBranch(branchRows.length === 1 ? branchRows[0].name : "");
      await loadRootCatalog();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not connect to kiosk. Check device credentials.",
      );
    } finally {
      setLoading(false);
    }
  }, [loadRootCatalog]);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  function toggleService(service: PublicCatalogService) {
    setSelectedById((prev) => {
      const next = { ...prev };
      if (next[service.name]) {
        delete next[service.name];
      } else {
        next[service.name] = service;
      }
      return next;
    });
  }

  const selectRoot = useCallback(
    async (categoryName: string) => {
      setActiveRoot(categoryName);
      setActiveChild(null);
      setChildCategories([]);
      await loadCategoryBranch(categoryName);
    },
    [loadCategoryBranch],
  );

  const selectChild = useCallback(
    async (categoryName: string) => {
      setActiveChild(categoryName);
      setCatalogLoading(true);
      setError(null);
      try {
        const result = await kioskGetCatalog(DEVICE_ID, API_KEY, categoryName);
        if (result.services.length) {
          setServices(result.services);
          setBreadcrumb(result.breadcrumb ?? []);
          return;
        }
        if (result.categories.length) {
          const first = result.categories.find((category) => !category.is_group) ?? result.categories[0];
          if (first) {
            const leaf = await kioskGetCatalog(DEVICE_ID, API_KEY, first.name);
            setActiveChild(first.name);
            setServices(leaf.services);
            setBreadcrumb(leaf.breadcrumb ?? []);
          }
          return;
        }
        setServices([]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load services");
        setServices([]);
      } finally {
        setCatalogLoading(false);
      }
    },
    [],
  );

  async function submitBooking() {
    if (
      !selectedIds.length ||
      !name.trim() ||
      !mobile.trim() ||
      (branches.length > 1 && !selectedBranch) ||
      !scheduleSelectionReady(scheduleSelection, selectedIds.length)
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = (await callBeautyMethod<
        BookingPaymentSession & {
          name?: string;
          total_amount?: number;
          scheduled_start?: string;
          payment?: BookingPaymentSession;
          payment_required?: boolean;
          services?: Array<{ start_time?: string }>;
        }
      >({
        method: "beauty_cloud.api.kiosk.book",
        guest: true,
        body: {
          device_id: DEVICE_ID,
          api_key: API_KEY,
          beauty_branch: selectedBranch || bootstrap?.beauty_branch,
          services: selectedIds,
          customer_name: name.trim(),
          mobile: mobile.trim(),
          appointment_date: appointmentDate,
          ...(scheduleSelection?.mode === "split"
            ? {
                scheduling_mode: "split",
                service_assignments: scheduleSelection.assignments,
              }
            : {
                start_time: scheduleSelection?.mode === "unified" ? scheduleSelection.start_time : undefined,
                employee: scheduleSelection?.mode === "unified" ? scheduleSelection.employee : undefined,
              }),
        },
      })) as BookingPaymentSession & {
        name?: string;
        total_amount?: number;
        scheduled_start?: string;
        payment?: BookingPaymentSession;
        payment_required?: boolean;
        services?: Array<{ start_time?: string }>;
      };

      const start = result.scheduled_start ?? result.services?.[0]?.start_time ?? "";
      setBookingRef(result.name ?? "—");
      setBookingTime(start ? start.slice(11, 16) : "");

      const payment = result.payment ?? (result.payment_required ? result : null);
      if (paymentRequired && payment?.payment_name) {
        setPaymentSession(payment);
        setStep("payment");
        return;
      }

      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  }

  function cardFormValid() {
    const digits = cardNumber.replace(/\D/g, "");
    const expiry = cardExpiry.replace(/\D/g, "");
    const cvv = cardCvv.replace(/\D/g, "");
    return digits.length >= 15 && expiry.length >= 4 && cvv.length >= 3;
  }

  async function payWithDemoCard() {
    if (!paymentSession?.payment_name || !paymentSession.demo_token) return;
    if (!cardFormValid()) {
      setError("Enter a valid card number, expiry (MM/YY), and CVV.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = (await completeDemoPayment({
        payment_name: paymentSession.payment_name,
        demo_token: paymentSession.demo_token,
      })) as BookingPaymentSession;
      if (!result.confirmed) {
        setError("Card payment could not be completed.");
        return;
      }
      setBookingRef(result.appointment ?? bookingRef);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  function payWithTelr() {
    if (!paymentSession?.payment_url) {
      setError("Telr payment session is not available.");
      return;
    }
    window.location.href = paymentSession.payment_url;
  }

  function startOver() {
    setStep("services");
    setName("");
    setMobile("");
    setBookingRef("");
    setBookingTime("");
    setPaymentSession(null);
    setSelectedById({});
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    setAppointmentDate(todayIso());
    setScheduleSelection(null);
    setError(null);
    void loadRootCatalog();
  }

  if (loading) {
    return (
      <LoadingState title="Starting kiosk" description="Loading categories and services for this device" />
    );
  }

  if (error && !bootstrap) {
    return (
      <ErrorState
        title="Kiosk unavailable"
        description={error}
        action={
          <Button variant="secondary" onClick={() => void loadBootstrap()}>
            Try again
          </Button>
        }
      />
    );
  }

  const salonName = bootstrap?.company_display_name ?? bootstrap?.company ?? "Salon";
  const activeBranch = branches.find((row) => row.name === selectedBranch);
  const branchLabel =
    activeBranch?.branch_name ?? bootstrap?.branch_name ?? bootstrap?.beauty_branch ?? "This branch";

  if (step === "schedule") {
    const scheduleReady =
      Boolean(selectedBranch) &&
      scheduleSelectionReady(scheduleSelection, selectedIds.length);

    return (
      <div className="bc-kiosk-schedule-step">
        <div className="bc-kiosk-schedule-layout">
          <section className="bc-kiosk-panel bc-kiosk-schedule-panel">
            <div className="bc-kiosk-panel-head">
              <p className="bc-kiosk-step-eyebrow">Step 2 · Schedule</p>
              <h2 className="bc-kiosk-panel-title">When would you like to come in?</h2>
              <p className="bc-kiosk-panel-sub">
                {branches.length > 1
                  ? "Choose your location, then pick a day, beautician, and time."
                  : `Choose a day, beautician, and open time at ${branchLabel}.`}
              </p>
            </div>

            {branches.length > 1 ? (
              <div className="bc-kiosk-schedule-block">
                <BranchPicker
                  variant="kiosk"
                  branches={branches}
                  value={selectedBranch}
                  onChange={(nextBranch) => {
                    setSelectedBranch(nextBranch);
                    setScheduleSelection(null);
                    setScheduleError(null);
                  }}
                />
              </div>
            ) : null}

            {scheduleError ? (
              <div className="bc-kiosk-schedule-alert">
                <p>{scheduleError}</p>
              </div>
            ) : null}

            {branches.length > 1 && !selectedBranch ? (
              <p className="bc-kiosk-schedule-empty-sub">Select a location above to see available times.</p>
            ) : null}

            {selectedBranch || branches.length <= 1 ? (
            <ServiceSchedulePicker
              variant="kiosk"
              beautyBranch={selectedBranch || bootstrap?.beauty_branch || ""}
              services={scheduleServices}
              bookingChannel="kiosk"
              kioskAuth={kioskAuth}
              appointmentDate={appointmentDate}
              onAppointmentDateChange={setAppointmentDate}
              value={scheduleSelection}
              onChange={setScheduleSelection}
              onError={setScheduleError}
            />
            ) : null}
          </section>

          <aside className="bc-kiosk-schedule-summary">
            <div className="bc-kiosk-schedule-summary-card">
              <p className="bc-kiosk-sidebar-label">Your appointment</p>
              {scheduleSelection?.mode === "unified" ? (
                <>
                  <p className="bc-kiosk-summary-date">{formatDateLabel(appointmentDate)}</p>
                  <p className="bc-kiosk-summary-time">
                    {formatTime(scheduleSelection.start_time)}
                    <span>–</span>
                    {formatTime(scheduleSelection.end_time)}
                  </p>
                  <div className="bc-kiosk-summary-stylist">
                    <KioskBeauticianAvatar
                      name={scheduleSelection.employee_name}
                      image={scheduleSelection.employee_image}
                      size="picker"
                    />
                    <div>
                      <p className="bc-kiosk-summary-stylist-label">With</p>
                      <p className="bc-kiosk-summary-stylist-name">{scheduleSelection.employee_name}</p>
                    </div>
                  </div>
                  <p className="bc-kiosk-summary-meta">
                    {scheduleSelection.duration_minutes} min session · Confirmed available
                  </p>
                </>
              ) : scheduleSelection?.mode === "split" ? (
                <>
                  <p className="bc-kiosk-summary-date">{formatDateLabel(appointmentDate)}</p>
                  <ul className="bc-kiosk-split-summary-list">
                    {scheduleSelection.assignments.map((assignment) => {
                      const service = selectedServices.find((row) => row.name === assignment.beauty_service);
                      return (
                        <li key={assignment.beauty_service}>
                          <div>
                            <span>{service?.service_name ?? assignment.beauty_service}</span>
                            {assignment.employee_name ? (
                              <span className="bc-kiosk-split-summary-stylist">with {assignment.employee_name}</span>
                            ) : null}
                          </div>
                          <span>{formatTime(assignment.start_time)}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="bc-kiosk-summary-meta">
                    {scheduleSelection.assignments.length} of {selectedServices.length} services scheduled
                  </p>
                </>
              ) : (
                <p className="bc-kiosk-summary-placeholder">
                  Select a day, beautician, and time to continue.
                </p>
              )}

              <div className="bc-kiosk-summary-actions">
                <Button
                  className="bc-kiosk-primary-btn w-full"
                  disabled={!scheduleReady}
                  onClick={() => {
                    setError(null);
                    setStep("details");
                  }}
                >
                  Continue →
                </Button>
                <Button variant="ghost" className="bc-kiosk-ghost-btn w-full" onClick={() => setStep("services")}>
                  ← Back to services
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  if (step === "details") {
    return (
      <div className="bc-kiosk-step mx-auto w-full max-w-3xl">
        <div className="bc-kiosk-panel">
          <div className="bc-kiosk-panel-head">
            <h2 className="bc-kiosk-panel-title">Your details</h2>
            <p className="bc-kiosk-panel-sub">
              {scheduleSelection?.mode === "unified"
                ? `Your slot is confirmed available — ${formatDateLabel(appointmentDate)} at ${formatTime(scheduleSelection.start_time)} with ${scheduleSelection.employee_name}.`
                : scheduleSelection?.mode === "split"
                  ? `Your services are scheduled for ${formatDateLabel(appointmentDate)}.`
                  : "Enter your details to complete the booking."}
            </p>
          </div>
          {scheduleSelection?.mode === "unified" ? (
            <div className="bc-kiosk-slot-selected mb-5">
              <p className="bc-kiosk-slot-selected-label">Appointment time</p>
              <p className="bc-kiosk-slot-selected-value">
                {formatDateLabel(appointmentDate)} · {formatTime(scheduleSelection.start_time)} –{" "}
                {formatTime(scheduleSelection.end_time)} · {scheduleSelection.employee_name}
              </p>
            </div>
          ) : scheduleSelection?.mode === "split" ? (
            <ul className="bc-kiosk-slot-selected mb-5 space-y-1 text-sm">
              {scheduleSelection.assignments.map((assignment) => {
                const service = selectedServices.find((row) => row.name === assignment.beauty_service);
                return (
                  <li key={assignment.beauty_service}>
                    {service?.service_name ?? assignment.beauty_service} · {formatTime(assignment.start_time)}
                  </li>
                );
              })}
            </ul>
          ) : null}
          {selectedServices.length ? (
            <ul className="mb-5 space-y-2 rounded-xl bg-[color:var(--bc-accent-muted)] p-4 text-sm">
              {selectedServices.map((service) => (
                <li key={service.name} className="flex justify-between gap-3">
                  <span className="font-medium">{service.service_name}</span>
                  <span className="shrink-0 text-[color:var(--bc-primary)]">
                    SAR {service.standard_selling_price}
                  </span>
                </li>
              ))}
              <li className="flex justify-between gap-3 border-t border-[color:var(--bc-border)] pt-2 font-bold">
                <span>Total</span>
                <span className="text-[color:var(--bc-primary)]">SAR {selectedTotal}</span>
              </li>
            </ul>
          ) : null}
          {error ? <p className="bc-kiosk-error">{error}</p> : null}
          <div className="bc-kiosk-form">
            <div>
              <Label htmlFor="kiosk-name">Full name</Label>
              <Input
                id="kiosk-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                className="bc-kiosk-input"
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
                className="bc-kiosk-input"
              />
            </div>
            <div className="bc-kiosk-actions">
              <Button
                onClick={() => void submitBooking()}
                disabled={busy || !name.trim() || !mobile.trim()}
                className="bc-kiosk-primary-btn min-w-[220px]"
              >
                {busy ? "Booking…" : paymentRequired ? "Continue to card payment" : "Confirm booking"}
              </Button>
              <Button variant="ghost" onClick={() => setStep("schedule")} className="bc-kiosk-ghost-btn">
                ← Back to date &amp; time
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "payment" && paymentSession) {
    const amount = paymentSession.amount ?? selectedTotal;
    return (
      <div className="bc-kiosk-step mx-auto w-full max-w-4xl">
        <div className="bc-kiosk-panel">
          {error ? <p className="bc-kiosk-error">{error}</p> : null}
          <div className="bc-kiosk-panel-head text-center">
            <h2 className="bc-kiosk-panel-title">Pay with {paymentLabel}</h2>
            <p className="bc-kiosk-panel-sub">
              Secure card payment via Telr — Mada and international credit cards accepted.
            </p>
          </div>
          <div className="bc-kiosk-payment-summary">
            <p className="bc-kiosk-amount">
              {currency} {Number(amount).toLocaleString()}
            </p>
            <p className="bc-kiosk-panel-sub">
              Ref {bookingRef}
              {selectedServices.length
                ? ` · ${selectedServices.map((service) => service.service_name).join(", ")}`
                : ""}
            </p>
          </div>

          {paymentSession.demo_mode ? (
            <div className="bc-kiosk-card-form mt-6 space-y-4">
              <p className="bc-kiosk-sidebar-label">Card details</p>
              {paymentSession.demo_card ? (
                <p className="text-sm text-[color:var(--bc-muted)]">
                  Demo mode — try {paymentSession.demo_card.number}, expiry {paymentSession.demo_card.expiry},
                  CVV {paymentSession.demo_card.cvv}.
                </p>
              ) : null}
              <div>
                <Label htmlFor="kiosk-card-number">Card number</Label>
                <Input
                  id="kiosk-card-number"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="4111 1111 1111 1111"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  className="bc-kiosk-input font-mono tracking-wider"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="kiosk-card-expiry">Expiry (MM/YY)</Label>
                  <Input
                    id="kiosk-card-expiry"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    placeholder="12/28"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    className="bc-kiosk-input font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="kiosk-card-cvv">CVV</Label>
                  <Input
                    id="kiosk-card-cvv"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="123"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    className="bc-kiosk-input font-mono"
                  />
                </div>
              </div>
              <div className="bc-kiosk-actions mt-4 justify-center">
                <Button
                  className="bc-kiosk-primary-btn min-w-[min(100%,360px)]"
                  onClick={() => void payWithDemoCard()}
                  disabled={busy}
                >
                  {busy ? "Processing…" : `Pay ${currency} ${Number(amount).toLocaleString()}`}
                </Button>
              </div>
            </div>
          ) : (
            <div className="bc-kiosk-actions mt-8 justify-center">
              <Button
                className="bc-kiosk-primary-btn min-w-[min(100%,360px)]"
                onClick={payWithTelr}
                disabled={busy}
              >
                Continue to Telr secure payment
              </Button>
            </div>
          )}

          <div className="bc-kiosk-actions mt-4 justify-center">
            <Button variant="ghost" className="bc-kiosk-ghost-btn" onClick={() => setStep("details")} disabled={busy}>
              ← Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="bc-kiosk-step mx-auto w-full max-w-3xl">
        <div className="bc-kiosk-panel bc-kiosk-panel-center">
          <span className="bc-kiosk-success-icon">✓</span>
          <h2 className="bc-kiosk-panel-title">You&apos;re booked!</h2>
          <p className="bc-kiosk-panel-sub">
            {selectedServices.length
              ? selectedServices.map((service) => service.service_name).join(" · ")
              : "Your appointment"}
            {scheduleSelection?.mode === "unified"
              ? ` · ${formatDateLabel(appointmentDate)} ${formatTime(scheduleSelection.start_time)} · ${scheduleSelection.employee_name}`
              : bookingTime
                ? ` · ${bookingTime}`
                : ""}
          </p>
          <div className="bc-kiosk-ref-box">
            <p className="bc-kiosk-ref-label">Reference</p>
            <p className="bc-kiosk-ref-value">{bookingRef}</p>
          </div>
          <p className="bc-kiosk-panel-sub max-w-lg">
            {paymentRequired
              ? "Payment received. Please take a seat — our team will call you shortly."
              : "Please take a seat — reception will collect payment before your service starts."}
          </p>
          <Button className="bc-kiosk-primary-btn mt-8 min-w-[240px]" onClick={startOver}>
            New booking
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bc-kiosk-browse">
      <div className="bc-kiosk-intro">
        <h2 className="bc-kiosk-intro-title">What would you like today?</h2>
        <p className="bc-kiosk-intro-sub">
          Welcome to {salonName}
          {bootstrap?.branch_name ? ` · ${bootstrap.branch_name}` : ""}. Tap one or more services, then continue.
        </p>
      </div>

      {error ? <p className="bc-kiosk-error mx-auto max-w-7xl px-4">{error}</p> : null}

      <div className="bc-kiosk-layout">
        <aside className="bc-kiosk-sidebar">
          <p className="bc-kiosk-sidebar-label">Categories</p>
          <div className="bc-kiosk-root-grid">
            {rootCategories.map((category) => (
              <button
                key={category.name}
                type="button"
                className={`bc-kiosk-root-card ${activeRoot === category.name ? "active" : ""}`}
                onClick={() => void selectRoot(category.name)}
              >
                <span className="bc-kiosk-root-icon" aria-hidden>
                  {category.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={category.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    categoryEmoji(category.label)
                  )}
                </span>
                <span className="bc-kiosk-root-label">{category.label}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="bc-kiosk-main-panel">
          {childCategories.length ? (
            <div className="bc-kiosk-sub-row">
              <p className="bc-kiosk-sidebar-label">Sub-categories</p>
              <div className="bc-kiosk-sub-pills">
                {childCategories.map((category) => (
                  <button
                    key={category.name}
                    type="button"
                    className={`bc-kiosk-sub-pill ${activeChild === category.name ? "active" : ""}`}
                    onClick={() => void selectChild(category.name)}
                  >
                    {category.label}
                    {category.service_count ? (
                      <span className="bc-kiosk-sub-count">{category.service_count}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="bc-kiosk-panel-head bc-kiosk-services-head">
            <nav className="bc-kiosk-breadcrumb" aria-label="Category path">
              {breadcrumb.length ? (
                breadcrumb.map((crumb, index) => (
                  <span key={crumb.name} className="flex items-center gap-2">
                    {index > 0 ? <span aria-hidden>/</span> : null}
                    <span className={index === breadcrumb.length - 1 ? "is-current" : ""}>{crumb.label}</span>
                  </span>
                ))
              ) : (
                <span className="is-current">All services</span>
              )}
            </nav>
            <p className="bc-kiosk-service-count">
              {catalogLoading ? "Loading…" : `${services.length} service${services.length === 1 ? "" : "s"}`}
            </p>
          </div>

          {catalogLoading ? (
            <div className="bc-kiosk-loading">
              <LoadingState title="Loading services" description="Please wait" />
            </div>
          ) : services.length ? (
            <div className="bc-kiosk-service-grid">
              {services.map((service) => {
                const active = Boolean(selectedById[service.name]);
                return (
                  <button
                    key={service.name}
                    type="button"
                    onClick={() => toggleService(service)}
                    className={`bc-kiosk-service-card ${active ? "active" : ""}`}
                    aria-pressed={active}
                  >
                    <span className={`bc-kiosk-service-icon ${active ? "active" : ""}`}>
                      {active ? "✓" : serviceIcon(service.service_name ?? "")}
                    </span>
                    <span className="bc-kiosk-service-body">
                      <span className="bc-kiosk-service-name">{service.service_name}</span>
                      <span className="bc-kiosk-service-meta">
                        <span>{service.default_duration} min</span>
                        <span className="bc-kiosk-service-price">SAR {service.standard_selling_price}</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="bc-kiosk-empty">No kiosk services in this category yet.</p>
          )}
        </section>
      </div>

      <div className="bc-kiosk-footer-bar">
        <div className="bc-kiosk-footer-inner">
          <div className="bc-kiosk-footer-selection">
            <p className="bc-kiosk-footer-label">Selected ({selectedServices.length})</p>
            <p className="bc-kiosk-footer-value">
              {selectedServices.length
                ? selectedServices.map((service) => service.service_name).join(" · ")
                : "Tap services to add them"}
            </p>
            {selectedServices.length ? (
              <p className="bc-kiosk-footer-meta">
                Total · SAR {selectedTotal}
                {paymentRequired ? " · Card payment via Telr" : ""}
              </p>
            ) : null}
          </div>
          <Button
            className="bc-kiosk-primary-btn bc-kiosk-continue-btn"
            disabled={selectedServices.length === 0}
            onClick={() => {
              setError(null);
              setStep("schedule");
            }}
          >
            Choose date &amp; time →
          </Button>
        </div>
      </div>
    </div>
  );
}
