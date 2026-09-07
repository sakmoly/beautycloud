"use client";

import { useEffect, useState } from "react";

import { getReceptionQueue } from "@/lib/api/browser-client";
import type { BeautyAppointment } from "@/lib/api/types";
import { customerInitials } from "@/components/pos/pos-utils";
import { QueueAppointmentActions } from "@/components/reception/appointment-actions";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/states";

function statusTone(status?: string): "default" | "success" | "warning" | "danger" | "muted" | "accent" {
  const s = (status ?? "").toLowerCase();
  if (s === "completed") return "success";
  if (s.includes("service") || s.includes("checked") || s.includes("wait")) return "warning";
  if (s === "draft") return "danger";
  if (s === "booked" || s === "confirmed") return "accent";
  return "muted";
}

function formatTime(value?: string): string {
  if (!value) return "—";
  return value.slice(11, 16);
}

export function ReceptionQueueView() {
  const [branch, setBranch] = useState("BBY-MAIN");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [queue, setQueue] = useState<BeautyAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setQueue(await getReceptionQueue(branch, date));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [branch, date]);

  return (
    <div className="space-y-5">
      <div className="bc-hero">
        <p className="text-sm font-medium text-[color:var(--bc-muted)]">Reception</p>
        <h2 className="text-2xl font-bold tracking-tight">Today&apos;s queue</h2>
        <p className="bc-section-sub">Check in guests and send payments to POS</p>
      </div>

      <div className="pos-filters-bar">
        <div className="min-w-[140px] flex-1">
          <Label htmlFor="branch">Branch</Label>
          <Input id="branch" value={branch} onChange={(e) => setBranch(e.target.value)} className="mt-1.5" />
        </div>
        <div className="min-w-[140px] flex-1">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div className="flex items-end">
          <Button variant="secondary" onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      {loading ? <LoadingState title="Loading queue" /> : null}

      <div className="grid gap-3">
        {queue.map((a) => {
          const service = a.services?.[0];
          const isSelected = selected === a.name;
          return (
            <article
              key={a.name}
              className={`bc-panel overflow-hidden transition ${isSelected ? "ring-2 ring-[color:var(--bc-secondary)]/30" : ""}`}
            >
              <button
                type="button"
                className="w-full p-4 text-left"
                onClick={() => setSelected(isSelected ? null : a.name)}
              >
                <div className="flex items-start gap-3">
                  <span className="bc-avatar">{customerInitials(a.customer_name)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-lg font-bold">{a.customer_name ?? a.name}</p>
                      <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-[color:var(--bc-muted)]">
                      {service?.service_name ?? "Service"} · {service?.employee_name ?? "Unassigned"} ·{" "}
                      {formatTime(a.scheduled_start ?? service?.start_time)}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--bc-muted)]">
                      {a.name} · {a.source ?? "Booking"} · {a.payment_status ?? "Unpaid"}
                      {a.total_amount ? ` · SAR ${a.total_amount}` : ""}
                    </p>
                  </div>
                </div>
              </button>

              {isSelected ? (
                <div className="border-t border-[color:var(--bc-border)] bg-[color:var(--bc-accent-muted)]/40 p-4">
                  <QueueAppointmentActions
                    appointment={a.name}
                    status={a.status}
                    customer_name={a.customer_name}
                    customer_mobile={a.customer_mobile ?? a.mobile}
                    customer_email={a.customer_email}
                    payment_status={a.payment_status}
                    beauty_branch={a.beauty_branch ?? branch}
                    appointment_date={a.appointment_date ?? date}
                    services={a.services}
                    onUpdated={load}
                  />
                </div>
              ) : null}
            </article>
          );
        })}
        {!loading && queue.length === 0 ? (
          <div className="pos-empty-state">No appointments for this date.</div>
        ) : null}
      </div>
    </div>
  );
}
