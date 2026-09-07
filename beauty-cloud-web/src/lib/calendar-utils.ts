export type CalendarView = "day" | "week" | "month";

export function parseLocalDate(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

export function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function getRangeForView(view: CalendarView, anchor: string) {
  const base = parseLocalDate(anchor);
  if (view === "day") {
    return { start: anchor, end: anchor };
  }
  if (view === "week") {
    return {
      start: formatIsoDate(startOfWeek(base)),
      end: formatIsoDate(endOfWeek(base)),
    };
  }
  return {
    start: formatIsoDate(startOfMonth(base)),
    end: formatIsoDate(endOfMonth(base)),
  };
}

export function shiftAnchor(view: CalendarView, anchor: string, delta: number): string {
  const d = parseLocalDate(anchor);
  if (view === "day") {
    d.setDate(d.getDate() + delta);
  } else if (view === "week") {
    d.setDate(d.getDate() + delta * 7);
  } else {
    d.setMonth(d.getMonth() + delta);
  }
  return formatIsoDate(d);
}

export function formatPeriodLabel(view: CalendarView, anchor: string): string {
  const d = parseLocalDate(anchor);
  if (view === "day") {
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  if (view === "week") {
    const start = startOfWeek(d);
    const end = endOfWeek(d);
    const sameMonth = start.getMonth() === end.getMonth();
    const startFmt = start.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    const endFmt = end.toLocaleDateString(undefined, {
      month: sameMonth ? undefined : "short",
      day: "numeric",
      year: "numeric",
    });
    return `${startFmt} – ${endFmt}`;
  }
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function eventTimeLabel(start?: string, end?: string): string {
  if (!start) return "—";
  const s = start.slice(11, 16);
  const e = end?.slice(11, 16);
  return e ? `${s} – ${e}` : s;
}

export function eventDateKey(start?: string, appointmentDate?: string): string {
  if (appointmentDate) return appointmentDate.slice(0, 10);
  return start?.slice(0, 10) ?? "";
}

export function monthGridDays(anchor: string): Date[] {
  const first = startOfMonth(parseLocalDate(anchor));
  const gridStart = startOfWeek(first);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

export const DAY_HOURS = Array.from({ length: 13 }, (_, i) => i + 8);

export const TIMELINE_START_HOUR = 8;
export const TIMELINE_END_HOUR = 20;
export const TIMELINE_HOUR_HEIGHT = 72;

export function parseEventMinutes(iso?: string): number | null {
  if (!iso || iso.length < 16) return null;
  const hour = Number(iso.slice(11, 13));
  const minute = Number(iso.slice(14, 16));
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

export function formatHourLabel(hour: number): string {
  if (hour === 0 || hour === 24) return "12 am";
  if (hour === 12) return "12 pm";
  if (hour < 12) return `${hour} am`;
  return `${hour - 12} pm`;
}

export function formatTimelineTime(iso?: string): string {
  const minutes = parseEventMinutes(iso);
  if (minutes === null) return "—";
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour >= 12 ? "pm" : "am";
  const displayHour = hour % 12 || 12;
  if (minute === 0) return `${displayHour} ${suffix}`;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function eventDurationMinutes(start?: string, end?: string): number {
  const startMinutes = parseEventMinutes(start);
  const endMinutes = parseEventMinutes(end);
  if (startMinutes === null) return 60;
  if (endMinutes === null || endMinutes <= startMinutes) return 60;
  return endMinutes - startMinutes;
}

export function timelinePosition(start?: string, end?: string) {
  const startMinutes = parseEventMinutes(start);
  const timelineStart = TIMELINE_START_HOUR * 60;
  const timelineEnd = TIMELINE_END_HOUR * 60;

  if (startMinutes === null) {
    return { top: 0, height: TIMELINE_HOUR_HEIGHT, visible: false };
  }

  const clampedStart = Math.max(startMinutes, timelineStart);
  const duration = eventDurationMinutes(start, end);
  const endMinutes = Math.min(startMinutes + duration, timelineEnd);
  const visibleMinutes = Math.max(endMinutes - clampedStart, 20);

  return {
    top: ((clampedStart - timelineStart) / 60) * TIMELINE_HOUR_HEIGHT,
    height: Math.max((visibleMinutes / 60) * TIMELINE_HOUR_HEIGHT, 44),
    visible: startMinutes < timelineEnd && endMinutes > timelineStart,
  };
}

export function timelineNowOffset(now = new Date()): number | null {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const timelineStart = TIMELINE_START_HOUR * 60;
  const timelineEnd = TIMELINE_END_HOUR * 60;
  if (minutes < timelineStart || minutes > timelineEnd) return null;
  return ((minutes - timelineStart) / 60) * TIMELINE_HOUR_HEIGHT;
}

export function isTodayIso(iso: string): boolean {
  return iso === formatIsoDate(new Date());
}
