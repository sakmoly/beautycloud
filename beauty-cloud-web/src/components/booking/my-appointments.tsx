"use client";

import { useEffect, useState } from "react";

import { printBookingReceipt } from "@/components/booking/booking-receipt-print";
import { AppointmentCheckInQr } from "@/components/booking/appointment-check-in-qr";
import {
  getBookingReceipt,
  getCustomerSessionStatus,
  getMyAppointments,
  logoutCustomerSession,
  requestCustomerOtp,
  verifyCustomerOtp,
} from "@/lib/api/browser-client";
import type { BeautyAppointment } from "@/lib/api/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/ui/states";

type LoginMethod = "mobile" | "email";

function maskMobile(mobile: string) {
  const digits = mobile.replace(/\s/g, "");
  if (digits.length <= 4) return mobile;
  return `${digits.slice(0, 4)} *** ${digits.slice(-3)}`;
}

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}***@${domain}`;
}

function statusTone(status?: string): "default" | "success" | "warning" | "danger" | "muted" {
  const s = (status ?? "").toLowerCase();
  if (s.includes("complete")) return "success";
  if (s.includes("cancel") || s.includes("no show")) return "danger";
  if (s.includes("service") || s.includes("checked") || s.includes("wait")) return "warning";
  return "default";
}

export function MyAppointmentsList() {
  const [sessionLabel, setSessionLabel] = useState<string | null>(null);
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("mobile");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [requestId, setRequestId] = useState<string | undefined>();
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const [appointments, setAppointments] = useState<BeautyAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSession() {
    setLoading(true);
    setError(null);
    try {
      const session = await getCustomerSessionStatus();
      if (session.verified && (session.mobile || session.email)) {
        setSessionLabel(
          session.mobile
            ? maskMobile(session.mobile)
            : session.email
              ? maskEmail(session.email)
              : "Verified",
        );
        setAppointments(await getMyAppointments());
      } else {
        setSessionLabel(null);
        setAppointments([]);
      }
    } catch (e) {
      setSessionLabel(null);
      setAppointments([]);
      setError(e instanceof Error ? e.message : "Could not load session");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSession();
  }, []);

  async function sendOtp() {
    const contact =
      loginMethod === "mobile" ? { mobile: mobile.trim() } : { email: email.trim() };
    if (!contact.mobile && !contact.email) return;

    setBusy(true);
    setError(null);
    try {
      const result = await requestCustomerOtp({ ...contact, purpose: "Booking" });
      setRequestId(result.request_id);
      setDevOtp(result.dev_otp);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    const contact =
      loginMethod === "mobile" ? { mobile: mobile.trim() } : { email: email.trim() };
    if ((!contact.mobile && !contact.email) || !otp.trim()) return;

    setBusy(true);
    setError(null);
    try {
      await verifyCustomerOtp({
        ...contact,
        otp: otp.trim(),
        request_id: requestId,
      });
      await loadSession();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await logoutCustomerSession();
    setSessionLabel(null);
    setAppointments([]);
    setMobile("");
    setEmail("");
    setOtp("");
    setRequestId(undefined);
    setDevOtp(undefined);
  }

  async function downloadReceipt(appointment: string) {
    setBusy(true);
    setError(null);
    try {
      const receipt = await getBookingReceipt(appointment);
      printBookingReceipt(receipt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open receipt");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <LoadingState title="Loading your bookings" />;
  }

  if (!sessionLabel) {
    return (
      <div className="space-y-4">
        <Card
          title="Sign in to view bookings"
          description="Use a one-time code sent to your mobile or email — the same verification used when booking online."
          elevated
        >
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={loginMethod === "mobile" ? "primary" : "secondary"}
                onClick={() => {
                  setLoginMethod("mobile");
                  setRequestId(undefined);
                  setDevOtp(undefined);
                  setOtp("");
                }}
              >
                Mobile
              </Button>
              <Button
                variant={loginMethod === "email" ? "primary" : "secondary"}
                onClick={() => {
                  setLoginMethod("email");
                  setRequestId(undefined);
                  setDevOtp(undefined);
                  setOtp("");
                }}
              >
                Email
              </Button>
            </div>

            {loginMethod === "mobile" ? (
              <div>
                <Label htmlFor="mobile">Mobile number</Label>
                <Input
                  id="mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+966 5XX XXX XXXX"
                />
              </div>
            ) : (
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
            )}

            {!requestId ? (
              <Button
                onClick={sendOtp}
                disabled={
                  busy ||
                  (loginMethod === "mobile" ? !mobile.trim() : !email.trim())
                }
              >
                {busy ? "Sending…" : "Send verification code"}
              </Button>
            ) : (
              <>
                {devOtp ? (
                  <div className="rounded-xl border border-[color:var(--bc-warning)]/30 bg-[color:var(--bc-warning)]/8 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--bc-warning)]">
                      Demo verification code
                    </p>
                    <p className="mt-1 font-mono text-2xl font-bold tracking-[0.3em]">{devOtp}</p>
                  </div>
                ) : null}
                <div>
                  <Label htmlFor="otp">Enter code</Label>
                  <Input
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="6-digit code"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={verifyOtp} disabled={busy || otp.length < 4}>
                    {busy ? "Verifying…" : "View my bookings"}
                  </Button>
                  <Button variant="ghost" onClick={sendOtp} disabled={busy}>
                    Resend code
                  </Button>
                </div>
              </>
            )}

            {error ? (
              <p className="text-sm text-[color:var(--bc-danger)]">{error}</p>
            ) : null}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--bc-border)] bg-[color:var(--bc-accent-muted)] px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Signed in</p>
          <p className="text-sm text-[color:var(--bc-muted)]">{sessionLabel}</p>
        </div>
        <Button variant="ghost" onClick={logout}>
          Log out
        </Button>
      </div>

      {error ? <p className="text-sm text-[color:var(--bc-danger)]">{error}</p> : null}

      {appointments.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          description="When you book online with your mobile or email, your appointments will appear here."
        />
      ) : null}

      <div className="grid gap-3">
        {appointments.map((appt) => {
          const service = appt.services?.[0];
          const canReceipt =
            appt.payment_status === "Paid" ||
            appt.payment_status === "Deposit Paid" ||
            appt.online_payment?.status === "Paid" ||
            Boolean(appt.pos_receipt?.invoice);

          return (
            <Card key={appt.name}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{appt.name}</p>
                    <Badge tone={statusTone(appt.status)}>{appt.status}</Badge>
                    <Badge tone={appt.payment_status?.includes("Paid") ? "success" : "warning"}>
                      {appt.payment_status ?? "Unpaid"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-[color:var(--bc-muted)]">
                    {service?.service_name ?? "Service"} · {service?.employee_name ?? "Unassigned"}
                  </p>
                  <p className="mt-1 text-sm">
                    {appt.appointment_date} · {appt.start_time?.slice(11, 16) ?? "—"}
                    {appt.total_amount ? ` · SAR ${appt.total_amount}` : ""}
                  </p>
                  {appt.online_payment?.name ? (
                    <p className="mt-1 text-xs text-[color:var(--bc-muted)]">
                      Online payment: {appt.online_payment.name} ({appt.online_payment.status})
                    </p>
                  ) : null}
                  {appt.pos_receipt?.invoice ? (
                    <p className="mt-1 text-xs text-[color:var(--bc-muted)]">
                      Salon invoice: {appt.pos_receipt.invoice}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-3">
                  <AppointmentCheckInQr appointment={appt.name} guest compact />
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => downloadReceipt(appt.name)}
                  >
                    {canReceipt ? "Download receipt" : "Print summary"}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
