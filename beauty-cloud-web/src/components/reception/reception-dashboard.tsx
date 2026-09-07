"use client";

import { useEffect, useState } from "react";

import {
  getReceptionDashboard,
  getReceptionQueue,
  receptionAction,
} from "@/lib/api/browser-client";
import type { BeautyAppointment, ReceptionDashboard } from "@/lib/api/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/states";

const DEFAULT_BRANCH = "BBY-MAIN";

export function ReceptionDashboardView() {
  const [branch, setBranch] = useState(DEFAULT_BRANCH);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dashboard, setDashboard] = useState<ReceptionDashboard | null>(null);
  const [queue, setQueue] = useState<BeautyAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [walkInName, setWalkInName] = useState("");
  const [walkInMobile, setWalkInMobile] = useState("");
  const [walkInService, setWalkInService] = useState("SRV-MANICURE");

  async function refresh() {
    setLoading(true);
    try {
      const [dash, q] = await Promise.all([
        getReceptionDashboard(branch, date),
        getReceptionQueue(branch, date),
      ]);
      setDashboard(dash);
      setQueue(q);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [branch, date]);

  async function walkIn() {
    await receptionAction("beauty_cloud.api.reception.walk_in", {
      beauty_branch: branch,
      services: [walkInService],
      customer_name: walkInName,
      mobile: walkInMobile,
    });
    setWalkInName("");
    setWalkInMobile("");
    await refresh();
  }

  if (loading && !dashboard) {
    return <LoadingState title="Loading reception dashboard" />;
  }

  const stats = [
    { label: "Booked", value: dashboard?.booked ?? 0 },
    { label: "Checked in", value: dashboard?.checked_in ?? 0 },
    { label: "Waiting", value: dashboard?.waiting ?? 0 },
    { label: "In service", value: dashboard?.in_service ?? 0 },
    { label: "Completed", value: dashboard?.completed ?? 0 },
    { label: "Walk-ins", value: dashboard?.walk_ins ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <div>
          <Label htmlFor="branch">Branch</Label>
          <Input id="branch" value={branch} onChange={(e) => setBranch(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button variant="secondary" onClick={refresh}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.label} className="text-center">
            <p className="text-2xl font-semibold">{s.value}</p>
            <p className="text-xs text-[color:var(--bc-muted)]">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card title="Expected revenue">
        <p className="text-2xl font-semibold">
          SAR {(dashboard?.expected_revenue ?? 0).toLocaleString()}
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Waiting queue" description={`${queue.length} in queue`}>
          <ul className="space-y-2 text-sm">
            {queue.map((a) => (
              <li
                key={a.name}
                className="flex items-center justify-between rounded-[var(--bc-radius)] border border-[color:var(--bc-border)] px-3 py-2"
              >
                <span>{a.customer_name ?? a.name}</span>
                <Button
                  variant="ghost"
                  onClick={() =>
                    receptionAction("beauty_cloud.api.reception.start", { name: a.name }).then(
                      refresh,
                    )
                  }
                >
                  Start
                </Button>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Walk-in">
          <div className="space-y-3">
            <div>
              <Label htmlFor="wi-name">Customer name</Label>
              <Input id="wi-name" value={walkInName} onChange={(e) => setWalkInName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="wi-mobile">Mobile</Label>
              <Input id="wi-mobile" value={walkInMobile} onChange={(e) => setWalkInMobile(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="wi-service">Service code</Label>
              <Input id="wi-service" value={walkInService} onChange={(e) => setWalkInService(e.target.value)} />
            </div>
            <Button onClick={walkIn} disabled={!walkInName || !walkInMobile}>
              Register walk-in
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
