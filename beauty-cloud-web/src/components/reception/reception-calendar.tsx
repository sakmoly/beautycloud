"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getBranches,
  getReceptionCalendar,
} from "@/lib/api/browser-client";
import type { CalendarEvent, CalendarContext } from "@/lib/api/types";
import {
  type CalendarView,
  eventDateKey,
  eventTimeLabel,
  formatIsoDate,
  formatPeriodLabel,
  getRangeForView,
  monthGridDays,
  parseLocalDate,
  shiftAnchor,
  startOfWeek,
} from "@/lib/calendar-utils";
import { AppointmentActionPanel } from "@/components/reception/appointment-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { LoadingState } from "@/components/ui/states";

function statusTone(status?: string): "default" | "success" | "warning" | "muted" {
  const s = (status ?? "").toLowerCase();
  if (s.includes("complete")) return "success";
  if (s.includes("wait") || s.includes("service") || s.includes("checked")) return "warning";
  if (s.includes("cancel") || s.includes("no show")) return "muted";
  return "default";
}

function EventCard({
  event,
  compact = false,
  selected = false,
  onSelect,
}: {
  event: CalendarEvent;
  compact?: boolean;
  selected?: boolean;
  onSelect?: (event: CalendarEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(event)}
      className={`w-full rounded-lg border text-left transition ${
        selected
          ? "border-[color:var(--bc-primary)] bg-[color:var(--bc-primary)]/15 ring-2 ring-[color:var(--bc-primary)]/25"
          : "border-[color:var(--bc-primary)]/15 bg-[color:var(--bc-primary)]/5 hover:border-[color:var(--bc-primary)]/35"
      } ${compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm"}`}
    >
      <p className={`font-medium ${compact ? "truncate" : ""}`}>
        {event.customer_name ?? event.title ?? "Appointment"}
      </p>
      {!compact ? (
        <p className="text-[color:var(--bc-muted)]">
          {event.service_name ?? "Service"} · {event.employee_name ?? "Unassigned"}
        </p>
      ) : null}
      <p className="text-[color:var(--bc-muted)]">
        {eventTimeLabel(event.start ?? event.start_time, event.end ?? event.end_time)}
      </p>
      {!compact ? (
        <div className="mt-2">
          <Badge tone={statusTone(event.appointment_status ?? event.status)}>
            {event.appointment_status ?? event.status ?? "Scheduled"}
          </Badge>
        </div>
      ) : null}
    </button>
  );
}

function eventHour(event: CalendarEvent): number | null {
  const start = event.start ?? event.start_time;
  if (!start || start.length < 13) return null;
  const hour = Number(start.slice(11, 13));
  return Number.isNaN(hour) ? null : hour;
}

function eventMatchesColumn(event: CalendarEvent, colName: string): boolean {
  if (colName === "_unassigned") return !event.employee;
  if (colName === "_all") return true;
  return event.employee === colName;
}

function eventSelectionKey(event: CalendarEvent, index: number) {
  return `${event.appointment}-${event.service_row ?? index}`;
}

function eventsMatch(a: CalendarEvent, b: CalendarEvent) {
  return (
    a.appointment === b.appointment &&
    (a.service_row ?? 0) === (b.service_row ?? 0)
  );
}

function ScheduleEventSlot({
  event,
  index,
  selectedEvent,
  onSelect,
  compact = false,
}: {
  event: CalendarEvent;
  index: number;
  selectedEvent: CalendarEvent | null;
  onSelect?: (event: CalendarEvent) => void;
  compact?: boolean;
}) {
  const selected = selectedEvent ? eventsMatch(event, selectedEvent) : false;

  return (
    <EventCard
      event={event}
      compact={compact}
      selected={selected}
      onSelect={onSelect}
    />
  );
}

