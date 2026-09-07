"use client";

import { useEffect, useState } from "react";

import { getSlots, receptionAction } from "@/lib/api/browser-client";
import type { AvailabilitySlot } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

function slotTimeLabel(start?: string): string {
  if (!start || start.length < 16) return start ?? "—";
  const hour = Number(start.slice(11, 13));
  const minute = start.slice(14, 16);
  const suffix = hour >= 12 ? "pm" : "am";
  const displayHour = hour % 12 || 12;
  return minute === "00" ? `${displayHour} ${suffix}` : `${displayHour}:${minute} ${suffix}`;
}

export function AppointmentRescheduleSection({
  appointment,
  beautyBranch,
  beautyService,
  appointmentDate,
  employee,
  employees = [],
  disabled = false,
  onUpdated,
}: {
  appointment: string;
  beautyBranch?: string;
  beautyService?: string;
  appointmentDate?: string;
  employee?: string;
  employees?: Array<{ name: string; employee_name: string }>;
  disabled?: boolean;
  onUpdated?: (newStartTime?: string) => void;
}) {
  const initialDate = appointmentDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(initialDate);
  const [selectedEmployee, setSelectedEmployee] = useState(employee ?? "");
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setDate(initialDate);
    setSelectedEmployee(employee ?? "");
    setSelectedSlot(null);
    setSlots([]);
    setError(null);
    setSavedAt(null);
  }, [appointment, initialDate, employee]);

  async function loadSlots() {
    if (!beautyBranch || !beautyService || !date || !selectedEmployee) {
      setError("Select a date and beautician first.");
      return;
    }
    setLoadingSlots(true);
    setError(null);
    setSelectedSlot(null);
    try {
      const rows = await getSlots({
        beauty_branch: beautyBranch,
        appointment_date: date,
        services: [beautyService],
        employee: selectedEmployee,
      });
      setSlots(rows);
      if (rows.length === 0) {
        setError("No open slots for this date. Try another day or beautician.");
      }
    } catch (e) {
      setSlots([]);
      setError(e instanceof Error ? e.message : "Could not load available times.");
    } finally {
      setLoadingSlots(false);
    }
  }

  async function saveReschedule() {
    if (!selectedSlot?.start_time) return;
    setBusy(true);
    setError(null);
    try {
      await receptionAction("beauty_cloud.api.reception.reschedule", {
        name: appointment,
        start_time: selectedSlot.start_time,
        employee: selectedEmployee,
      });
      setSavedAt(selectedSlot.start_time);
      onUpdated?.(selectedSlot.start_time);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reschedule.");
    } finally {
      setBusy(false);
    }
  }

  if (!beautyBranch || !beautyService) {
    return (
      <section className="rounded-2xl border border-[color:var(--bc-border)] bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--bc-muted)]">
          Reschedule
        </p>
        <p className="mt-2 text-sm text-[color:var(--bc-muted)]">
          Service details are missing for this booking. Change date or time from Beauty Appointment on
          the desk.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[color:var(--bc-border)] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--bc-muted)]">
        Reschedule
      </p>
      <p className="mt-1 text-sm text-[color:var(--bc-muted)]">
        Pick a new date, beautician, and available time slot.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`reschedule-date-${appointment}`}>Date</Label>
          <Input
            id={`reschedule-date-${appointment}`}
            type="date"
            className="mt-1"
            value={date}
            disabled={disabled || busy}
            onChange={(e) => {
              setDate(e.target.value);
              setSelectedSlot(null);
              setSlots([]);
            }}
          />
        </div>
        <div>
          <Label htmlFor={`reschedule-employee-${appointment}`}>Beautician</Label>
          <select
            id={`reschedule-employee-${appointment}`}
            className="mt-1 min-h-11 w-full rounded-xl border border-[color:var(--bc-border)] bg-white px-3"
            value={selectedEmployee}
            disabled={disabled || busy}
            onChange={(e) => {
              setSelectedEmployee(e.target.value);
              setSelectedSlot(null);
              setSlots([]);
            }}
          >
            <option value="">Select beautician</option>
            {employees.map((emp) => (
              <option key={emp.name} value={emp.name}>
                {emp.employee_name}
              </option>
            ))}
            {selectedEmployee &&
            !employees.some((emp) => emp.name === selectedEmployee) &&
            employee ? (
              <option value={employee}>{employee}</option>
            ) : null}
          </select>
        </div>
      </div>

      <div className="mt-3">
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || busy || loadingSlots || !date || !selectedEmployee}
          onClick={loadSlots}
        >
          {loadingSlots ? "Loading times…" : "Show available times"}
        </Button>
      </div>

      {slots.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {slots.map((slot) => {
            const selected = selectedSlot?.start_time === slot.start_time;
            return (
              <button
                key={slot.start_time}
                type="button"
                disabled={disabled || busy}
                onClick={() => setSelectedSlot(slot)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selected
                    ? "bg-[color:var(--bc-secondary)] text-white"
                    : "bg-[color:var(--bc-accent-muted)] text-[color:var(--bc-text)] hover:bg-[color:var(--bc-accent-light)]"
                }`}
              >
                {slotTimeLabel(slot.start_time)}
              </button>
            );
          })}
        </div>
      ) : null}

      {selectedSlot ? (
        <div className="mt-4 space-y-2">
          <Button type="button" disabled={disabled || busy} onClick={saveReschedule}>
            {busy ? "Rescheduling…" : "Reschedule appointment"}
          </Button>
          <p className="text-xs text-[color:var(--bc-muted)]">
            New time: {date} at {slotTimeLabel(selectedSlot.start_time)}
          </p>
        </div>
      ) : null}

      {savedAt ? (
        <p className="mt-3 rounded-xl bg-[color:var(--bc-success)]/10 px-3 py-2 text-sm font-semibold text-[color:var(--bc-success)]">
          Rescheduled to {slotTimeLabel(savedAt)}. The calendar will update shortly.
        </p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-[color:var(--bc-danger)]">{error}</p> : null}
    </section>
  );
}
