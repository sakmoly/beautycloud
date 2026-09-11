"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BranchField } from "@/components/staff/branch-field";
import { QueueAppointmentActions } from "@/components/reception/appointment-actions";
import { customerInitials } from "@/components/pos/pos-utils";
import { getReceptionDashboard, getReceptionQueue } from "@/lib/api/browser-client";
import { withBasePath } from "@/lib/base-path";
import { useStaffBranch } from "@/lib/use-staff-branch";
import type { BeautyAppointment, ReceptionDashboard } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/states";

function formatDisplayDate(isoDate: string): string {
  try {
    return new Date(`${isoDate}T12:00:00`).toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

function formatTime(value?: string): string {
  if (!value) return "—";
  if (value.length >= 16) {
    const hour = Number(value.slice(11, 13));
    const minute = value.slice(14, 16);
    const suffix = hour >= 12 ? "pm" : "am";
    const displayHour = hour % 12 || 12;
    return minute === "00" ? `${displayHour} ${suffix}` : `${displayHour}:${minute} ${suffix}`;
  }
  return value.slice(0, 5);
}

function statusTone(status?: string): "default" | "success" | "warning" | "danger" | "muted" | "accent" {
  const s = (status ?? "").toLowerCase();
  if (s === "completed") return "success";
  if (s.includes("service") || s.includes("checked") || s.includes("wait")) return "warning";
  if (s === "draft") return "danger";
  if (s === "booked" || s === "confirmed") return "accent";
  return "muted";
}

function dashboardSummary(dashboard: ReceptionDashboard | null) {
  return dashboard?.summary ?? dashboard;
}

export function ReceptionDashboardView() {
  const { branch, setBranch, branches, branchLocked, branchLabel, ready } = useStaffBranch();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dashboard, setDashboard] = useState<ReceptionDashboard | null>(null);
  const [queue, setQueue] = useState<BeautyAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const [dash, q] = await Promise.all([
        getReceptionDashboard(branch, date),
        getReceptionQueue(branch, date),
      ]);
      setDashboard(dash);
      setQueue(q);
      setSelectedQueueId((current) =>
        current && q.some((row) => row.name === current) ? current : null,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!ready || !branch) return;
    refresh();
  }, [branch, date, ready]);

  if (loading && !dashboard) {
    return <LoadingState title="Loading reception dashboard" />;
  }

  const summary = dashboardSummary(dashboard);
  const stats = [
    { label: "Arriving", value: summary?.booked ?? 0, hint: "Booked & confirmed" },
    { label: "Checked in", value: summary?.checked_in ?? 0, hint: "At the salon" },
    { label: "Waiting", value: summary?.waiting ?? 0, hint: "Ready for service" },
    { label: "In service", value: summary?.in_service ?? 0, hint: "On the floor" },
    { label: "Completed", value: summary?.completed ?? 0, hint: "Finished today" },
    {
      label: "Expected",
      value: `SAR ${(summary?.expected_revenue ?? 0).toLocaleString()}`,
      hint: "Unpaid bookings",
      isRevenue: true,
    },
  ];

  const queueHref = withBasePath(`/staff/reception/queue?date=${date}`);
  const calendarHref = withBasePath(`/staff/reception/calendar?date=${date}`);
  const posHref = withBasePath("/staff/pos");
  const bookHref = withBasePath("/book");

  return (
    <div className="space-y-6">
      <div className="bc-hero">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[color:var(--bc-muted)]">
              {branchLabel ?? branch} · {formatDisplayDate(date)}
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">Today at the front desk</h2>
            <p className="bc-section-sub mt-1">
              {summary?.total_appointments ?? 0} appointments · {queue.length} need attention
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={calendarHref}
              className="rounded-full border border-[color:var(--bc-border)] bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-[color:var(--bc-accent-muted)]"
            >
              Calendar
            </Link>
            <Link
              href={queueHref}
              className="rounded-full border border-[color:var(--bc-border)] bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-[color:var(--bc-accent-muted)]"
            >
              Full queue
            </Link>
            <Link
              href={posHref}
              className="rounded-full bg-[color:var(--bc-secondary)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
            >
              Open POS
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[color:var(--bc-border)] bg-white p-4 shadow-sm">
        <BranchField
          className="min-w-[140px] flex-1"
          branch={branch}
          branches={branches}
          branchLocked={branchLocked}
          branchLabel={branchLabel}
          onChange={setBranch}
        />
        <div className="min-w-[140px] flex-1">
          <Label htmlFor="reception-date">Date</Label>
          <Input
            id="reception-date"
            type="date"
            className="mt-1.5"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button variant="secondary" onClick={refresh} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <article key={stat.label} className="bc-panel px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--bc-muted)]">
              {stat.label}
            </p>
            <p
              className={`mt-1 font-bold tracking-tight ${
                stat.isRevenue ? "text-lg" : "text-3xl"
              }`}
            >
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-[color:var(--bc-muted)]">{stat.hint}</p>
          </article>
        ))}
      </div>

      <section className="bc-panel overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-[color:var(--bc-border)] px-5 py-4">
          <div>
            <h3 className="bc-section-title">Guests today</h3>
            <p className="bc-section-sub">
              Tap a guest to check in, send to POS, or update status.
            </p>
          </div>
          <Link href={queueHref} className="text-sm font-semibold text-[color:var(--bc-secondary)]">
            View all
          </Link>
        </div>

        <div className="space-y-2 p-4">
          {queue.length === 0 ? (
            <div className="pos-empty-state py-10">
              <p className="font-semibold">No active appointments</p>
              <p className="mt-1 text-sm text-[color:var(--bc-muted)]">
                Guests will appear here once they have a booking for this date.
              </p>
              <Link
                href={bookHref}
                className="mt-4 inline-block text-sm font-semibold text-[color:var(--bc-secondary)]"
              >
                Create a booking
              </Link>
            </div>
          ) : (
            queue.map((appointment) => {
              const service = appointment.services?.[0];
              const expanded = selectedQueueId === appointment.name;
              return (
                <article
                  key={appointment.name}
                  className={`overflow-hidden rounded-2xl border transition ${
                    expanded
                      ? "border-[color:var(--bc-secondary)]/40 bg-[color:var(--bc-accent-muted)]/30"
                      : "border-[color:var(--bc-border)] bg-white"
                  }`}
                >
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 p-4 text-left"
                    onClick={() =>
                      setSelectedQueueId(expanded ? null : appointment.name ?? null)
                    }
                  >
                    <span className="bc-avatar shrink-0">
                      {customerInitials(appointment.customer_name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-base font-bold">
                          {appointment.customer_name ?? appointment.name}
                        </p>
                        <Badge tone={statusTone(appointment.status)}>{appointment.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-[color:var(--bc-muted)]">
                        {service?.service_name ?? "Service"} ·{" "}
                        {service?.employee_name ?? "Unassigned"} ·{" "}
                        {formatTime(appointment.scheduled_start ?? service?.start_time)}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--bc-muted)]">
                        {appointment.payment_status ?? "Unpaid"}
                        {appointment.total_amount ? ` · SAR ${appointment.total_amount}` : ""}
                      </p>
                    </div>
                  </button>
                  {expanded ? (
                    <div className="border-t border-[color:var(--bc-border)] bg-white/80 p-4">
                      <QueueAppointmentActions
                        appointment={appointment.name ?? ""}
                        status={appointment.status}
                        customer_name={appointment.customer_name}
                        customer_mobile={appointment.customer_mobile ?? appointment.mobile}
                        customer_email={appointment.customer_email}
                        payment_status={appointment.payment_status}
                        beauty_branch={appointment.beauty_branch ?? branch}
                        appointment_date={appointment.appointment_date ?? date}
                        services={appointment.services}
                        onUpdated={refresh}
                      />
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
