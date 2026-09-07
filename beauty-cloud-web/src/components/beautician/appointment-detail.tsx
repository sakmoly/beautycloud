"use client";

import { useCallback, useEffect, useState } from "react";

import { callBeautyMethod } from "@/lib/api/browser-client";
import { AppointmentActionPanel } from "@/components/reception/appointment-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/states";

interface AppointmentDetailResponse {
  appointment?: {
    name?: string;
    beauty_branch?: string;
    appointment_date?: string;
    scheduled_start?: string;
    scheduled_end?: string;
    status?: string;
    payment_status?: string;
    source?: string;
    total_amount?: number;
    notes?: string;
  };
  customer?: {
    customer_name?: string;
    mobile_masked?: string;
    email?: string;
  };
  my_services?: Array<{
    idx?: number;
    service_name?: string;
    employee_name?: string;
    start_time?: string;
    end_time?: string;
    status?: string;
    amount?: number;
  }>;
  consultations?: Array<{ name?: string; notes?: string; desired_style?: string }>;
}

function formatTime(value?: string): string {
  if (!value) return "—";
  return String(value).slice(11, 16);
}

export function BeauticianAppointmentDetail({ name }: { name: string }) {
  const [detail, setDetail] = useState<AppointmentDetailResponse | null>(null);
  const [catalogue, setCatalogue] = useState<
    Array<{ item_code?: string; item_name?: string; rate?: number; stock_qty?: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [appt, cat] = await Promise.all([
        callBeautyMethod<AppointmentDetailResponse>({
          method: "beauty_cloud.api.beautician.get_appointment_detail",
          params: { name },
        }),
        callBeautyMethod<{ items?: Array<{ item_code?: string; item_name?: string; rate?: number; stock_qty?: number }> }>({
          method: "beauty_cloud.api.beautician.get_catalogue",
          params: { beauty_branch: "BBY-MAIN", page_size: 12 },
        }),
      ]);
      setDetail(appt);
      setCatalogue(cat.items ?? []);
      const existingNotes = appt.consultations?.[0]?.notes ?? appt.consultations?.[0]?.desired_style;
      if (existingNotes) setNotes(existingNotes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load appointment");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [name]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveConsultation() {
    setSaving(true);
    setSaved(false);
    try {
      await callBeautyMethod({
        method: "beauty_cloud.api.beautician.save_consultation_record",
        body: {
          beauty_appointment: name,
          notes,
          desired_style: notes,
        },
      });
      setSaved(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save consultation");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState title="Loading appointment" />;

  if (error && !detail) {
    return (
      <ErrorState
        title="Could not load appointment"
        description={error}
        action={
          <Button variant="secondary" onClick={load}>
            Try again
          </Button>
        }
      />
    );
  }

  const appt = detail?.appointment;
  const service = detail?.my_services?.[0];

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-xl bg-[color:var(--bc-danger)]/10 px-4 py-3 text-sm text-[color:var(--bc-danger)]">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Appointment detail">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[color:var(--bc-muted)]">Reference</dt>
              <dd className="font-medium">{appt?.name ?? name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[color:var(--bc-muted)]">Customer</dt>
              <dd className="font-medium">{detail?.customer?.customer_name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[color:var(--bc-muted)]">Mobile</dt>
              <dd>{detail?.customer?.mobile_masked ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[color:var(--bc-muted)]">Date</dt>
              <dd>{appt?.appointment_date ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[color:var(--bc-muted)]">Time</dt>
              <dd>
                {formatTime(appt?.scheduled_start)} – {formatTime(appt?.scheduled_end)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[color:var(--bc-muted)]">Status</dt>
              <dd>
                <Badge tone="default">{appt?.status ?? "—"}</Badge>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[color:var(--bc-muted)]">Payment</dt>
              <dd>{appt?.payment_status ?? "Unpaid"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[color:var(--bc-muted)]">Source</dt>
              <dd>{appt?.source ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[color:var(--bc-muted)]">Amount</dt>
              <dd>SAR {appt?.total_amount ?? service?.amount ?? 0}</dd>
            </div>
          </dl>

          {detail?.my_services && detail.my_services.length > 0 ? (
            <div className="mt-4 border-t border-[color:var(--bc-border)] pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--bc-muted)]">
                Services
              </p>
              <ul className="space-y-2">
                {detail.my_services.map((line) => (
                  <li
                    key={`${line.idx}-${line.service_name}`}
                    className="rounded-lg border border-[color:var(--bc-border)] px-3 py-2 text-sm"
                  >
                    <p className="font-medium">{line.service_name}</p>
                    <p className="text-[color:var(--bc-muted)]">
                      {line.employee_name ?? "Unassigned"} · {formatTime(line.start_time)} ·{" "}
                      {line.status ?? "Pending"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>

        <Card title="Consultation notes">
          <textarea
            className="min-h-32 w-full rounded-[var(--bc-radius)] border border-[color:var(--bc-border)] p-3 text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Skin type, preferences, recommendations…"
          />
          <div className="mt-3 flex items-center gap-3">
            <Button onClick={saveConsultation} disabled={saving}>
              {saving ? "Saving…" : "Save consultation"}
            </Button>
            {saved ? <span className="text-sm text-[color:var(--bc-success)]">Saved</span> : null}
          </div>
        </Card>
      </div>

      {service ? (
        <AppointmentActionPanel
          event={{
            appointment: name,
            customer_name: detail?.customer?.customer_name,
            service_name: service.service_name,
            employee_name: service.employee_name,
            appointment_status: appt?.status,
            payment_status: appt?.payment_status,
            service_row: service.idx,
          }}
          onUpdated={load}
        />
      ) : null}

      <Card title="Product catalogue">
        {catalogue.length === 0 ? (
          <p className="text-sm text-[color:var(--bc-muted)]">No retail products in stock for this branch.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {catalogue.map((item) => (
              <li
                key={item.item_code}
                className="rounded-[var(--bc-radius)] border border-[color:var(--bc-border)] px-3 py-2 text-sm"
              >
                <p className="font-medium">{item.item_name ?? item.item_code}</p>
                <p className="text-[color:var(--bc-muted)]">
                  SAR {item.rate ?? 0} · Stock {item.stock_qty ?? 0}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
