"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getBookingSchedulePlan,
  getServiceSlots,
  getSlots,
  kioskGetSchedulePlan,
  kioskGetServiceSlots,
  kioskGetSlots,
} from "@/lib/api/browser-client";
import type {
  AvailabilitySlot,
  BookingSchedulePlan,
  SchedulePlanEmployee,
  ScheduleSelection,
  ServiceAssignment,
} from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/states";

export interface ScheduleServiceItem {
  name: string;
  service_name: string;
  default_duration?: number;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildUpcomingDays(count = 7) {
  const start = todayIso();
  return Array.from({ length: count }, (_, index) => {
    const iso = addDaysIso(start, index);
    const date = new Date(`${iso}T12:00:00`);
    const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
    const monthDay = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return {
      iso,
      weekday,
      monthDay,
      label: index === 0 ? "Today" : index === 1 ? "Tomorrow" : weekday,
    };
  });
}

function formatTime(value: string) {
  return value.slice(11, 16);
}

function isTodayIso(iso: string) {
  return iso === new Date().toISOString().slice(0, 10);
}

function parseSlotStart(value: string) {
  return new Date(value.includes("T") ? value : value.replace(" ", "T"));
}

function filterPastSlots(slots: AvailabilitySlot[], appointmentDate: string) {
  if (!isTodayIso(appointmentDate)) return slots;
  const now = Date.now();
  return slots.filter((slot) => parseSlotStart(slot.start_time).getTime() >= now);
}

function parseSlotEnd(value: string) {
  return new Date(value.includes("T") ? value : value.replace(" ", "T"));
}

function assignmentWindow(assignment: ServiceAssignment) {
  const start = parseSlotStart(assignment.start_time).getTime();
  const end = assignment.end_time
    ? parseSlotEnd(assignment.end_time).getTime()
    : start;
  return { start, end: Math.max(end, start) };
}

function windowsOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number },
) {
  return a.start < b.end && b.start < a.end;
}

function filterSlotsForCustomerTimeline(
  slots: AvailabilitySlot[],
  activeService: string,
  assignments: ServiceAssignment[],
) {
  const otherAssignments = assignments.filter((row) => row.beauty_service !== activeService);
  if (!otherAssignments.length) return slots;

  const blocked = otherAssignments.map(assignmentWindow);
  return slots.filter((slot) => {
    const candidate = {
      start: parseSlotStart(slot.start_time).getTime(),
      end: parseSlotEnd(slot.end_time).getTime(),
    };
    return !blocked.some((window) => windowsOverlap(candidate, window));
  });
}

function formatAssignmentRange(assignment: ServiceAssignment) {
  const start = formatTime(assignment.start_time);
  const end = assignment.end_time ? formatTime(assignment.end_time) : start;
  return start === end ? start : `${start}–${end}`;
}

