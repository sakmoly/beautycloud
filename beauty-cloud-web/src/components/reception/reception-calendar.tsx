"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { BranchField } from "@/components/staff/branch-field";
import { getReceptionCalendar } from "@/lib/api/browser-client";
import { useStaffBranch } from "@/lib/use-staff-branch";
import type { CalendarEvent, CalendarContext } from "@/lib/api/types";
import {
  inactiveAppointmentLabel,
  isInactiveAppointmentStatus,
} from "@/lib/appointment-status";
import {
  type CalendarView,
  DAY_HOURS,
  TIMELINE_END_HOUR,
  TIMELINE_HOUR_HEIGHT,
  TIMELINE_START_HOUR,
  eventDateKey,
  eventTimeLabel,
  formatHourLabel,
  formatIsoDate,
  formatPeriodLabel,
  formatTimelineTime,
  getRangeForView,
  isTodayIso,
  monthGridDays,
  parseLocalDate,
  shiftAnchor,
  startOfWeek,
  timelineNowOffset,
  timelinePosition,
} from "@/lib/calendar-utils";
import { AppointmentActionPanel } from "@/components/reception/appointment-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { LoadingState } from "@/components/ui/states";

const TIMELINE_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR;

function timelineStyle(): CSSProperties {
  return {
    "--bc-timeline-hours": TIMELINE_HOURS,
    "--bc-hour-height": TIMELINE_HOUR_HEIGHT,
  } as CSSProperties;
}

function eventsMatch(a: CalendarEvent, b: CalendarEvent) {
  return a.appointment === b.appointment && (a.service_row ?? 0) === (b.service_row ?? 0);
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

function eventBlockClass(status?: string, selected = false, inactive = false): string {
  const s = (status ?? "").toLowerCase();
  const classes = ["bc-cal-event-block"];
  if (inactive) classes.push("is-inactive");
  else if (s.includes("complete")) classes.push("is-completed");
  else if (s.includes("service") || s.includes("checked") || s.includes("wait")) {
    classes.push("is-active-service");
  }
  if (selected) classes.push("is-selected");
  return classes.join(" ");
}

function InactiveAppointmentMark() {
  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-[inherit]"
      aria-hidden
      style={{
        background: `
          linear-gradient(
            to top right,
            transparent calc(50% - 1px),
            rgb(198 40 40 / 0.4) calc(50% - 1px),
            rgb(198 40 40 / 0.4) calc(50% + 1px),
            transparent calc(50% + 1px)
          ),
          linear-gradient(
            to top left,
            transparent calc(50% - 1px),
            rgb(198 40 40 / 0.4) calc(50% - 1px),
            rgb(198 40 40 / 0.4) calc(50% + 1px),
            transparent calc(50% + 1px)
          )
        `,
      }}
    />
  );
}

