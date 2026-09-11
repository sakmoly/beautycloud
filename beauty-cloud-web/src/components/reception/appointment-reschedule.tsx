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

type RescheduleEmployee = { name: string; employee_name: string; isAssigned?: boolean };

function sortEmployees(rows: RescheduleEmployee[]): RescheduleEmployee[] {
  return [...rows].sort((a, b) => {
    if (a.isAssigned && !b.isAssigned) return -1;
    if (!a.isAssigned && b.isAssigned) return 1;
    return a.employee_name.localeCompare(b.employee_name);
  });
}

function employeesFromSlots(
  slots: AvailabilitySlot[],
  assignedEmployee?: string,
  assignedEmployeeName?: string,
): RescheduleEmployee[] {
  const byId = new Map<string, RescheduleEmployee>();

  for (const slot of slots) {
    if (!slot.employee || byId.has(slot.employee)) continue;
    byId.set(slot.employee, {
      name: slot.employee,
      employee_name: slot.employee_name,
      isAssigned: slot.employee === assignedEmployee,
    });
  }

  if (assignedEmployee && !byId.has(assignedEmployee)) {
    byId.set(assignedEmployee, {
      name: assignedEmployee,
      employee_name: assignedEmployeeName || assignedEmployee,
      isAssigned: true,
    });
  }

  return sortEmployees([...byId.values()]);
}

export function AppointmentRescheduleSection({
  appointment,
  beautyBranch,
  beautyService,
  serviceName,
  serviceRow,
  appointmentDate,
  employee,
  employeeName,
  disabled = false,
  onUpdated,
}: {
  appointment: string;
  beautyBranch?: string;
  beautyService?: string;
  serviceName?: string;
  serviceRow?: number;
  appointmentDate?: string;
  employee?: string;
  employeeName?: string;
  disabled?: boolean;
  onUpdated?: (newStartTime?: string) => void;
}) {
  const initialDate = appointmentDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(initialDate);
  const [selectedEmployee, setSelectedEmployee] = useState(employee ?? "");
  const [employees, setEmployees] = useState<RescheduleEmployee[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setDate(initialDate);
    setSelectedEmployee(employee ?? "");
    setSelectedSlot(null);
    setSlots([]);
    setEmployees([]);
    setError(null);
    setSavedAt(null);
  }, [appointment, initialDate, employee]);

  useEffect(() => {
    if (!beautyBranch || !beautyService || !date) {
      setEmployees([]);
      return;
    }

    const branch: string = beautyBranch;
    const service: string = beautyService;
    let cancelled = false;
    async function loadBeauticians() {
      setLoadingEmployees(true);
      setError(null);
      try {
        const rows = await getSlots({
          beauty_branch: branch,
          appointment_date: date,
          services: [service],
          booking_channel: "reception",
        });
        if (cancelled) return;

        const nextEmployees = employeesFromSlots(rows, employee, employeeName);
        setEmployees(nextEmployees);

        setSelectedEmployee((current) => {
          if (current && nextEmployees.some((row) => row.name === current)) {
            return current;
          }
          if (employee && nextEmployees.some((row) => row.name === employee)) {
            return employee;
          }
          return nextEmployees[0]?.name ?? "";
        });
        setSelectedSlot(null);
        setSlots([]);

        if (nextEmployees.length === 0) {
          setError("No beauticians are available on this date. Try another day.");
        }
      } catch (e) {
        if (cancelled) return;
        setEmployees([]);
        setError(e instanceof Error ? e.message : "Could not load available beauticians.");
      } finally {
        if (!cancelled) {
          setLoadingEmployees(false);
        }
      }
    }

    void loadBeauticians();
    return () => {
      cancelled = true;
    };
  }, [beautyBranch, beautyService, date, employee, employeeName]);

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
        booking_channel: "reception",
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
        service_row: serviceRow,
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
        {serviceName
          ? `Move ${serviceName} to a new date, beautician, and time slot.`
          : "Pick a new date, beautician, and available time slot."}
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
            disabled={disabled || busy || loadingEmployees || employees.length === 0}
            onChange={(e) => {
              setSelectedEmployee(e.target.value);
              setSelectedSlot(null);
              setSlots([]);
            }}
          >
            <option value="">
              {loadingEmployees ? "Loading beauticians…" : "Select beautician"}
            </option>
            {employees.map((emp) => (
              <option key={emp.name} value={emp.name}>
                {emp.isAssigned ? `${emp.employee_name} (assigned)` : emp.employee_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3">
        <Button
          type="button"
          variant="secondary"
          disabled={
            disabled || busy || loadingSlots || loadingEmployees || !date || !selectedEmployee
          }
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
