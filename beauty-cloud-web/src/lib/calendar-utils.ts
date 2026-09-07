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
