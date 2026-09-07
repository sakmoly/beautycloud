"use client";

import { useEffect, useState } from "react";

import { callBeautyMethod, getBranchStock } from "@/lib/api/browser-client";
import type { StockRow } from "@/lib/api/types";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/states";

export function InventoryView() {
  const [branch, setBranch] = useState("BBY-MAIN");
  const [stock, setStock] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState("");
  const [qty, setQty] = useState("1");
  const [employee, setEmployee] = useState("HR-EMP-00001");

  async function load() {
    setLoading(true);
    try {
      setStock(await getBranchStock(branch));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [branch]);

  async function assignStock() {
    await callBeautyMethod({
      method: "beauty_cloud.api.inventory.assign",
      body: {
        beauty_branch: branch,
        employee,
        items: [{ item, qty: Number(qty) }],
      },
    });
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div>
          <Label htmlFor="branch">Branch</Label>
          <Input id="branch" value={branch} onChange={(e) => setBranch(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button variant="secondary" onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      <Card title="Assign to beautician">
        <div className="grid gap-3 sm:grid-cols-4">
          <Input placeholder="Item code" value={item} onChange={(e) => setItem(e.target.value)} />
          <Input placeholder="Qty" value={qty} onChange={(e) => setQty(e.target.value)} />
          <Input placeholder="Employee" value={employee} onChange={(e) => setEmployee(e.target.value)} />
          <Button onClick={assignStock}>Assign</Button>
        </div>
      </Card>

      {loading ? <LoadingState title="Loading stock" /> : null}

      <Card title="Branch stock">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[color:var(--bc-border)] text-[color:var(--bc-muted)]">
                <th className="py-2 pr-4">Item</th>
                <th className="py-2 pr-4">Warehouse</th>
                <th className="py-2">Qty</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((row, i) => (
                <tr key={`${row.item_code}-${i}`} className="border-b border-[color:var(--bc-border)]/50">
                  <td className="py-2 pr-4">{row.item_name ?? row.item_code}</td>
                  <td className="py-2 pr-4">{row.warehouse}</td>
                  <td className="py-2">{row.actual_qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
