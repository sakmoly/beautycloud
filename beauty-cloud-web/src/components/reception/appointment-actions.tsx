"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchBootstrap, loadPosAppointment, receptionAction } from "@/lib/api/browser-client";
import type { CalendarEvent } from "@/lib/api/types";
import { withBasePath } from "@/lib/base-path";
import { eventTimeLabel } from "@/lib/calendar-utils";
import { isInactiveAppointmentStatus } from "@/lib/appointment-status";
import { customerInitials } from "@/components/pos/pos-utils";
import { CheckInIdValidator } from "@/components/reception/check-in-id-validator";
import { CheckInQrScanner } from "@/components/reception/check-in-qr-scanner";
import { AppointmentRescheduleSection } from "@/components/reception/appointment-reschedule";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function statusTone(status?: string): "default" | "success" | "warning" | "danger" | "muted" | "accent" {
  const s = (status ?? "").toLowerCase();
  if (s === "completed") return "success";
  if (s.includes("service") || s.includes("checked") || s.includes("wait")) return "warning";
  if (s === "draft") return "danger";
  if (s.includes("cancel") || s.includes("no show")) return "muted";
  return "accent";
}

function isPaid(paymentStatus?: string): boolean {
  return paymentStatus === "Paid" || paymentStatus === "Deposit Paid";
}

function phoneDigits(value?: string): string {
  return (value ?? "").replace(/[^\d+]/g, "");
}