function formatDateLabel(iso: string) {
  if (!iso) return "—";
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function groupSlotsByPeriod(slots: AvailabilitySlot[]) {
  const groups = {
    morning: [] as AvailabilitySlot[],
    afternoon: [] as AvailabilitySlot[],
    evening: [] as AvailabilitySlot[],
  };
  for (const slot of slots) {
    const hour = Number(formatTime(slot.start_time).slice(0, 2));
    if (hour < 12) groups.morning.push(slot);
    else if (hour < 17) groups.afternoon.push(slot);
    else groups.evening.push(slot);
  }
  return groups;
}

function BeauticianAvatar({
  name,
  image,
  className,
}: {
  name: string;
  image?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [image]);
  if (image && !failed) {
    return (
      <img
        src={image}
        alt={name}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setFailed(true)}
        className={className}
      />
    );
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return <span className={className}>{initials}</span>;
}

export function ServiceSchedulePicker({
  variant = "default",
  beautyBranch,
  services,
  bookingChannel = "online",
  kioskAuth,
  appointmentDate: controlledDate,
  onAppointmentDateChange,
  value,
  onChange,
  onError,
}: {
  variant?: "default" | "kiosk";
  beautyBranch: string;
  services: ScheduleServiceItem[];
  bookingChannel?: "online" | "kiosk" | "reception";
  kioskAuth?: { device_id: string; api_key: string };
  appointmentDate?: string;
  onAppointmentDateChange?: (date: string) => void;
  value: ScheduleSelection | null;
  onChange: (selection: ScheduleSelection | null) => void;
  onError?: (message: string | null) => void;
}) {
  const serviceIdsKey = services.map((s) => s.name).join("|");
  const serviceIds = useMemo(() => services.map((s) => s.name), [serviceIdsKey]);
  const upcomingDays = useMemo(() => buildUpcomingDays(7), []);
  const onChangeRef = useRef(onChange);
  const onErrorRef = useRef(onError);
  const valueRef = useRef(value);
  onChangeRef.current = onChange;
  onErrorRef.current = onError;
  valueRef.current = value;
  const isKiosk = variant === "kiosk";
  const kioskDeviceId = kioskAuth?.device_id;
  const kioskApiKey = kioskAuth?.api_key;

  const [internalDate, setInternalDate] = useState(controlledDate ?? todayIso());
  const appointmentDate = controlledDate ?? internalDate;

  const setAppointmentDate = (date: string) => {
    if (onAppointmentDateChange) onAppointmentDateChange(date);
    else setInternalDate(date);
  };

  const [plan, setPlan] = useState<BookingSchedulePlan | null>(null);
  const [mode, setMode] = useState<"unified" | "split">("unified");
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const [employeeFilter, setEmployeeFilter] = useState("");
  const [unifiedSlots, setUnifiedSlots] = useState<AvailabilitySlot[]>([]);
  const [splitEmployeeByService, setSplitEmployeeByService] = useState<Record<string, string>>({});
  const [splitSlotsByService, setSplitSlotsByService] = useState<Record<string, AvailabilitySlot[]>>({});
  const [splitLoadingService, setSplitLoadingService] = useState<string | null>(null);
  const [activeSplitService, setActiveSplitService] = useState("");

  const splitAssignments =
    value?.mode === "split" ? value.assignments : ([] as ServiceAssignment[]);

  const splitAssignmentsKey = splitAssignments
    .map((row) => `${row.beauty_service}:${row.start_time}`)
    .join("|");

  useEffect(() => {
    if (mode !== "split" || !serviceIds.length) return;
    setActiveSplitService((current) => {
      if (current && serviceIds.includes(current)) return current;
      const firstOpen = serviceIds.find(
        (id) => !splitAssignments.some((row) => row.beauty_service === id),
      );
      return firstOpen ?? serviceIds[0] ?? "";
    });
  }, [mode, serviceIdsKey, splitAssignmentsKey]);

  const loadPlan = useCallback(async () => {
    if (!beautyBranch || !serviceIds.length) return;
    setLoading(true);
    setScheduleError(null);
    onErrorRef.current?.(null);
    try {
      const result = kioskDeviceId && kioskApiKey
        ? await kioskGetSchedulePlan({
            device_id: kioskDeviceId,
            api_key: kioskApiKey,
            appointment_date: appointmentDate,
            services: serviceIds,
            beauty_branch: beautyBranch,
          })
        : await getBookingSchedulePlan({
            beauty_branch: beautyBranch,
            appointment_date: appointmentDate,
            services: serviceIds,
            booking_channel: bookingChannel,
          });
      setPlan(result);
      const nextMode =
        serviceIds.length > 1
          ? "split"
          : result.allow_unified
            ? "unified"
            : "split";
      setMode(nextMode);
      if (nextMode === "split" && serviceIds[0]) {
        setActiveSplitService(serviceIds[0]);
      }
      if (!result.allow_unified || nextMode === "split") {
        const current = valueRef.current;
        const keepSplit =
          current?.mode === "split" &&
          nextMode === "split" &&
          current.assignments.every((row) => serviceIds.includes(row.beauty_service));
        if (!keepSplit) onChangeRef.current(null);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not load schedule options";
      setScheduleError(message);
      onErrorRef.current?.(message);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [appointmentDate, beautyBranch, bookingChannel, kioskApiKey, kioskDeviceId, serviceIdsKey]);

  const loadUnifiedSlots = useCallback(async () => {
    if (!beautyBranch || !serviceIds.length || mode !== "unified") return;
    setSlotsLoading(true);
    setScheduleError(null);
    onErrorRef.current?.(null);
    try {
      const slotRows = kioskDeviceId && kioskApiKey
        ? await kioskGetSlots({
            device_id: kioskDeviceId,
            api_key: kioskApiKey,
            appointment_date: appointmentDate,
            services: serviceIds,
            employee: employeeFilter || undefined,
            beauty_branch: beautyBranch,
          })
        : await getSlots({
            beauty_branch: beautyBranch,
            appointment_date: appointmentDate,
            services: serviceIds,
            employee: employeeFilter || undefined,
            booking_channel: bookingChannel,
          });
      setUnifiedSlots(slotRows);
      const currentValue = valueRef.current;
      if (currentValue?.mode === "unified") {
        const stillValid = slotRows.some(
          (slot) =>
            slot.employee === currentValue.employee &&
            slot.start_time === currentValue.start_time,
        );
        if (!stillValid) onChangeRef.current(null);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not check availability";
      setUnifiedSlots([]);
      onChangeRef.current(null);
      setScheduleError(message);
      onErrorRef.current?.(message);
    } finally {
      setSlotsLoading(false);
    }
  }, [
    appointmentDate,
    beautyBranch,
    bookingChannel,
    employeeFilter,
    kioskApiKey,
    kioskDeviceId,
    mode,
    serviceIdsKey,
  ]);

  const loadSplitSlots = useCallback(
    async (serviceCode: string, employee?: string) => {
      if (!beautyBranch || !serviceCode) return;
      setSplitLoadingService(serviceCode);
      try {
        const slotRows = kioskDeviceId && kioskApiKey
          ? await kioskGetServiceSlots({
              device_id: kioskDeviceId,
              api_key: kioskApiKey,
              appointment_date: appointmentDate,
              service: serviceCode,
              employee: employee || undefined,
              beauty_branch: beautyBranch,
            })
          : await getServiceSlots({
              beauty_branch: beautyBranch,
              appointment_date: appointmentDate,
              service: serviceCode,
              employee: employee || undefined,
              booking_channel: bookingChannel,
            });
        setSplitSlotsByService((prev) => ({ ...prev, [serviceCode]: slotRows }));
      } catch (e) {
        setSplitSlotsByService((prev) => ({ ...prev, [serviceCode]: [] }));
        onErrorRef.current?.(e instanceof Error ? e.message : "Could not load slots");
      } finally {
        setSplitLoadingService(null);
      }
    },
    [appointmentDate, beautyBranch, bookingChannel, kioskApiKey, kioskDeviceId],
  );

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    if (mode === "unified") void loadUnifiedSlots();
  }, [loadUnifiedSlots, mode]);

  const activeSplitEmployee = activeSplitService
    ? splitEmployeeByService[activeSplitService] ?? ""
    : "";

  useEffect(() => {
    if (mode !== "split" || !plan || !activeSplitService) return;
    void loadSplitSlots(activeSplitService, activeSplitEmployee || undefined);
  }, [activeSplitEmployee, activeSplitService, loadSplitSlots, mode, plan]);

  function switchMode(next: "unified" | "split") {
    if (next === "unified" && !plan?.allow_unified) return;
    setMode(next);
    onChange(null);
    setScheduleError(null);
  }

  function selectUnifiedSlot(slot: AvailabilitySlot) {
    onChange({
      mode: "unified",
      employee: slot.employee,
      employee_name: slot.employee_name,
      employee_image: slot.employee_image,
      start_time: slot.start_time,
      end_time: slot.end_time,
      duration_minutes: slot.duration_minutes,
    });
    setScheduleError(null);
  }

  function selectSplitSlot(serviceCode: string, slot: AvailabilitySlot) {
    const candidate = {
      start: parseSlotStart(slot.start_time).getTime(),
      end: parseSlotEnd(slot.end_time).getTime(),
    };
    const overlaps = splitAssignments
      .filter((row) => row.beauty_service !== serviceCode)
      .some((row) => windowsOverlap(candidate, assignmentWindow(row)));
    if (overlaps) {
      const message =
        "This time overlaps another service in your visit. Pick a time after your other service finishes.";
      setScheduleError(message);
      onErrorRef.current?.(message);
      return;
    }

    const without = splitAssignments.filter((row) => row.beauty_service !== serviceCode);
    const nextAssignments = [
      ...without,
      {
        beauty_service: serviceCode,
        employee: slot.employee,
        employee_name: slot.employee_name,
        start_time: slot.start_time,
        end_time: slot.end_time,
      },
    ];
    onChange({ mode: "split", assignments: nextAssignments });
    setSplitEmployeeByService((prev) => ({ ...prev, [serviceCode]: slot.employee }));
    setScheduleError(null);
    onErrorRef.current?.(null);

    const nextService = serviceIds.find(
      (id) => !nextAssignments.some((row) => row.beauty_service === id),
    );
    if (nextService) setActiveSplitService(nextService);
  }

  function clearSplitAssignment(serviceCode: string) {
    if (value?.mode !== "split") return;
    onChange({
      mode: "split",
      assignments: value.assignments.filter((row) => row.beauty_service !== serviceCode),
    });
  }

  const unifiedEmployees = plan?.unified_employees ?? [];
  const visibleUnifiedSlots = useMemo(
    () => filterPastSlots(unifiedSlots, appointmentDate),
    [unifiedSlots, appointmentDate],
  );
  const groupedSlots = useMemo(() => groupSlotsByPeriod(visibleUnifiedSlots), [visibleUnifiedSlots]);
  const periodSections = [
    { key: "morning", label: "Morning", icon: "🌅", items: groupedSlots.morning },
    { key: "afternoon", label: "Afternoon", icon: "☀️", items: groupedSlots.afternoon },
    { key: "evening", label: "Evening", icon: "🌙", items: groupedSlots.evening },
  ].filter((section) => section.items.length > 0);

  const dayBtnClass = (active: boolean) =>
    isKiosk ? `bc-kiosk-day-card ${active ? "active" : ""}` : `bc-day-btn ${active ? "active" : ""}`;

  const stylistBtnClass = (active: boolean, anyStylist?: boolean) =>
    isKiosk
      ? `bc-kiosk-stylist-card ${active ? "active" : ""}`
      : `bc-stylist-card ${anyStylist ? "bc-stylist-card-any" : ""} ${active ? "active" : ""}`;

  const timeBtnClass = (active: boolean) =>
    isKiosk
      ? `bc-kiosk-time-card ${active ? "active selected" : "available"}`
      : `bc-time-slot ${active ? "active" : ""}`;

  const serviceTabClass = (active: boolean, scheduled: boolean) => {
    if (isKiosk) {
      return `bc-kiosk-service-chip bc-kiosk-service-chip-btn ${active ? "active" : ""} ${scheduled ? "scheduled" : ""}`;
    }
    return `bc-service-tab ${active ? "active" : ""} ${scheduled ? "scheduled" : ""}`;
  };

  const sectionClass = isKiosk ? "bc-kiosk-schedule-block" : "bc-schedule-section";
  const labelClass = isKiosk ? "bc-kiosk-sidebar-label" : "bc-schedule-section-title";
  const mutedClass = isKiosk ? "bc-kiosk-schedule-empty-sub" : "text-sm text-[color:var(--bc-muted)]";

  function renderSplitServiceTabs() {
    const rows = plan?.services ?? services.map((service) => ({
      service: service.name,
      service_name: service.service_name,
      duration_minutes: service.default_duration ?? 60,
      employees: [],
    }));

    return (
      <div className={sectionClass}>
        <div className={isKiosk ? undefined : "bc-schedule-section-head"}>
          <div>
            <p className={labelClass}>Your services</p>
            {!isKiosk ? (
              <p className="bc-schedule-section-sub">Schedule one service at a time</p>
            ) : null}
          </div>
          {!isKiosk ? (
            <span className="bc-schedule-progress">
              {splitAssignments.length}/{serviceIds.length} done
            </span>
          ) : null}
        </div>
        <div className={isKiosk ? "bc-kiosk-service-chips" : "bc-service-tabs"} role="tablist">
          {rows.map((row) => {
            const scheduled = splitAssignments.find((item) => item.beauty_service === row.service);
            const active = activeSplitService === row.service;
            return (
              <button
                key={row.service}
                type="button"
                role="tab"
                aria-selected={active}
                className={serviceTabClass(active, Boolean(scheduled))}
                onClick={() => {
                  setActiveSplitService(row.service);
                  setScheduleError(null);
                }}
              >
                <span className={isKiosk ? undefined : "bc-service-tab-name"}>
                  {scheduled ? "✓ " : ""}
                  {row.service_name}
                </span>
                <span className={isKiosk ? "bc-kiosk-service-chip-meta" : "bc-service-tab-meta"}>
                  {row.duration_minutes} min
                  {scheduled ? ` · ${formatAssignmentRange(scheduled)}` : ""}
                </span>
              </button>
            );
          })}
        </div>
        {isKiosk ? (
          <p className="bc-kiosk-schedule-empty-sub">
            {splitAssignments.length} of {serviceIds.length} services scheduled
          </p>
        ) : null}
      </div>
    );
  }

  function renderEmployeePicker(
    employees: SchedulePlanEmployee[],
    selected: string,
    onSelect: (employee: string) => void,
  ) {
    return (
      <div className={isKiosk ? "bc-kiosk-stylist-row" : "bc-stylist-grid"}>
        <button
          type="button"
          className={stylistBtnClass(selected === "", true)}
          onClick={() => onSelect("")}
          aria-pressed={selected === ""}
        >
          {isKiosk ? (
            <>
              <span className="bc-kiosk-stylist-any-icon">✨</span>
              <span className="bc-kiosk-stylist-name">Any stylist</span>
              <span className="bc-kiosk-stylist-meta">Fastest available</span>
            </>
          ) : (
            <>
              <span className="bc-stylist-any-icon" aria-hidden>
                ✨
              </span>
              <span className="bc-stylist-name">Any stylist</span>
              <span className="bc-stylist-meta">Fastest slot</span>
            </>
          )}
        </button>
        {employees.map((beautician) => (
          <button
            key={beautician.employee}
            type="button"
            className={stylistBtnClass(selected === beautician.employee)}
            onClick={() => onSelect(beautician.employee)}
            aria-pressed={selected === beautician.employee}
          >
            <BeauticianAvatar
              name={beautician.employee_name}
              image={beautician.employee_image}
              className={isKiosk ? "bc-kiosk-picker-avatar" : "bc-stylist-avatar"}
            />
            <span className={isKiosk ? "bc-kiosk-stylist-name" : "bc-stylist-name"}>
              {beautician.employee_name}
            </span>
          </button>
        ))}
      </div>
    );
  }

  function renderSlotGrid(
    slots: AvailabilitySlot[],
    selected: { employee: string; start_time: string } | null,
    onSelect: (slot: AvailabilitySlot) => void,
    employeeLocked?: boolean,
  ) {
    if (!slots.length) {
      return (
        <p className={isKiosk ? "bc-kiosk-schedule-empty-sub" : "text-sm text-[color:var(--bc-muted)]"}>
          No open times for this selection. Try another date or stylist.
        </p>
      );
    }
    const sections = groupSlotsByPeriod(slots);
    const blocks = [
      { key: "morning", label: "Morning", items: sections.morning },
      { key: "afternoon", label: "Afternoon", items: sections.afternoon },
      { key: "evening", label: "Evening", items: sections.evening },
    ].filter((section) => section.items.length > 0);

    return (
      <div className={isKiosk ? "bc-kiosk-time-sections" : "bc-time-sections"}>
        {blocks.map((section) => (
          <div key={section.key} className={isKiosk ? "bc-kiosk-time-section" : undefined}>
            <p className={isKiosk ? "bc-kiosk-time-section-label" : "bc-time-section-label"}>
              {section.label}
            </p>
            <div className={isKiosk ? "bc-kiosk-time-grid" : "bc-time-grid"}>
              {section.items.map((slot) => {
                const active =
                  selected?.employee === slot.employee &&
                  selected.start_time === slot.start_time;
                return (
                  <button
                    key={`${slot.employee}-${slot.start_time}`}
                    type="button"
                    className={timeBtnClass(active)}
                    onClick={() => onSelect(slot)}
                    aria-pressed={active}
                  >
                    {active ? (
                      <span
                        className={isKiosk ? "bc-kiosk-time-card-check" : "bc-time-slot-check"}
                        aria-hidden
                      >
                        ✓
                      </span>
                    ) : null}
                    <span className={isKiosk ? "bc-kiosk-time-card-time" : "bc-time-slot-time"}>
                      {formatTime(slot.start_time)}
                    </span>
                    {!employeeLocked ? (
                      <span className={isKiosk ? "bc-kiosk-time-card-stylist" : "bc-time-slot-stylist"}>
                        {slot.employee_name}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (loading && !plan) {
    return (
      <LoadingState
        title="Checking schedule options"
        description="Finding stylists who can perform your selected services"
      />
    );
  }

  return (
    <div className={isKiosk ? "bc-kiosk-schedule-blocks" : "bc-schedule-flow"}>
      {plan && serviceIds.length > 1 ? (
        <div className={sectionClass}>
          <p className={labelClass}>Scheduling style</p>
          {!isKiosk ? (
            <p className="bc-schedule-section-sub mb-3">How should we book your services?</p>
          ) : null}
          <div className={isKiosk ? "bc-kiosk-mode-grid" : "bc-mode-grid"}>
            <button
              type="button"
              disabled={!plan.allow_unified}
              onClick={() => switchMode("unified")}
              aria-pressed={mode === "unified"}
              className={
                isKiosk
                  ? `bc-kiosk-mode-card ${mode === "unified" ? "active" : ""} ${!plan.allow_unified ? "disabled" : ""}`
                  : `bc-mode-card ${mode === "unified" ? "active" : ""} ${!plan.allow_unified ? "disabled" : ""}`
              }
            >
              {!isKiosk ? <span className="bc-mode-card-icon">👤</span> : null}
              <span className={isKiosk ? "bc-kiosk-stylist-name" : "bc-mode-card-title"}>
                Same stylist
              </span>
              <span className={isKiosk ? "bc-kiosk-stylist-meta" : "bc-mode-card-desc"}>
                One person, one continuous visit for all services.
              </span>
            </button>
            <button
              type="button"
              onClick={() => switchMode("split")}
              aria-pressed={mode === "split"}
              className={
                isKiosk
                  ? `bc-kiosk-mode-card ${mode === "split" ? "active" : ""}`
                  : `bc-mode-card ${mode === "split" ? "active" : ""}`
              }
            >
              {!isKiosk ? <span className="bc-mode-card-icon">📋</span> : null}
              <span className={isKiosk ? "bc-kiosk-stylist-name" : "bc-mode-card-title"}>
                Each service separately
              </span>
              <span className={isKiosk ? "bc-kiosk-stylist-meta" : "bc-mode-card-desc"}>
                Choose a beautician and time per service.
              </span>
            </button>
          </div>
          {!plan.allow_unified ? (
            <p className={isKiosk ? "bc-kiosk-schedule-empty-sub" : "bc-schedule-hint"}>
              These services need different specialists — schedule each one below.
            </p>
          ) : null}
        </div>
      ) : null}

      {mode === "split" && serviceIds.length > 1 ? renderSplitServiceTabs() : null}

      <div className={sectionClass}>
        <p className={labelClass}>Date</p>
        {!isKiosk ? <p className="bc-schedule-section-sub mb-3">When would you like to visit?</p> : null}
        <div className={isKiosk ? "bc-kiosk-day-row" : "bc-day-grid"}>
          {upcomingDays.map((day) => (
            <button
              key={day.iso}
              type="button"
              className={dayBtnClass(appointmentDate === day.iso)}
              onClick={() => {
                setAppointmentDate(day.iso);
                onChange(null);
              }}
              aria-pressed={appointmentDate === day.iso}
            >
              <span className={isKiosk ? "bc-kiosk-day-card-label" : "bc-day-btn-label"}>
                {day.label}
              </span>
              <span className={isKiosk ? "bc-kiosk-day-card-date" : "bc-day-btn-date"}>{day.monthDay}</span>
            </button>
          ))}
        </div>
      </div>

      {mode === "unified" ? (
        <>
          <div className={sectionClass}>
            <p className={labelClass}>Beautician</p>
            {!isKiosk ? (
              <p className="bc-schedule-section-sub mb-3">Who would you prefer?</p>
            ) : null}
            {renderEmployeePicker(unifiedEmployees, employeeFilter, (employee) => {
              setEmployeeFilter(employee);
              onChange(null);
            })}
          </div>

          <div className={sectionClass}>
            <div className={isKiosk ? "bc-kiosk-schedule-block-head" : "bc-schedule-section-head !mb-3"}>
              <div>
                <p className={labelClass}>Available times</p>
                {!isKiosk ? (
                  <p className="bc-schedule-section-sub">Tap a slot to select it</p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="secondary"
                className={isKiosk ? "bc-kiosk-refresh-btn" : undefined}
                onClick={() => void loadUnifiedSlots()}
                disabled={slotsLoading}
              >
                {slotsLoading ? "Checking…" : "Refresh"}
              </Button>
            </div>
            {scheduleError ? (
              <div className={isKiosk ? "bc-kiosk-schedule-alert" : "rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"}>
                <p>{scheduleError}</p>
              </div>
            ) : null}
            {slotsLoading && visibleUnifiedSlots.length === 0 ? (
              <LoadingState title="Checking availability" description="Finding open times" />
            ) : (
              <div className={slotsLoading ? "opacity-60 transition-opacity" : undefined}>
                {renderSlotGrid(
                  visibleUnifiedSlots,
                  value?.mode === "unified"
                    ? { employee: value.employee, start_time: value.start_time }
                    : null,
                  selectUnifiedSlot,
                  Boolean(employeeFilter),
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        (() => {
          const row =
            plan?.services?.find((item) => item.service === activeSplitService) ??
            plan?.services?.[0];
          if (!row) return null;

          const selectedEmployee = splitEmployeeByService[row.service] ?? "";
          const rawSlots = filterPastSlots(splitSlotsByService[row.service] ?? [], appointmentDate);
          const slots = filterSlotsForCustomerTimeline(rawSlots, row.service, splitAssignments);
          const selectedAssignment = splitAssignments.find((item) => item.beauty_service === row.service);
          const otherAssignments = splitAssignments.filter((item) => item.beauty_service !== row.service);
          const latestOtherEnd = otherAssignments.reduce<number | null>((latest, item) => {
            const end = assignmentWindow(item).end;
            return latest == null || end > latest ? end : latest;
          }, null);

          return (
            <div className={isKiosk ? "bc-kiosk-schedule-block bc-kiosk-split-service" : sectionClass}>
              <div className={isKiosk ? undefined : "bc-split-service-head mb-4"}>
                <p className={isKiosk ? "bc-kiosk-stylist-name" : "bc-split-service-title"}>{row.service_name}</p>
                <p className={isKiosk ? "bc-kiosk-stylist-meta" : "bc-split-service-meta"}>
                  {row.duration_minutes} min · {formatDateLabel(appointmentDate)}
                </p>
                {latestOtherEnd && !selectedAssignment ? (
                  <p className={isKiosk ? "bc-kiosk-schedule-empty-sub" : "bc-schedule-hint mt-3"}>
                    Starts after your previous service (from{" "}
                    {new Date(latestOtherEnd).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    ).
                  </p>
                ) : null}
              </div>

              <div className={isKiosk ? "bc-kiosk-schedule-block" : "mb-4"}>
                <p className={labelClass}>Beautician</p>
                {!isKiosk ? <p className="bc-schedule-section-sub mb-3">Pick who you&apos;d like</p> : null}
                {renderEmployeePicker(row.employees, selectedEmployee, (employee) => {
                  setSplitEmployeeByService((prev) => ({ ...prev, [row.service]: employee }));
                  clearSplitAssignment(row.service);
                })}
              </div>

              <div className={isKiosk ? "bc-kiosk-schedule-block" : undefined}>
                <p className={labelClass}>Available times</p>
                {!isKiosk ? <p className="bc-schedule-section-sub mb-3">Tap to select</p> : null}
                {splitLoadingService === row.service && rawSlots.length === 0 ? (
                  <LoadingState title="Loading times" description={`Finding slots for ${row.service_name}`} />
                ) : (
                  <div className={splitLoadingService === row.service ? "opacity-60 transition-opacity" : undefined}>
                    {renderSlotGrid(
                      slots,
                      selectedAssignment
                        ? {
                            employee: selectedAssignment.employee,
                            start_time: selectedAssignment.start_time,
                          }
                        : null,
                      (slot) => selectSplitSlot(row.service, slot),
                      Boolean(selectedEmployee),
                    )}
                    {!splitLoadingService && rawSlots.length > 0 && slots.length === 0 ? (
                      <p className={mutedClass + " mt-3"}>
                        No times left that fit after your other service. Try a later slot or another day.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          );
        })()
      )}

      {mode === "unified" && !slotsLoading && visibleUnifiedSlots.length === 0 && !scheduleError ? (
        <p className={mutedClass}>
          {serviceIds.length > 1
            ? "No beautician is available for all services on this day. Switch to per-service scheduling."
            : "No open times on this day."}
        </p>
      ) : null}

      {periodSections.length === 0 && mode === "unified" ? null : null}
    </div>
  );
}

function splitAssignmentsValid(assignments: ServiceAssignment[]) {
  for (let index = 0; index < assignments.length; index += 1) {
    const current = assignmentWindow(assignments[index]);
    for (let otherIndex = index + 1; otherIndex < assignments.length; otherIndex += 1) {
      if (windowsOverlap(current, assignmentWindow(assignments[otherIndex]))) {
        return false;
      }
    }
  }
  return true;
}

export function scheduleSelectionReady(selection: ScheduleSelection | null, serviceCount: number) {
  if (!selection) return false;
  if (selection.mode === "unified") return Boolean(selection.start_time && selection.employee);
  if (selection.assignments.length !== serviceCount) return false;
  return splitAssignmentsValid(selection.assignments);
}

export function scheduleSelectionSummary(selection: ScheduleSelection | null) {
  if (!selection) return null;
  if (selection.mode === "unified") {
    return {
      employee_name: selection.employee_name,
      start_time: selection.start_time,
      end_time: selection.end_time,
    };
  }
  return { assignments: selection.assignments };
}
