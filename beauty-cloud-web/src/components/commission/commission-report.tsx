"use client";

import { useEffect, useState } from "react";

import { getCommissionReport } from "@/lib/api/browser-client";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/states";

export function CommissionReportView() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [report, setReport] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    setFromDate(start.toISOString().slice(0, 10));
    setToDate(now.toISOString().slice(0, 10));
  }, []);

  async function load() {
    setLoading(true);
    try {
      setReport(await getCommissionReport(fromDate, toDate));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (fromDate && toDate) load();
  }, [fromDate, toDate]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
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
      {loading ? <LoadingState title="Loading commission report" /> : null}
      <Card title="Commission report">
        <pre className="overflow-auto rounded bg-black/5 p-3 text-xs">
          {JSON.stringify(report, null, 2)}
        </pre>
      </Card>
    </div>
  );
}