function whatsAppHref(mobile?: string): string | null {
  const digits = phoneDigits(mobile).replace(/^\+/, "");
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

function CustomerContactSection({
  mobile,
  email,
}: {
  mobile?: string;
  email?: string;
}) {
  const whatsapp = whatsAppHref(mobile);

  return (
    <section className="rounded-2xl border border-[color:var(--bc-border)] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--bc-muted)]">
        Customer contact
      </p>
      <p className="mt-1 text-xs text-[color:var(--bc-muted)]">
        Call or message if the guest is late or has not checked in.
      </p>

      {mobile ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <a
            href={`tel:${phoneDigits(mobile)}`}
            className="bc-btn-dark flex min-h-11 flex-1 items-center justify-center gap-2 px-4 text-sm"
          >
            <span aria-hidden>📞</span>
            Call {mobile}
          </a>
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[var(--bc-radius-pill)] border border-[#25D366]/30 bg-[#25D366]/10 px-4 text-sm font-semibold text-[#128C7E] hover:bg-[#25D366]/20"
            >
              WhatsApp
            </a>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-[color:var(--bc-accent-muted)] px-3 py-2 text-sm text-[color:var(--bc-muted)]">
          No phone number on file for this customer.
        </p>
      )}

      {email ? (
        <a
          href={`mailto:${email}`}
          className="mt-3 block truncate text-sm font-medium text-[color:var(--bc-secondary)] underline-offset-2 hover:underline"
        >
          {email}
        </a>
      ) : null}
    </section>
  );
}

export function AppointmentActionPanel({
  event,
  onUpdated,
  onClose,
  variant = "default",
  beautyBranch,
}: {
  event: CalendarEvent;
  onUpdated?: () => void;
  onClose?: () => void;
  variant?: "default" | "modal";
  beautyBranch?: string;
}) {
  const appointment = event.appointment ?? event.name;
  const appointmentStatus = event.appointment_status ?? "Booked";
  const status = appointmentStatus;
  const serviceRow = event.service_row;
  const paid = isPaid(event.payment_status);
  const isModal = variant === "modal";

  const [requirePaymentBeforeService, setRequirePaymentBeforeService] = useState(true);
  const [requirePaymentForCheckIn, setRequirePaymentForCheckIn] = useState(true);
  const [requireQrForCheckIn, setRequireQrForCheckIn] = useState(false);
  const [requireIdForCheckIn, setRequireIdForCheckIn] = useState(true);
  const [requireCheckInBeforeService, setRequireCheckInBeforeService] = useState(true);
  const [requireInvoiceBeforeService, setRequireInvoiceBeforeService] = useState(true);
  const [canCheckInRole, setCanCheckInRole] = useState(false);
  const router = useRouter();
  const [canStartServiceRole, setCanStartServiceRole] = useState(false);
  const [canCompleteServiceRole, setCanCompleteServiceRole] = useState(false);
  const [checkInToken, setCheckInToken] = useState<string | null>(null);
  const [checkInIdVerified, setCheckInIdVerified] = useState(false);
  const [verifiedCheckInId, setVerifiedCheckInId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmNoShow, setConfirmNoShow] = useState(false);
  const [hasInvoice, setHasInvoice] = useState(Boolean(event.has_invoice));

  useEffect(() => {
    setHasInvoice(Boolean(event.has_invoice));
  }, [event.has_invoice, appointment]);

  useEffect(() => {
    if (!appointment) return;
    loadPosAppointment(appointment)
      .then((appt) => setHasInvoice(Boolean(appt.has_invoice)))
      .catch(() => {});
  }, [appointment, status]);

  useEffect(() => {
    fetchBootstrap()
      .then((b) => {
        setRequirePaymentBeforeService(Boolean(b.salon_payment?.require_payment_before_service));
        setRequirePaymentForCheckIn(Boolean(b.salon_payment?.require_payment_for_check_in ?? true));
        setRequireQrForCheckIn(Boolean(b.salon_payment?.require_qr_for_check_in));
        setRequireIdForCheckIn(Boolean(b.salon_payment?.require_id_for_check_in ?? true));
        setRequireCheckInBeforeService(Boolean(b.salon_payment?.require_check_in_before_service ?? true));
        setRequireInvoiceBeforeService(Boolean(b.salon_payment?.require_invoice_before_service ?? true));
        setCanCheckInRole(Boolean(b.staff_workflow?.can_check_in));
        setCanStartServiceRole(Boolean(b.staff_workflow?.can_start_service));
        setCanCompleteServiceRole(Boolean(b.staff_workflow?.can_complete_service));
      })
      .catch(() => {
        setRequirePaymentBeforeService(true);
        setRequirePaymentForCheckIn(true);
        setRequireQrForCheckIn(false);
        setRequireIdForCheckIn(true);
        setRequireCheckInBeforeService(true);
      });
  }, []);

  if (!appointment) return null;

  async function act(method: string, body: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      await receptionAction(method, { name: appointment, ...body });
      onUpdated?.();
    } finally {
      setBusy(false);
    }
  }

  async function checkInAndOpenPos() {
    setBusy(true);
    try {
      await receptionAction("beauty_cloud.api.reception.check_in", {
        name: appointment,
        check_in_token: checkInToken ?? undefined,
        check_in_id: verifiedCheckInId ?? undefined,
      });
      onUpdated?.();
      if (requireInvoiceBeforeService && appointment) {
        router.push(
          withBasePath(
            `/staff/pos?appointment=${encodeURIComponent(appointment)}&issue_invoice=1`,
          ),
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function markNoShow() {
    setConfirmNoShow(false);
    await act("beauty_cloud.api.reception.no_show");
  }

  async function restoreAppointment() {
    await act("beauty_cloud.api.reception.restore");
  }

  const posHref = withBasePath(
    `/staff/pos?appointment=${encodeURIComponent(appointment ?? "")}&issue_invoice=1`,
  );
  const timeLabel = eventTimeLabel(event.start ?? event.start_time, event.end ?? event.end_time);

  const canConfirm = status === "Draft";
  const canCheckIn =
    canCheckInRole && ["Draft", "Booked", "Confirmed"].includes(status);
  const checkInVerificationReady = requireQrForCheckIn
    ? Boolean(checkInToken)
    : requireIdForCheckIn
      ? checkInIdVerified
      : false;
  const paymentBlocksCheckIn = requirePaymentForCheckIn && !paid;
  const checkInReady = canCheckIn && checkInVerificationReady && !paymentBlocksCheckIn;
  const paymentBlocksService = requirePaymentBeforeService && !paid;
  const invoiceReady = !requireInvoiceBeforeService || hasInvoice;
  const canStart =
    canStartServiceRole &&
    !paymentBlocksService &&
    invoiceReady &&
    (requireCheckInBeforeService
      ? ["Checked In", "Waiting", "Partially Completed"].includes(status)
      : ["Draft", "Booked", "Confirmed", "Checked In", "Waiting", "Partially Completed"].includes(status));
  const awaitingInvoice =
    requireInvoiceBeforeService &&
    !hasInvoice &&
    canStartServiceRole &&
    ["Checked In", "Waiting"].includes(status);
  const canComplete =
    canCompleteServiceRole &&
    !paymentBlocksService &&
    ["In Service", "Partially Completed"].includes(status);
  const awaitingCheckIn =
    requireCheckInBeforeService &&
    canStartServiceRole &&
    ["Booked", "Confirmed"].includes(status);
  const canNoShow = ["Booked", "Confirmed", "Checked In", "Waiting"].includes(status);
  const isInactive = isInactiveAppointmentStatus(status);
  const canReschedule = !isInactive && !["Completed", "In Service", "Partially Completed"].includes(status);
  const branch = beautyBranch ?? event.beauty_branch;

  if (isModal) {
    return (
      <div className="flex min-h-0 flex-col">
        <div className="relative shrink-0 overflow-hidden bg-[image:var(--bc-hero-gradient)] px-5 pb-5 pt-4 sm:px-6 sm:pt-5">
          <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[color:var(--bc-accent)]/25" />
          <div className="relative flex items-start gap-4">
            <span className="bc-avatar shrink-0 text-lg">
              {customerInitials(event.customer_name ?? "Guest")}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xl font-bold tracking-tight">
                    {event.customer_name ?? "Guest"}
                  </p>
                  <p className="mt-0.5 text-sm text-[color:var(--bc-muted)]">
                    {event.service_name ?? "Service"}
                  </p>
                </div>
                {onClose ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 text-xl text-[color:var(--bc-muted)] shadow-sm hover:bg-white hover:text-[color:var(--bc-text)]"
                    aria-label="Close"
                  >
                    ×
                  </button>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={statusTone(status)}>{status}</Badge>
                <Badge tone={paid ? "success" : "warning"}>{event.payment_status ?? "Unpaid"}</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-[color:var(--bc-accent-muted)] px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-[color:var(--bc-muted)]">
                Time
              </dt>
              <dd className="mt-1 font-semibold">{timeLabel || "—"}</dd>
            </div>
            <div className="rounded-2xl bg-[color:var(--bc-accent-muted)] px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-[color:var(--bc-muted)]">
                Beautician
              </dt>
              <dd className="mt-1 font-semibold">{event.employee_name ?? "Unassigned"}</dd>
            </div>
            <div className="col-span-2 rounded-2xl bg-[color:var(--bc-beige)]/60 px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-[color:var(--bc-muted)]">
                Booking
              </dt>
              <dd className="mt-1 font-semibold">{appointment}</dd>
            </div>
          </dl>

          {canReschedule ? (
            <AppointmentRescheduleSection
              appointment={appointment}
              beautyBranch={branch}
              beautyService={event.beauty_service}
              serviceName={event.service_name}
              serviceRow={event.service_row}
              appointmentDate={event.appointment_date ?? event.start?.slice(0, 10)}
              employee={event.employee}
              employeeName={event.employee_name}
              disabled={busy}
              onUpdated={onUpdated}
            />
          ) : null}

          <CustomerContactSection
            mobile={event.customer_mobile}
            email={event.customer_email}
          />

          {paymentBlocksCheckIn ? (
            <p className="rounded-2xl bg-[color:var(--bc-accent-light)] px-4 py-3 text-sm leading-relaxed text-[color:var(--bc-secondary)]">
              Payment is required before check-in. Take payment at POS first, then verify the guest and
              check them in.
            </p>
          ) : paymentBlocksService ? (
            <p className="rounded-2xl bg-[color:var(--bc-accent-light)] px-4 py-3 text-sm leading-relaxed text-[color:var(--bc-secondary)]">
              Payment is required before the service can start. Use POS to print a receipt if not paid
              yet.
            </p>
          ) : awaitingCheckIn ? (
            <p className="rounded-2xl bg-[color:var(--bc-accent-light)] px-4 py-3 text-sm leading-relaxed text-[color:var(--bc-secondary)]">
              Reception must check in this guest before you can start the service.
            </p>
          ) : null}

          {isInactive ? (
            <p className="rounded-2xl border border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] px-4 py-3 text-sm leading-relaxed text-[color:var(--bc-muted)]">
              This appointment is marked as <strong>{status}</strong>, which is why it shows crossed out on
              the calendar.
              {paid ? (
                <>
                  {" "}
                  Payment is complete — tap <strong>Restore appointment</strong> below to remove the cross
                  and continue the service.
                </>
              ) : (
                <> Tap Restore appointment below if this was a mistake.</>
              )}
            </p>
          ) : null}

          {canCheckIn && requireQrForCheckIn ? (
            <CheckInQrScanner
              expectedAppointment={appointment}
              onVerified={(payload) => setCheckInToken(payload.token)}
              onClear={() => setCheckInToken(null)}
            />
          ) : null}
          {canCheckIn && !requireQrForCheckIn && requireIdForCheckIn ? (
            <CheckInIdValidator
              expectedAppointment={appointment ?? ""}
              onVerified={(id) => {
                setCheckInIdVerified(true);
                setVerifiedCheckInId(id);
              }}
              onClear={() => {
                setCheckInIdVerified(false);
                setVerifiedCheckInId(null);
              }}
            />
          ) : null}
        </div>

        <div className="shrink-0 border-t border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] px-5 py-4 sm:px-6">
          <div className="grid gap-2 sm:grid-cols-2">
            {!paid ? (
              <Link href={posHref} className="bc-btn-dark w-full sm:col-span-2">
                Pay at POS
              </Link>
            ) : null}
            {canConfirm ? (
              <Button variant="secondary" disabled={busy} onClick={() => act("beauty_cloud.api.reception.confirm")}>
                Confirm booking
              </Button>
            ) : null}
            {canCheckIn ? (
              <Button
                variant="secondary"
                disabled={busy || !checkInReady}
                onClick={() => void checkInAndOpenPos()}
              >
                {paymentBlocksCheckIn
                  ? "Pay before check-in"
                  : requireQrForCheckIn && !checkInToken
                    ? "Scan QR to check in"
                    : requireIdForCheckIn && !requireQrForCheckIn && !checkInIdVerified
                      ? "Verify ID to check in"
                      : requireInvoiceBeforeService
                        ? "Check in & issue invoice"
                        : "Check in"}
              </Button>
            ) : null}
            {requireInvoiceBeforeService &&
            ["Checked In", "Waiting"].includes(status) &&
            canCheckInRole &&
            !hasInvoice ? (
              <Link href={posHref} className="bc-btn-dark w-full sm:col-span-2 text-center">
                {paid ? "Issue salon invoice at POS" : "Collect payment & invoice at POS"}
              </Link>
            ) : null}
            {hasInvoice && ["Checked In", "Waiting", "In Service", "Partially Completed"].includes(status) ? (
              <p className="sm:col-span-2 text-center text-sm font-medium text-[color:var(--bc-success)]">
                Salon invoice issued
              </p>
            ) : null}
            {awaitingInvoice ? (
              <p className="sm:col-span-2 text-center text-sm text-[color:var(--bc-muted)]">
                Issue salon invoice at POS before starting the service.
              </p>
            ) : null}
            {canStart ? (
              <Button
                disabled={busy}
                onClick={() =>
                  act("beauty_cloud.api.reception.start", {
                    service_row: serviceRow ?? undefined,
                  })
                }
              >
                Start service
              </Button>
            ) : null}
            {canComplete ? (
              <Button
                variant="accent"
                disabled={busy}
                onClick={() =>
                  act("beauty_cloud.api.reception.complete", {
                    service_row: serviceRow ?? undefined,
                  })
                }
              >
                Complete service
              </Button>
            ) : null}
            {canNoShow ? (
              <Button variant="ghost" disabled={busy} onClick={() => setConfirmNoShow(true)}>
                Mark no show
              </Button>
            ) : null}
            {isInactive ? (
              <Button disabled={busy} onClick={restoreAppointment}>
                Restore appointment
              </Button>
            ) : null}
          </div>
        </div>

        <ConfirmDialog
          open={confirmNoShow}
          onClose={() => setConfirmNoShow(false)}
          onConfirm={markNoShow}
          title="Mark as no show?"
          confirmLabel="Mark no show"
          cancelLabel="Keep appointment"
          busy={busy}
        >
          <p>
            This will mark <strong>{event.customer_name ?? "this guest"}</strong> (
            <strong>{appointment}</strong>) as a no-show and cancel their pending services.
          </p>
          <p className="mt-2">
            The appointment will stay on the calendar with a crossed-out marker so staff can see what
            happened.
          </p>
        </ConfirmDialog>
      </div>
    );
  }

  return (
    <div className="bc-panel border-2 border-[color:var(--bc-secondary)]/20 p-4 shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold">{event.customer_name ?? "Guest"}</p>
          <p className="text-sm text-[color:var(--bc-muted)]">
            {event.service_name ?? "Service"} · {event.employee_name ?? "Unassigned"}
          </p>
          <p className="mt-1 text-xs text-[color:var(--bc-muted)]">
            {appointment} · {event.payment_status ?? "Unpaid"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={statusTone(status)}>{status}</Badge>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--bc-muted)] hover:bg-[color:var(--bc-accent-light)] hover:text-[color:var(--bc-text)]"
              aria-label="Close"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      {paymentBlocksCheckIn ? (
        <p className="mt-3 rounded-2xl bg-[color:var(--bc-accent-light)] px-4 py-3 text-sm text-[color:var(--bc-secondary)]">
          Payment is required before check-in. Take payment at POS first, then verify the guest.
        </p>
      ) : paymentBlocksService ? (
        <p className="mt-3 rounded-2xl bg-[color:var(--bc-accent-light)] px-4 py-3 text-sm text-[color:var(--bc-secondary)]">
          Payment is required before the service can start.
        </p>
      ) : awaitingCheckIn ? (
        <p className="mt-3 rounded-2xl bg-[color:var(--bc-accent-light)] px-4 py-3 text-sm text-[color:var(--bc-secondary)]">
          Reception must check in this guest before you can start the service.
        </p>
      ) : null}

      {isInactive ? (
        <p className="mt-3 rounded-2xl border border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] px-4 py-3 text-sm text-[color:var(--bc-muted)]">
          Marked as <strong>{status}</strong> — crossed out on the calendar.
          {paid ? " Payment is complete. Restore to continue the service." : " Restore if this was a mistake."}
        </p>
      ) : null}

      {canReschedule ? (
        <div className="mt-3">
          <AppointmentRescheduleSection
            appointment={appointment}
            beautyBranch={branch}
            beautyService={event.beauty_service}
            serviceName={event.service_name}
            serviceRow={event.service_row}
            appointmentDate={event.appointment_date ?? event.start?.slice(0, 10)}
            employee={event.employee}
            employeeName={event.employee_name}
            disabled={busy}
            onUpdated={onUpdated}
          />
        </div>
      ) : null}

      <CustomerContactSection mobile={event.customer_mobile} email={event.customer_email} />

      {canCheckIn && requireQrForCheckIn ? (
        <CheckInQrScanner
          expectedAppointment={appointment}
          onVerified={(payload) => setCheckInToken(payload.token)}
          onClear={() => setCheckInToken(null)}
        />
      ) : null}
      {canCheckIn && !requireQrForCheckIn && requireIdForCheckIn ? (
        <CheckInIdValidator
          expectedAppointment={appointment ?? ""}
          onVerified={(id) => {
            setCheckInIdVerified(true);
            setVerifiedCheckInId(id);
          }}
          onClear={() => {
            setCheckInIdVerified(false);
            setVerifiedCheckInId(null);
          }}
        />
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {!paid ? (
          <Link href={posHref} className="bc-btn-dark">
            Pay at POS
          </Link>
        ) : null}
        {canConfirm ? (
          <Button variant="secondary" disabled={busy} onClick={() => act("beauty_cloud.api.reception.confirm")}>
            Confirm
          </Button>
        ) : null}
        {canCheckIn ? (
          <Button
            variant="secondary"
            disabled={busy || !checkInReady}
            onClick={() => void checkInAndOpenPos()}
          >
            {paymentBlocksCheckIn
              ? "Pay before check-in"
              : requireQrForCheckIn && !checkInToken
                ? "Scan QR to check in"
                : requireIdForCheckIn && !requireQrForCheckIn && !checkInIdVerified
                  ? "Verify ID to check in"
                  : requireInvoiceBeforeService
                    ? "Check in & issue invoice"
                    : "Check in"}
          </Button>
        ) : null}
        {requireInvoiceBeforeService &&
        ["Checked In", "Waiting"].includes(status) &&
        canCheckInRole &&
        !hasInvoice ? (
          <Link href={posHref} className="bc-btn-dark">
            {paid ? "Issue invoice at POS" : "Pay & invoice at POS"}
          </Link>
        ) : null}
        {awaitingInvoice ? (
          <span className="text-sm text-[color:var(--bc-muted)]">Awaiting salon invoice</span>
        ) : null}
        {canStart ? (
          <Button
            disabled={busy}
            onClick={() =>
              act("beauty_cloud.api.reception.start", {
                service_row: serviceRow ?? undefined,
              })
            }
          >
            Start service
          </Button>
        ) : null}
        {canComplete ? (
          <Button
            variant="accent"
            disabled={busy}
            onClick={() =>
              act("beauty_cloud.api.reception.complete", {
                service_row: serviceRow ?? undefined,
              })
            }
          >
            Complete
          </Button>
        ) : null}
        {canNoShow ? (
          <Button variant="ghost" disabled={busy} onClick={() => setConfirmNoShow(true)}>
            No show
          </Button>
        ) : null}
        {isInactive ? (
          <Button disabled={busy} onClick={restoreAppointment}>
            Restore
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmNoShow}
        onClose={() => setConfirmNoShow(false)}
        onConfirm={markNoShow}
        title="Mark as no show?"
        confirmLabel="Mark no show"
        cancelLabel="Keep appointment"
        busy={busy}
      >
        <p>
          This will mark <strong>{event.customer_name ?? "this guest"}</strong> (
          <strong>{appointment}</strong>) as a no-show and cancel their pending services.
        </p>
        <p className="mt-2">
          The appointment will stay on the calendar with a crossed-out marker so staff can see what
          happened.
        </p>
      </ConfirmDialog>
    </div>
  );
}

export function QueueAppointmentActions({
  appointment,
  status,
  services,
  customer_name,
  customer_mobile,
  customer_email,
  payment_status,
  beauty_branch,
  appointment_date,
  onUpdated,
}: {
  appointment: string;
  status?: string;
  services?: Array<{
    idx?: number;
    service_name?: string;
    employee_name?: string;
    employee?: string;
    beauty_service?: string;
    start_time?: string;
  }>;
  customer_name?: string;
  customer_mobile?: string;
  customer_email?: string;
  payment_status?: string;
  beauty_branch?: string;
  appointment_date?: string;
  onUpdated?: () => void;
}) {
  const firstService = services?.[0];
  return (
    <AppointmentActionPanel
      event={{
        appointment,
        appointment_status: status,
        service_row: firstService?.idx,
        service_name: firstService?.service_name,
        employee: firstService?.employee,
        employee_name: firstService?.employee_name,
        customer_name,
        customer_mobile,
        customer_email,
        payment_status,
        status,
        beauty_branch,
        beauty_service: firstService?.beauty_service,
        appointment_date,
        start: firstService?.start_time,
        start_time: firstService?.start_time,
      }}
      beautyBranch={beauty_branch}
      onUpdated={onUpdated}
    />
  );
}