function DayView({
  events,
  anchor,
  showEmployees,
  selectedEvent,
  onSelect,
}: {
  events: CalendarEvent[];
  anchor: string;
  showEmployees: boolean;
  selectedEvent: CalendarEvent | null;
  onSelect?: (event: CalendarEvent) => void;
}) {
  const dayEvents = events.filter(
    (e) => eventDateKey(e.start ?? e.start_time, e.appointment_date) === anchor,
  );

  const { timedEvents, unscheduledEvents } = useMemo(() => {
    const timed: CalendarEvent[] = [];
    const unscheduled: CalendarEvent[] = [];
    for (const e of dayEvents) {
      if (eventHour(e) === null) unscheduled.push(e);
      else timed.push(e);
    }
    return { timedEvents: timed, unscheduledEvents: unscheduled };
  }, [dayEvents]);

  const activeHours = useMemo(() => {
    const hours = new Set<number>();
    for (const e of timedEvents) {
      const h = eventHour(e);
      if (h !== null) hours.add(h);
    }
    return Array.from(hours).sort((a, b) => a - b);
  }, [timedEvents]);

  const columns = useMemo(() => {
    if (!showEmployees) {
      return dayEvents.length > 0 ? [{ name: "_all", employee_name: "Schedule" }] : [];
    }

    const map = new Map<string, string>();
    for (const e of dayEvents) {
      if (e.employee) map.set(e.employee, e.employee_name ?? e.employee);
    }

    const cols = Array.from(map.entries()).map(([name, employee_name]) => ({
      name,
      employee_name,
    }));

    if (unscheduledEvents.some((e) => !e.employee) || timedEvents.some((e) => !e.employee)) {
      cols.push({ name: "_unassigned", employee_name: "Unassigned" });
    }

    return cols;
  }, [dayEvents, showEmployees, timedEvents, unscheduledEvents]);

  if (dayEvents.length === 0) {
    return (
      <div className="pos-empty-state">No appointments for this day.</div>
    );
  }

  return (
    <div className="space-y-4">
      {unscheduledEvents.length > 0 ? (
        <div className="bc-panel">
          <p className="border-b border-[color:var(--bc-border)] bg-[color:var(--bc-accent-muted)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--bc-muted)]">
            Unscheduled · {unscheduledEvents.length}
          </p>
          <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {unscheduledEvents.map((event, i) => (
              <ScheduleEventSlot
                key={`unscheduled-${event.appointment}-${i}`}
                event={event}
                index={i}
                selectedEvent={selectedEvent}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      ) : null}

      {activeHours.length > 0 && columns.length > 0 ? (
        <div className="overflow-x-auto rounded-[var(--bc-radius-lg)] border border-[color:var(--bc-border)] bg-white shadow-sm">
          <div
            className="grid min-w-[480px]"
            style={{ gridTemplateColumns: `64px repeat(${columns.length}, minmax(160px, 1fr))` }}
          >
            <div className="border-b border-[color:var(--bc-border)] bg-[color:var(--bc-accent-muted)] p-2 text-xs font-semibold text-[color:var(--bc-muted)]">
              Time
            </div>
            {columns.map((col) => (
              <div
                key={col.name}
                className="border-b border-l border-[color:var(--bc-border)] bg-[color:var(--bc-accent-muted)] p-2 text-sm font-semibold"
              >
                {col.employee_name}
              </div>
            ))}

            {activeHours.map((hour) => (
              <DayHourRow
                key={hour}
                hour={hour}
                columns={columns}
                events={timedEvents}
                selectedEvent={selectedEvent}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DayHourRow({
  hour,
  columns,
  events,
  selectedEvent,
  onSelect,
}: {
  hour: number;
  columns: Array<{ name: string; employee_name: string }>;
  events: CalendarEvent[];
  selectedEvent: CalendarEvent | null;
  onSelect?: (event: CalendarEvent) => void;
}) {
  const rowEvents = events.filter((e) => eventHour(e) === hour);
  const hasAny = columns.some((col) =>
    rowEvents.some((e) => eventMatchesColumn(e, col.name)),
  );
  if (!hasAny) return null;

  return (
    <>
      <div className="border-b border-[color:var(--bc-border)] px-2 py-3 text-xs font-semibold text-[color:var(--bc-muted)]">
        {String(hour).padStart(2, "0")}:00
      </div>
      {columns.map((col) => {
        const cellEvents = rowEvents.filter((e) => eventMatchesColumn(e, col.name));
        if (cellEvents.length === 0) {
          return (
            <div
              key={`${hour}-${col.name}`}
              className="border-b border-l border-[color:var(--bc-border)] bg-[color:var(--bc-background)]/50"
              aria-hidden
            />
          );
        }
        return (
          <div
            key={`${hour}-${col.name}`}
            className={`relative border-b border-l border-[color:var(--bc-border)] p-1.5 ${
              selectedEvent &&
              cellEvents.some((e, i) => eventsMatch(e, selectedEvent))
                ? "z-20 bg-[color:var(--bc-accent-muted)]/30"
                : ""
            }`}
          >
            <div className="space-y-1.5">
              {cellEvents.map((event, i) => (
                <ScheduleEventSlot
                  key={eventSelectionKey(event, i)}
                  event={event}
                  index={i}
                  selectedEvent={selectedEvent}
                  compact
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

function WeekView({
  events,
  anchor,
  selectedEvent,
  onSelect,
}: {
  events: CalendarEvent[];
  anchor: string;
  selectedEvent: CalendarEvent | null;
  onSelect?: (event: CalendarEvent) => void;
}) {
  const start = startOfWeek(parseLocalDate(anchor));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="grid gap-3 lg:grid-cols-7">
      {days.map((day) => {
        const iso = formatIsoDate(day);
        const dayEvents = events
          .filter((e) => eventDateKey(e.start ?? e.start_time, e.appointment_date) === iso)
          .sort((a, b) =>
            (a.start ?? a.start_time ?? "").localeCompare(b.start ?? b.start_time ?? ""),
          );
        const isToday = iso === formatIsoDate(new Date());

        return (
          <Card key={iso} className={isToday ? "ring-2 ring-[color:var(--bc-primary)]/30" : ""}>
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold">
                {day.toLocaleDateString(undefined, { weekday: "short" })}
              </p>
              <p className={`text-lg font-bold ${isToday ? "text-[color:var(--bc-primary)]" : ""}`}>
                {day.getDate()}
              </p>
            </div>
            <div className="space-y-2">
              {dayEvents.map((event, i) => (
                <ScheduleEventSlot
                  key={eventSelectionKey(event, i)}
                  event={event}
                  index={i}
                  selectedEvent={selectedEvent}
                  compact
                  onSelect={onSelect}
                />
              ))}
              {dayEvents.length === 0 ? (
                <p className="text-xs text-[color:var(--bc-muted)]">No appointments</p>
              ) : null}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function MonthView({
  events,
  anchor,
  onSelect,
}: {
  events: CalendarEvent[];
  anchor: string;
  onSelect?: (event: CalendarEvent) => void;
}) {
  const days = monthGridDays(anchor);
  const monthIndex = parseLocalDate(anchor).getMonth();

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = eventDateKey(e.start ?? e.start_time, e.appointment_date);
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  }, [events]);

  return (
    <div className="overflow-hidden rounded-xl border border-[color:var(--bc-border)] bg-white">
      <div className="grid grid-cols-7 border-b border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] text-center text-xs font-semibold text-[color:var(--bc-muted)]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="px-2 py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const iso = formatIsoDate(day);
          const inMonth = day.getMonth() === monthIndex;
          const dayEvents = (byDate.get(iso) ?? []).slice(0, 3);
          const extra = (byDate.get(iso)?.length ?? 0) - dayEvents.length;
          const isToday = iso === formatIsoDate(new Date());

          return (
            <div
              key={iso}
              className={`min-h-[100px] border-b border-r border-[color:var(--bc-border)] p-2 ${
                inMonth ? "bg-white" : "bg-[color:var(--bc-surface)]/50"
              }`}
            >
              <p
                className={`mb-1 text-sm font-medium ${
                  isToday
                    ? "inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--bc-primary)] text-white"
                    : inMonth
                      ? "text-[color:var(--bc-text)]"
                      : "text-[color:var(--bc-muted)]"
                }`}
              >
                {day.getDate()}
              </p>
              <div className="space-y-1">
                {dayEvents.map((event, i) => (
                  <button
                    key={`${event.appointment}-${i}`}
                    type="button"
                    onClick={() => onSelect?.(event)}
                    className="block w-full truncate rounded bg-[color:var(--bc-primary)]/10 px-1.5 py-0.5 text-left text-[10px] text-[color:var(--bc-primary)] hover:bg-[color:var(--bc-primary)]/20"
                    title={event.title ?? event.customer_name}
                  >
                    {eventTimeLabel(event.start ?? event.start_time).slice(0, 5)}{" "}
                    {event.customer_name ?? "Guest"}
                  </button>
                ))}
                {extra > 0 ? (
                  <p className="text-[10px] text-[color:var(--bc-muted)]">+{extra} more</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ReceptionCalendarView() {
  const [view, setView] = useState<CalendarView>("day");
  const [anchor, setAnchor] = useState(formatIsoDate(new Date()));
  const [branch, setBranch] = useState("");
  const [branches, setBranches] = useState<Array<{ name: string; branch_name: string }>>([]);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [employees, setEmployees] = useState<Array<{ name: string; employee_name: string }>>([]);
  const [context, setContext] = useState<CalendarContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const range = useMemo(() => getRangeForView(view, anchor), [view, anchor]);

  async function load() {
    if (!branch) return;
    setLoading(true);
    try {
      const data = await getReceptionCalendar({
        beauty_branch: branch,
        start_date: range.start,
        end_date: range.end,
        employee: employeeFilter || undefined,
      });
      setEvents(data.events ?? []);
      setEmployees(data.employees ?? []);
      setContext(data.context ?? null);
      if (data.context?.scope === "own" && data.context.employee) {
        setEmployeeFilter(data.context.employee);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getBranches()
      .then((rows) => {
        setBranches(rows);
        if (rows[0]?.name) setBranch(rows[0].name);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [branch, view, anchor, employeeFilter, range.start, range.end]);

  const scopeLabel =
    context?.scope === "own"
      ? `Showing your appointments${context.employee_name ? ` (${context.employee_name})` : ""}`
      : "Showing all branch appointments";

  function openEvent(event: CalendarEvent) {
    setSelectedEvent(event);
  }

  function closeModal() {
    setSelectedEvent(null);
  }

  async function handleUpdated() {
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="inline-flex rounded-full border border-[color:var(--bc-border)] bg-white p-1">
          {(
            [
              ["day", "Daily"],
              ["week", "Weekly"],
              ["month", "Monthly"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                view === id
                  ? "bg-[color:var(--bc-primary)] text-white shadow-sm"
                  : "text-[color:var(--bc-muted)] hover:text-[color:var(--bc-text)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setAnchor(shiftAnchor(view, anchor, -1))}>
            ←
          </Button>
          <Button variant="secondary" onClick={() => setAnchor(formatIsoDate(new Date()))}>
            Today
          </Button>
          <Button variant="secondary" onClick={() => setAnchor(shiftAnchor(view, anchor, 1))}>
            →
          </Button>
        </div>

        <p className="text-sm font-medium text-[color:var(--bc-text)]">
          {formatPeriodLabel(view, anchor)}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div>
          <Label htmlFor="branch">Branch</Label>
          <select
            id="branch"
            className="min-h-11 w-full min-w-[180px] rounded-xl border border-[color:var(--bc-border)] bg-white px-3"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          >
            {branches.map((b) => (
              <option key={b.name} value={b.name}>
                {b.branch_name ?? b.name}
              </option>
            ))}
          </select>
        </div>

        {context?.can_filter_employee ? (
          <div>
            <Label htmlFor="employee">Beautician</Label>
            <select
              id="employee"
              className="min-h-11 w-full min-w-[180px] rounded-xl border border-[color:var(--bc-border)] bg-white px-3"
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
            >
              <option value="">All beauticians</option>
              {employees.map((emp) => (
                <option key={emp.name} value={emp.name}>
                  {emp.employee_name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="flex items-end">
          <Button variant="secondary" onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      <p className="text-sm text-[color:var(--bc-muted)]">{scopeLabel}</p>

      {loading ? <LoadingState title="Loading calendar" /> : null}

      {!loading && events.length > 0 && !selectedEvent ? (
        <p className="text-sm text-[color:var(--bc-muted)]">
          Tap an appointment to check in, start, or complete the service.
        </p>
      ) : null}

      {!loading && view === "day" ? (
        <DayView
          events={events}
          anchor={anchor}
          showEmployees={context?.scope === "all" && !employeeFilter}
          selectedEvent={selectedEvent}
          onSelect={openEvent}
        />
      ) : null}

      {!loading && view === "week" ? (
        <WeekView
          events={events}
          anchor={anchor}
          selectedEvent={selectedEvent}
          onSelect={openEvent}
        />
      ) : null}

      {!loading && view === "month" ? (
        <MonthView events={events} anchor={anchor} onSelect={openEvent} />
      ) : null}

      {!loading && events.length === 0 ? (
        <p className="text-sm text-[color:var(--bc-muted)]">No appointments in this period.</p>
      ) : null}

      <Modal
        open={Boolean(selectedEvent)}
        onClose={closeModal}
        title={selectedEvent?.customer_name ?? "Appointment"}
        size="xl"
      >
        {selectedEvent ? (
          <AppointmentActionPanel
            event={selectedEvent}
            variant="modal"
            onClose={closeModal}
            onUpdated={handleUpdated}
          />
        ) : null}
      </Modal>
    </div>
  );
}
