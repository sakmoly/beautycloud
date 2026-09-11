"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  callBeautyMethod,
  fetchBootstrap,
  getBeauticianMe,
  getBeauticianSchedule,
} from "@/lib/api/browser-client";
import type { BeauticianScheduleLine } from "@/lib/api/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/states";

export function BeauticianScheduleView() {
  const [me, setMe] = useState<{
    employee_name?: string | null;
    can_select_employee?: boolean;
    employees?: Array<{ name: string; employee_name: string }>;
  } | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [today, setToday] = useState<BeauticianScheduleLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requireCheckInBeforeService, setRequireCheckInBeforeService] = useState(true);
  const [requireInvoiceBeforeService, setRequireInvoiceBeforeService] = useState(true);
  const [canStartService, setCanStartService] = useState(false);

  async function loadSchedule(employee?: string) {
    setLoading(true);
    setError(null);
    try {
      const schedule = await getBeauticianSchedule(undefined, undefined, employee || undefined);
      setToday(schedule.today ?? schedule.all ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load schedule");
      setToday([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([getBeauticianMe(), fetchBootstrap()])
      .then(([profile, bootstrap]) => {
        setMe(profile);
        setCanStartService(Boolean(profile.workflow?.can_start_service ?? bootstrap.staff_workflow?.can_start_service));
        setRequireCheckInBeforeService(
          Boolean(
            profile.workflow?.require_check_in_before_service ??
              bootstrap.salon_payment?.require_check_in_before_service ??
              true,
          ),
        );
        setRequireInvoiceBeforeService(
          Boolean(
            profile.workflow?.require_invoice_before_service ??
              bootstrap.salon_payment?.require_invoice_before_service ??
              true,
          ),
        );
        if (profile.employee) {
          setEmployeeFilter(profile.employee);
          return loadSchedule(profile.employee);
        }
        return loadSchedule();
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Could not load profile");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (me?.can_select_employee) {
      loadSchedule(employeeFilter || undefined);
    }
  }, [employeeFilter, me?.can_select_employee]);

  async function startService(line: BeauticianScheduleLine) {
    const appointment = line.appointment ?? line.appointment_name;
    if (!appointment) return;
    await callBeautyMethod({
      method: "beauty_cloud.api.beautician.start_service",
      body: { name: appointment, service_row: line.service_row ?? line.name },
    });
    await loadSchedule(employeeFilter || undefined);
  }

  function canStartLine(line: BeauticianScheduleLine): boolean {
    if (!canStartService) return false;
    const apptStatus = line.appointment_status ?? "";
    const startStatuses = requireCheckInBeforeService
      ? ["Checked In", "Waiting"]
      : ["Booked", "Confirmed", "Checked In", "Waiting"];
    const invoiceReady = !requireInvoiceBeforeService || Boolean(line.has_invoice);
    return (
      invoiceReady &&
      startStatuses.includes(apptStatus) &&
      line.line_status !== "Completed" &&
      line.line_status !== "In Service"
    );
  }

  async function completeService(line: BeauticianScheduleLine) {
    const appointment = line.appointment ?? line.appointment_name;
    if (!appointment) return;
    await callBeautyMethod({
      method: "beauty_cloud.api.beautician.complete_service",
      body: { name: appointment, service_row: line.service_row ?? line.name },
    });
    await loadSchedule(employeeFilter || undefined);
  }

  if (loading && !me) {
    return <LoadingState title="Loading schedule" />;
  }

  const title = me?.can_select_employee
    ? "Staff schedule"
    : `Hello, ${me?.employee_name ?? "Beautician"}`;

  return (
    <div className="space-y-4">
      {me?.can_select_employee ? (
        <div className="max-w-xs">
          <Label htmlFor="beautician">Beautician</Label>
          <select
            id="beautician"
            className="min-h-11 w-full rounded-xl border border-[color:var(--bc-border)] bg-white px-3"
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
          >
            <option value="">All beauticians</option>
            {(me.employees ?? []).map((emp) => (
              <option key={emp.name} value={emp.name}>
                {emp.employee_name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl bg-[color:var(--bc-danger)]/10 px-4 py-3 text-sm text-[color:var(--bc-danger)]">
          {error}
        </p>
      ) : null}

      <Card title={title} description="Today's schedule — start and complete services here">
        {loading ? <LoadingState title="Loading appointments" /> : null}
        <div className="grid gap-3">
          {today.map((line) => (
            <div
              key={`${line.appointment}-${line.service_row ?? line.name}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--bc-radius)] border border-[color:var(--bc-border)] p-3"
            >
              <div>
                <p className="font-medium">{line.service_name}</p>
                <p className="text-sm text-[color:var(--bc-muted)]">
                  {line.customer_name} · {line.employee_name ?? "Unassigned"} ·{" "}
                  {line.start_time?.slice(11, 16) ?? "—"}
                </p>
                <p className="text-xs text-[color:var(--bc-muted)]">
                  {line.appointment} · {line.appointment_status ?? line.status}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="default">{line.line_status ?? line.status ?? "Pending"}</Badge>
                {line.appointment ?? line.appointment_name ? (
                  <Link href={`/staff/beautician/${line.appointment ?? line.appointment_name}`}>
                    <Button variant="secondary">Open</Button>
                  </Link>
                ) : null}
                {canStartLine(line) ? (
                  <Button variant="ghost" onClick={() => startService(line)}>
                    Start
                  </Button>
                ) : null}
                {!canStartLine(line) &&
                requireCheckInBeforeService &&
                ["Booked", "Confirmed"].includes(line.appointment_status ?? "") ? (
                  <span className="text-xs text-[color:var(--bc-muted)]">Awaiting check-in</span>
                ) : null}
                {!canStartLine(line) &&
                requireInvoiceBeforeService &&
                !line.has_invoice &&
                ["Checked In", "Waiting"].includes(line.appointment_status ?? "") ? (
                  <span className="text-xs text-[color:var(--bc-muted)]">Awaiting salon invoice</span>
                ) : null}
                {line.line_status === "In Service" ? (
                  <Button onClick={() => completeService(line)}>Complete</Button>
                ) : null}
              </div>
            </div>
          ))}
          {!loading && today.length === 0 ? (
            <p className="text-sm text-[color:var(--bc-muted)]">No appointments today.</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