function NowIndicator({ show }: { show: boolean }) {
  const [offset, setOffset] = useState<number | null>(null);

  useEffect(() => {
    if (!show) return;
    function tick() {
      setOffset(timelineNowOffset());
    }
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [show]);

  if (!show || offset === null) return null;

  return (
    <div className="bc-cal-now-line" style={{ top: offset }}>
      <span className="bc-cal-now-dot" />
    </div>
  );
}

function TimelineEventBlock({
  event,
  selected,
  onSelect,
}: {
  event: CalendarEvent;
  selected?: boolean;
  onSelect?: (event: CalendarEvent) => void;
}) {
  const appointmentStatus = event.appointment_status ?? event.status;
  const inactive = isInactiveAppointmentStatus(appointmentStatus);
  const inactiveLabel = inactiveAppointmentLabel(appointmentStatus);
  const start = event.start ?? event.start_time;
  const end = event.end ?? event.end_time;
  const { top, height, visible } = timelinePosition(start, end);
  const compact = height < 64;

  if (!visible) return null;

  const timeLabel = `${formatTimelineTime(start)} – ${formatTimelineTime(end)}`;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(event)}
      className={eventBlockClass(appointmentStatus, selected, inactive)}
      style={{ top, height }}
    >
      {inactive ? <InactiveAppointmentMark /> : null}
      <div className={`relative flex h-full flex-col justify-between px-3 py-2 ${inactive ? "line-through" : ""}`}>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#4a2f28]">
            {event.customer_name ?? "Guest"}
          </p>
          {!compact ? (
            <p className="mt-0.5 truncate text-xs font-medium text-[#6b4f47]">
              {event.service_name ?? "Service"}
            </p>
          ) : null}
        </div>
        {!compact ? (
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="truncate text-[11px] font-semibold text-[#7a5c54]">{timeLabel}</p>
            {event.employee_name ? (
              <span className="inline-flex max-w-[45%] items-center gap-1 truncate rounded-full bg-white/45 px-2 py-0.5 text-[10px] font-semibold text-[#5c4038]">
                {event.employee_name.split(" ")[0]}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="truncate text-[10px] font-semibold text-[#7a5c54]">{timeLabel}</p>
        )}
        {!compact && inactiveLabel ? (
          <span className="absolute right-2 top-2 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--bc-muted)]">
            {inactiveLabel}
          </span>
        ) : null}
      </div>
    </button>
  );
}

function TimelineColumn({
  title,
  events,
  selectedEvent,
  showNow,
  onSelect,
}: {
  title?: string;
  events: CalendarEvent[];
  selectedEvent: CalendarEvent | null;
  showNow: boolean;
  onSelect?: (event: CalendarEvent) => void;
}) {
  return (
    <div className="min-w-0 flex-1">
      {title ? (
        <div className="border-b border-[color:var(--bc-border)] bg-[#fff7f9] px-4 py-3">
          <p className="truncate text-sm font-bold text-[color:var(--bc-text)]">{title}</p>
        </div>
      ) : null}
      <div className="relative overflow-x-auto">
        <div className="bc-cal-timeline min-w-[280px]" style={timelineStyle()}>
          {DAY_HOURS.filter((h) => h >= TIMELINE_START_HOUR && h < TIMELINE_END_HOUR).map((hour) => (
            <div key={hour} className="bc-cal-hour-row">
              <span className="bc-cal-hour-label">{formatHourLabel(hour)}</span>
            </div>
          ))}
          <div className="bc-cal-events-layer">
            <NowIndicator show={showNow} />
            {events.map((event, index) => (
              <TimelineEventBlock
                key={`${event.appointment}-${event.service_row ?? index}`}
                event={event}
                selected={selectedEvent ? eventsMatch(event, selectedEvent) : false}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
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

  const columns = useMemo(() => {
    if (!showEmployees) {
      return [{ name: "_all", employee_name: "Today's schedule" }];
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

    return cols.length > 0 ? cols : [{ name: "_all", employee_name: "Today's schedule" }];
  }, [dayEvents, showEmployees, timedEvents, unscheduledEvents]);

  const showNow = isTodayIso(anchor);

  if (dayEvents.length === 0) {
    return (
      <div className="flex min-h-[420px] items-center justify-center px-6 py-16 text-center">
        <div>
          <p className="text-lg font-semibold text-[color:var(--bc-text)]">No appointments today</p>
          <p className="mt-2 text-sm text-[color:var(--bc-muted)]">
            Bookings for this day will appear on the timeline.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {unscheduledEvents.length > 0 ? (
        <div className="border-b border-[color:var(--bc-border)] bg-[#fffafb] px-4 py-4 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--bc-muted)]">
            Unscheduled · {unscheduledEvents.length}
          </p>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {unscheduledEvents.map((event, i) => {
              const appointmentStatus = event.appointment_status ?? event.status;
              const inactive = isInactiveAppointmentStatus(appointmentStatus);
              return (
                <button
                  key={`unscheduled-${event.appointment}-${i}`}
                  type="button"
                  onClick={() => onSelect?.(event)}
                  className={`relative min-w-[220px] shrink-0 rounded-2xl border px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 ${
                    inactive
                      ? "border-[color:var(--bc-border)] bg-[#f3ece8]"
                      : "border-[#f0c9b8] bg-gradient-to-br from-[#f8cdb8] to-[#efb89f]"
                  }`}
                >
                  {inactive ? <InactiveAppointmentMark /> : null}
                  <p className={`relative font-bold ${inactive ? "line-through" : ""}`}>
                    {event.customer_name ?? "Guest"}
                  </p>
                  <p className="relative mt-1 text-xs text-[#6b4f47]">
                    {event.service_name ?? "Service"} · {event.employee_name ?? "Unassigned"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className={`grid ${columns.length > 1 ? "lg:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>
        {columns.map((col) => {
          const colEvents = timedEvents.filter((e) => eventMatchesColumn(e, col.name));
          return (
            <TimelineColumn
              key={col.name}
              title={columns.length > 1 ? col.employee_name : undefined}
              events={colEvents}
              selectedEvent={selectedEvent}
              showNow={showNow && (col.name === "_all" || columns.length === 1)}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </div>
  );
}

function MiniMonthCalendar({
  anchor,
  events,
  onSelectDate,
}: {
  anchor: string;
  events: CalendarEvent[];
  onSelectDate: (iso: string) => void;
}) {
  const days = monthGridDays(anchor);
  const monthIndex = parseLocalDate(anchor).getMonth();
  const monthLabel = parseLocalDate(anchor).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const datesWithEvents = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      const key = eventDateKey(e.start ?? e.start_time, e.appointment_date);
      if (key) set.add(key);
    }
    return set;
  }, [events]);

  return (
    <div className="p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-[color:var(--bc-text)]">{monthLabel}</p>
        <div className="flex gap-1">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--bc-muted)] hover:bg-[color:var(--bc-accent-muted)]"
            onClick={() => onSelectDate(shiftAnchor("month", anchor, -1))}
            aria-label="Previous month"
          >
            ←
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--bc-muted)] hover:bg-[color:var(--bc-accent-muted)]"
            onClick={() => onSelectDate(formatIsoDate(new Date()))}
            aria-label="Go to today"
          >
            •
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--bc-muted)] hover:bg-[color:var(--bc-accent-muted)]"
            onClick={() => onSelectDate(shiftAnchor("month", anchor, 1))}
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-[color:var(--bc-muted)]">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={`${d}-${i}`}>{d}</div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const iso = formatIsoDate(day);
          const inMonth = day.getMonth() === monthIndex;
          const isSelected = iso === anchor;
          const isToday = isTodayIso(iso);
          const hasEvents = datesWithEvents.has(iso);

          return (
            <button
              key={iso}
              type="button"
              disabled={!inMonth}
              onClick={() => onSelectDate(iso)}
              className={`bc-cal-mini-day mx-auto ${
                isSelected ? "is-selected" : ""
              } ${isToday ? "is-today" : ""} ${hasEvents ? "has-events" : ""} ${
                inMonth ? "text-[color:var(--bc-text)]" : "text-transparent"
              }`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekEventCard({
  event,
  selected,
  onSelect,
}: {
  event: CalendarEvent;
  selected?: boolean;
  onSelect?: (event: CalendarEvent) => void;
}) {
  const appointmentStatus = event.appointment_status ?? event.status;
  const inactive = isInactiveAppointmentStatus(appointmentStatus);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(event)}
      className={`relative w-full overflow-hidden rounded-2xl border px-3 py-2.5 text-left transition hover:-translate-y-0.5 ${
        inactive
          ? "border-[color:var(--bc-border)] bg-[#f3ece8]"
          : selected
            ? "border-[color:var(--bc-secondary)] bg-gradient-to-br from-[#ffd6e0] to-[#f8cdb8] ring-2 ring-[color:var(--bc-secondary)]/20"
            : "border-[#f0c9b8] bg-gradient-to-br from-[#f8cdb8] to-[#efb89f] shadow-sm"
      }`}
    >
      {inactive ? <InactiveAppointmentMark /> : null}
      <p className={`relative truncate text-sm font-bold text-[#4a2f28] ${inactive ? "line-through" : ""}`}>
        {event.customer_name ?? "Guest"}
      </p>
      <p className="relative mt-0.5 truncate text-xs text-[#6b4f47]">
        {eventTimeLabel(event.start ?? event.start_time, event.end ?? event.end_time)}
      </p>
      <p className="relative mt-1 truncate text-[11px] text-[#7a5c54]">
        {event.service_name ?? "Service"}
      </p>
    </button>
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
    <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-7">
      {days.map((day) => {
        const iso = formatIsoDate(day);
        const dayEvents = events
          .filter((e) => eventDateKey(e.start ?? e.start_time, e.appointment_date) === iso)
          .sort((a, b) =>
            (a.start ?? a.start_time ?? "").localeCompare(b.start ?? b.start_time ?? ""),
          );
        const isToday = isTodayIso(iso);

        return (
          <div
            key={iso}
            className={`rounded-[1.25rem] border p-3 ${
              isToday
                ? "border-[color:var(--bc-secondary)]/30 bg-[#fff7f9] shadow-sm"
                : "border-[color:var(--bc-border)] bg-white"
            }`}
          >
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--bc-muted)]">
                {day.toLocaleDateString(undefined, { weekday: "short" })}
              </p>
              <p
                className={`text-lg font-bold ${
                  isToday ? "text-[color:var(--bc-secondary)]" : "text-[color:var(--bc-text)]"
                }`}
              >
                {day.getDate()}
              </p>
            </div>
            <div className="space-y-2">
              {dayEvents.map((event, i) => (
                <WeekEventCard
                  key={`${event.appointment}-${i}`}
                  event={event}
                  selected={selectedEvent ? eventsMatch(event, selectedEvent) : false}
                  onSelect={onSelect}
                />
              ))}
              {dayEvents.length === 0 ? (
                <p className="py-6 text-center text-xs text-[color:var(--bc-muted)]">No appointments</p>
              ) : null}
            </div>
          </div>
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
    <div className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-[color:var(--bc-border)] bg-[#fff7f9] text-center text-xs font-bold uppercase tracking-wide text-[color:var(--bc-muted)]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="px-2 py-3">
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
          const isToday = isTodayIso(iso);

          return (
            <div
              key={iso}
              className={`min-h-[110px] border-b border-r border-[color:var(--bc-border)] p-2 ${
                inMonth ? "bg-white" : "bg-[#fffafb]"
              }`}
            >
              <p
                className={`mb-2 text-sm font-semibold ${
                  isToday
                    ? "inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--bc-secondary)] text-white"
                    : inMonth
                      ? "text-[color:var(--bc-text)]"
                      : "text-[color:var(--bc-muted)]"
                }`}
              >
                {day.getDate()}
              </p>
              <div className="space-y-1">
                {dayEvents.map((event, i) => {
                  const appointmentStatus = event.appointment_status ?? event.status;
                  const inactive = isInactiveAppointmentStatus(appointmentStatus);

                  return (
                    <button
                      key={`${event.appointment}-${i}`}
                      type="button"
                      onClick={() => onSelect?.(event)}
                      className={`relative block w-full truncate rounded-lg px-2 py-1 text-left text-[10px] font-semibold ${
                        inactive
                          ? "bg-[#f3ece8] text-[color:var(--bc-muted)] line-through"
                          : "bg-[#f8cdb8]/70 text-[#5c4038] hover:bg-[#f8cdb8]"
                      }`}
                      title={event.title ?? event.customer_name}
                    >
                      {inactive ? (
                        <span
                          className="pointer-events-none absolute inset-0 rounded-[inherit]"
                          aria-hidden
                          style={{
                            background: `
                              linear-gradient(
                                to top right,
                                transparent calc(50% - 0.5px),
                                rgb(198 40 40 / 0.35) calc(50% - 0.5px),
                                rgb(198 40 40 / 0.35) calc(50% + 0.5px),
                                transparent calc(50% + 0.5px)
                              ),
                              linear-gradient(
                                to top left,
                                transparent calc(50% - 0.5px),
                                rgb(198 40 40 / 0.35) calc(50% - 0.5px),
                                rgb(198 40 40 / 0.35) calc(50% + 0.5px),
                                transparent calc(50% + 0.5px)
                              )
                            `,
                          }}
                        />
                      ) : null}
                      <span className="relative">
                        {eventTimeLabel(event.start ?? event.start_time).slice(0, 5)}{" "}
                        {event.customer_name ?? "Guest"}
                      </span>
                    </button>
                  );
                })}
                {extra > 0 ? (
                  <p className="text-[10px] font-semibold text-[color:var(--bc-muted)]">+{extra} more</p>
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
  const { branch, setBranch, branches, branchLocked, branchLabel, ready } = useStaffBranch();
  const [view, setView] = useState<CalendarView>("day");
  const [anchor, setAnchor] = useState(formatIsoDate(new Date()));
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [employees, setEmployees] = useState<Array<{ name: string; employee_name: string }>>([]);
  const [context, setContext] = useState<CalendarContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const range = useMemo(() => getRangeForView(view, anchor), [view, anchor]);
  const isToday = isTodayIso(anchor);

  async function load() {
    if (!branch) return [];
    setLoading(true);
    try {
      const data = await getReceptionCalendar({
        beauty_branch: branch,
        start_date: range.start,
        end_date: range.end,
        employee: employeeFilter || undefined,
      });
      const nextEvents = data.events ?? [];
      setEvents(nextEvents);
      setEmployees(data.employees ?? []);
      setContext(data.context ?? null);
      if (data.context?.scope === "own" && data.context.employee) {
        setEmployeeFilter(data.context.employee);
      }
      return nextEvents;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!ready || !branch) return;
    load();
  }, [branch, view, anchor, employeeFilter, range.start, range.end, ready]);

  const scopeLabel =
    context?.scope === "own"
      ? `Your schedule${context.employee_name ? ` · ${context.employee_name}` : ""}`
      : "All branch appointments";

  const dayCount = useMemo(
    () =>
      events.filter((e) => eventDateKey(e.start ?? e.start_time, e.appointment_date) === anchor).length,
    [events, anchor],
  );

  function openEvent(event: CalendarEvent) {
    setSelectedEvent(event);
  }

  function closeModal() {
    setSelectedEvent(null);
  }

  async function handleUpdated(newStartTime?: string) {
    const nextEvents = await load();
    if (newStartTime) {
      const newDate = newStartTime.slice(0, 10);
      if (newDate) {
        setAnchor(newDate);
        setView("day");
      }
    }
    setSelectedEvent((current) => {
      if (!current) return null;
      const refreshed = nextEvents?.find(
        (event) =>
          event.appointment === current.appointment &&
          (event.service_row ?? 0) === (current.service_row ?? 0),
      );
      return refreshed ?? current;
    });
  }

  function selectMiniDate(iso: string) {
    setAnchor(iso);
    setView("day");
  }

  return (
    <div className="space-y-5">
      <div className="bc-cal-shell">
        <div className="bc-cal-toolbar px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--bc-secondary)]">
                {isToday ? "Today" : view === "day" ? "Schedule" : "Calendar"}
              </p>
              <h3 className="mt-1 text-2xl font-bold tracking-tight text-[color:var(--bc-text)]">
                {formatPeriodLabel(view, anchor)}
              </h3>
              <p className="mt-1 text-sm text-[color:var(--bc-muted)]">{scopeLabel}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-full border border-[color:var(--bc-border)] bg-white p-1 shadow-sm">
                {(
                  [
                    ["day", "Day"],
                    ["week", "Week"],
                    ["month", "Month"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setView(id)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      view === id
                        ? "bg-[color:var(--bc-secondary)] text-white shadow-sm"
                        : "text-[color:var(--bc-muted)] hover:text-[color:var(--bc-text)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 rounded-full border border-[color:var(--bc-border)] bg-white p-1 shadow-sm">
                <Button variant="ghost" className="min-h-10 px-3" onClick={() => setAnchor(shiftAnchor(view, anchor, -1))}>
                  ←
                </Button>
                <Button variant="ghost" className="min-h-10 px-4" onClick={() => setAnchor(formatIsoDate(new Date()))}>
                  Today
                </Button>
                <Button variant="ghost" className="min-h-10 px-3" onClick={() => setAnchor(shiftAnchor(view, anchor, 1))}>
                  →
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 border-t border-[color:var(--bc-border)] pt-4">
            <BranchField
              className="min-w-[160px] flex-1"
              branch={branch}
              branches={branches}
              branchLocked={branchLocked}
              branchLabel={branchLabel}
              onChange={setBranch}
            />

            {context?.can_filter_employee ? (
              <div className="min-w-[160px] flex-1">
                <Label htmlFor="employee">Beautician</Label>
                <select
                  id="employee"
                  className="mt-1 min-h-11 w-full rounded-xl border border-[color:var(--bc-border)] bg-white px-3 shadow-sm"
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
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 border-[color:var(--bc-border)] lg:border-r">
            {loading ? (
              <div className="p-8">
                <LoadingState title="Loading calendar" />
              </div>
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

            {!loading && events.length === 0 && view !== "day" ? (
              <div className="flex min-h-[420px] items-center justify-center px-6 py-16 text-center">
                <div>
                  <p className="text-lg font-semibold">No appointments in this period</p>
                  <p className="mt-2 text-sm text-[color:var(--bc-muted)]">
                    Try another date or refresh after new bookings come in.
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <aside className="hidden border-t border-[color:var(--bc-border)] bg-[#fffafb] lg:block lg:border-t-0">
            <MiniMonthCalendar anchor={anchor} events={events} onSelectDate={selectMiniDate} />
            <div className="border-t border-[color:var(--bc-border)] px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--bc-muted)]">
                Summary
              </p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <span className="text-[color:var(--bc-muted)]">Selected day</span>
                  <span className="font-bold">{dayCount}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <span className="text-[color:var(--bc-muted)]">This view</span>
                  <span className="font-bold">{events.length}</span>
                </div>
              </div>
              {!selectedEvent ? (
                <p className="mt-4 text-xs leading-relaxed text-[color:var(--bc-muted)]">
                  Tap an appointment block to check in, take payment, or update status.
                </p>
              ) : null}
            </div>
          </aside>
        </div>
      </div>

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
            beautyBranch={branch}
            onClose={closeModal}
            onUpdated={handleUpdated}
          />
        ) : null}
      </Modal>
    </div>
  );
}
