"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getPosFulfillmentQueue, markPosItemsDelivered } from "@/lib/api/browser-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export type FulfillmentRow = {
  line_name?: string;
  transaction?: string;
  item?: string;
  item_name?: string;
  qty?: number;
  amount?: number;
  fulfillment_status?: string;
  delivered_at?: string;
  delivered_by?: string;
  customer_name?: string;
  invoice?: string;
  register_code?: string;
  paid_at?: string;
};

type Props = {
  branch: string;
  businessDate?: string;
};

type StatusFilter = "pending" | "delivered" | "all";

function fmtTime(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function PosFulfillmentScreen({ branch, businessDate }: Props) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const date = businessDate || today;

  const [rows, setRows] = useState<FulfillmentRow[]>([]);
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [canMark, setCanMark] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const pageSize = 50;
  const hasMore = page * pageSize < total;

  useEffect(() => {
    let cancelled = false;
    const append = page > 1;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const result = (await getPosFulfillmentQueue({
          beauty_branch: branch,
          business_date: date,
          status,
          search: search || undefined,
          page,
          page_size: pageSize,
        })) as {
          items?: FulfillmentRow[];
          total?: number;
          pending_count?: number;
          can_mark_delivered?: boolean;
        };
        if (cancelled) return;
        const nextRows = result.items ?? [];
        setRows((prev) => (append ? [...prev, ...nextRows] : nextRows));
        setTotal(result.total ?? 0);
        setPendingCount(result.pending_count ?? 0);
        setCanMark(Boolean(result.can_mark_delivered));
        if (!append) setSelected(new Set());
      } catch (e) {
        if (cancelled) return;
        if (!append) setRows([]);
        setError(e instanceof Error ? e.message : "Could not load retail pickup queue");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [branch, date, status, search, page, refreshKey]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  function toggleRow(lineName?: string) {
    if (!lineName) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(lineName)) next.delete(lineName);
      else next.add(lineName);
      return next;
    });
  }

  function toggleAllPending() {
    const pendingLines = rows
      .filter((r) => r.fulfillment_status === "Pending" && r.line_name)
      .map((r) => r.line_name as string);
    if (pendingLines.every((n) => selected.has(n))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingLines));
    }
  }

  async function markDelivered(lineNames: string[]) {
    const valid = lineNames.filter(Boolean);
    if (!valid.length) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = (await markPosItemsDelivered(valid)) as { count?: number };
      const count = result.count ?? 0;
      if (count === 0) {
        setMessage("No changes — item may already be delivered. Refreshing…");
      } else {
        setMessage(`Marked ${count} product(s) as delivered`);
      }
      setSelected(new Set());
      setPage(1);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not mark delivered");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pos-fulfillment-screen">
      <div className="bc-hero flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[color:var(--bc-muted)]">Checkout desk</p>
          <h2 className="text-2xl font-bold tracking-tight">Retail pickup</h2>
          <p className="bc-section-sub">
            Hand off paid products (shampoo, retail, etc.) · {pendingCount} pending today
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => { setPage(1); setRefreshKey((k) => k + 1); }} disabled={loading || busy}>
          Refresh
        </Button>
      </div>

      {message ? <div className="pos-session-banner pos-session-banner--success">{message}</div> : null}
      {error ? <div className="pos-session-banner pos-session-banner--error">{error}</div> : null}

      <div className="pos-filters-bar">
        <div className="flex flex-wrap gap-2">
          {(["pending", "delivered", "all"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`bc-chip ${status === f ? "active" : "inactive"}`}
              onClick={() => {
                setStatus(f);
                setPage(1);
              }}
            >
              {f === "pending" ? `Pending (${pendingCount})` : f === "delivered" ? "Delivered" : "All"}
            </button>
          ))}
        </div>
        <div className="min-w-[220px] flex-[2]">
          <Label htmlFor="fulfillment-search">Search</Label>
          <div className="bc-search mt-1.5">
            <span className="bc-search-icon" aria-hidden>
              🔍
            </span>
            <input
              id="fulfillment-search"
              placeholder="Customer, product, invoice, or sale ref"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      {canMark && status !== "delivered" && rows.some((r) => r.fulfillment_status === "Pending") ? (
        <div className="pos-fulfillment-actions">
          <Button type="button" variant="secondary" onClick={toggleAllPending}>
            {rows.filter((r) => r.fulfillment_status === "Pending").every((r) => selected.has(r.line_name ?? ""))
              ? "Clear selection"
              : "Select all pending"}
          </Button>
          <Button
            type="button"
            disabled={busy || selected.size === 0}
            onClick={() => void markDelivered([...selected])}
          >
            Mark delivered ({selected.size})
          </Button>
        </div>
      ) : null}

      <div className="pos-fulfillment-grid-wrap">
        {loading ? (
          <p className="pos-session-muted">Loading retail pickup queue…</p>
        ) : rows.length === 0 ? (
          <p className="pos-session-muted">No retail products in this queue for {date}.</p>
        ) : (
          <table className="pos-fulfillment-grid">
            <thead>
              <tr>
                {canMark && status !== "delivered" ? <th /> : null}
                <th>Time</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Amount</th>
                <th>Sale / Invoice</th>
                <th>Register</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isPending = row.fulfillment_status === "Pending";
                return (
                  <tr key={row.line_name} className={isPending ? "pos-fulfillment-row--pending" : ""}>
                    {canMark && status !== "delivered" ? (
                      <td>
                        {isPending ? (
                          <input
                            type="checkbox"
                            checked={selected.has(row.line_name ?? "")}
                            onChange={() => toggleRow(row.line_name)}
                          />
                        ) : null}
                      </td>
                    ) : null}
                    <td>{fmtTime(row.paid_at)}</td>
                    <td>{row.customer_name ?? "Guest"}</td>
                    <td>{row.item_name ?? row.item}</td>
                    <td>{row.qty ?? 1}</td>
                    <td>SAR {row.amount ?? 0}</td>
                    <td>
                      <span className="block text-xs text-[color:var(--bc-muted)]">{row.transaction}</span>
                      {row.invoice ? <span className="block text-xs">{row.invoice}</span> : null}
                    </td>
                    <td>{row.register_code ?? "—"}</td>
                    <td>
                      <Badge tone={isPending ? "warning" : "success"}>
                        {row.fulfillment_status ?? "Pending"}
                      </Badge>
                    </td>
                    <td className="pos-fulfillment-grid__action">
                      {canMark && isPending && row.line_name ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="pos-fulfillment-deliver-btn"
                          disabled={busy}
                          onClick={() => void markDelivered([row.line_name!])}
                        >
                          Deliver
                        </Button>
                      ) : row.fulfillment_status === "Delivered" ? (
                        <span className="pos-fulfillment-delivered-label">Done</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {hasMore ? (
        <div className="pos-fulfillment-more">
          <Button type="button" variant="secondary" disabled={loading} onClick={() => setPage((p) => p + 1)}>
            Load more
          </Button>
          <span className="pos-session-muted">
            Showing {rows.length} of {total}
          </span>
        </div>
      ) : total > 0 ? (
        <p className="pos-session-muted text-center">{total} line(s) · page {page}</p>
      ) : null}

      {!canMark ? (
        <p className="pos-session-footer-note">Ask reception or a cashier to mark products as delivered.</p>
      ) : null}
    </div>
  );
}
