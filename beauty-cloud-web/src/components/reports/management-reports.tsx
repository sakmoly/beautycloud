"use client";

import { useEffect, useState } from "react";

import { callBeautyMethod, getReportsDashboard } from "@/lib/api/browser-client";
import type { ReportDashboard } from "@/lib/api/types";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/states";

export function ManagementReportsView() {
  const [branch, setBranch] = useState("BBY-MAIN");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dashboard, setDashboard] = useState<ReportDashboard | null>(null);
  const [beauticianReport, setBeauticianReport] = useState<unknown>(null);
  const [inventoryReport, setInventoryReport] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    setFromDate(start.toISOString().slice(0, 10));
    setToDate(now.toISOString().slice(0, 10));
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [dash, beaut, inv] = await Promise.all([
        getReportsDashboard({ from_date: fromDate, to_date: toDate, beauty_branch: branch }),
        callBeautyMethod({
          method: "beauty_cloud.api.reports.beautician_performance",
          params: { from_date: fromDate, to_date: toDate, beauty_branch: branch },
        }),
        callBeautyMethod({
          method: "beauty_cloud.api.reports.inventory_variance",
          params: { from_date: fromDate, to_date: toDate, beauty_branch: branch },
        }),
      ]);
      setDashboard(dash);
      setBeauticianReport(beaut);
      setInventoryReport(inv);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (fromDate && toDate) load();
  }, [fromDate, toDate, branch]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div>
          <Label htmlFor="branch">Branch</Label>
          <Input id="branch" value={branch} onChange={(e) => setBranch(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="from">From</Label>
          <Input id="from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="to">To</Label>
          <Input id="to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button variant="secondary" onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      {loading ? <LoadingState title="Loading reports" /> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card title="Revenue">
          <p className="text-2xl font-semibold">SAR {(dashboard?.revenue ?? 0).toLocaleString()}</p>
        </Card>
        <Card title="Appointments">
          <p className="text-2xl font-semibold">{dashboard?.appointments ?? 0}</p>
        </Card>
        <Card title="Utilization">
          <p className="text-2xl font-semibold">{dashboard?.utilization_pct ?? 0}%</p>
        </Card>
      </div>

      <Card title="Top services">
        <ul className="space-y-2 text-sm">
          {(dashboard?.top_services ?? []).map((s) => (
            <li key={s.service_name} className="flex justify-between">
              <span>{s.service_name}</span>
              <span>
                {s.count} · SAR {s.revenue}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Beautician performance">
          <pre className="overflow-auto rounded bg-black/5 p-3 text-xs max-h-64">
            {JSON.stringify(beauticianReport, null, 2)}
          </pre>
        </Card>
        <Card title="Inventory variance">
          <pre className="overflow-auto rounded bg-black/5 p-3 text-xs max-h-64">
            {JSON.stringify(inventoryReport, null, 2)}
          </pre>
        </Card>
      </div>
    </div>
  );
}
