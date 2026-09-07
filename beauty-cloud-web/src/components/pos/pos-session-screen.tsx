"use client";

import { useCallback, useEffect, useState } from "react";

import {
  closePosBusinessDay,
  closePosRegisterSession,
  getPosSessionContext,
  openPosBusinessDay,
  openPosRegisterSession,
  pairPosRegister,
  unpairPosRegister,
} from "@/lib/api/browser-client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  clearStoredRegister,
  loadStoredRegister,
  saveStoredRegister,
  type StoredPosRegister,
} from "@/components/pos/pos-register-store";
import type { PosSessionContext } from "@/components/pos/pos-session-types";

type Props = {
  branch: string;
  onReadyChange?: (ready: boolean) => void;
};

function fmtMoney(value?: number) {
  if (value == null || Number.isNaN(value)) return "—";
  return `SAR ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDateTime(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function statusTone(status?: string) {
  if (status === "Open") return "open";
  if (status === "Closed") return "closed";
  if (status === "Posted") return "posted";
  return "idle";
}

export function PosSessionScreen({ branch, onReadyChange }: Props) {
  const [context, setContext] = useState<PosSessionContext | null>(null);
  const [stored, setStored] = useState<StoredPosRegister | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [pairCode, setPairCode] = useState("REG-01");
  const [pairKey, setPairKey] = useState("");
  const [openingFloat, setOpeningFloat] = useState("500");
  const [closingCash, setClosingCash] = useState("");
  const [businessDate, setBusinessDate] = useState("");
  const [dayNotes, setDayNotes] = useState("");
  const [closeDayNotes, setCloseDayNotes] = useState("");
  const [registerNotes, setRegisterNotes] = useState("");
  const [showUnpairConfirm, setShowUnpairConfirm] = useState(false);
  const [unpairConfirmCode, setUnpairConfirmCode] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const reg = loadStoredRegister();
      setStored(reg);
      const ctx = (await getPosSessionContext({
        beauty_branch: branch,
        register_code: reg?.register_code,
        register_api_key: reg?.register_api_key,
      })) as PosSessionContext;
      setContext(ctx);
      if (ctx.suggested_business_date) setBusinessDate(ctx.suggested_business_date);
      if (ctx.register_session?.expected_cash != null) {
        setClosingCash(String(ctx.register_session.expected_cash));
      }

      const ready =
        (!ctx.enforce_business_day || ctx.business_day?.status === "Open") &&
        (!ctx.enforce_register_session || ctx.register_session?.status === "Open");
      onReadyChange?.(ready);
    } catch (e) {
      setContext(null);
      setError(e instanceof Error ? e.message : "Could not load session dashboard");
      onReadyChange?.(false);
    } finally {
      setLoading(false);
    }
  }, [branch, onReadyChange]);

  useEffect(() => {
    void refresh().catch(() => {});
  }, [refresh]);

  async function handlePair() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const reg = (await pairPosRegister({
        register_code: pairCode.trim(),
        register_api_key: pairKey.trim(),
        beauty_branch: branch,
      })) as { register_code?: string; register_name?: string };
      const saved: StoredPosRegister = {
        register_code: pairCode.trim(),
        register_api_key: pairKey.trim(),
        register_name: reg.register_name,
        beauty_branch: branch,
      };
      saveStoredRegister(saved);
      setStored(saved);
      setMessage(`Paired with ${reg.register_name ?? saved.register_code}`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not pair register");
    } finally {
      setBusy(false);
    }
  }

  async function handleOpenDay() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = (await openPosBusinessDay({
        beauty_branch: branch,
        business_date: businessDate || undefined,
        notes: dayNotes || undefined,
      })) as { name?: string; business_date?: string };
      setMessage(`Business day opened · ${result.name ?? result.business_date ?? ""}`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open business day");
    } finally {
      setBusy(false);
    }
  }

  async function handleCloseDay() {
    if (!context?.business_day?.name) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = (await closePosBusinessDay({
        beauty_branch: branch,
        name: context.business_day.name,
        notes: closeDayNotes || undefined,
      })) as { name?: string; total_sales?: number; transaction_count?: number };
      setMessage(
        `Business day closed · ${result.transaction_count ?? 0} transactions · ${fmtMoney(result.total_sales)}`,
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not close business day");
    } finally {
      setBusy(false);
    }
  }

  async function handleOpenRegister() {
    if (!stored) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = (await openPosRegisterSession({
        register_code: stored.register_code,
        register_api_key: stored.register_api_key,
        opening_float: Number(openingFloat || 0),
      })) as { name?: string; register_code?: string };
      setMessage(`Register session opened · ${result.name ?? result.register_code ?? ""}`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open register");
    } finally {
      setBusy(false);
    }
  }

  async function handleCloseRegister() {
    if (!context?.register_session?.name) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = (await closePosRegisterSession({
        session: context.register_session.name,
        closing_cash: Number(closingCash || 0),
        notes: registerNotes || undefined,
      })) as { name?: string; cash_variance?: number; total_sales?: number };
      const variance = result.cash_variance ?? 0;
      setMessage(
        `Register closed · ${result.name ?? ""} · sales ${fmtMoney(result.total_sales)} · variance ${fmtMoney(variance)}`,
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not close register");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnpair() {
    if (!stored || !context?.can_unpair_register) return;
    if (unpairConfirmCode.trim().toUpperCase() !== stored.register_code.trim().toUpperCase()) {
      setError(`Type ${stored.register_code} to confirm unpairing`);
      return;
    }
    if (context.register_session?.status === "Open") {
      setError("Close the register session before unpairing this device");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await unpairPosRegister({
        register_code: stored.register_code,
        register_api_key: stored.register_api_key,
      });
      clearStoredRegister();
      setStored(null);
      setShowUnpairConfirm(false);
      setUnpairConfirmCode("");
      setMessage("Register unpaired from this device");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not unpair register");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="pos-session-screen">
        <p className="pos-session-screen__loading">Loading register &amp; day dashboard…</p>
      </div>
    );
  }

  if (!context) {
    return (
      <div className="pos-session-screen">
        <div className="pos-session-card">
          <h3>Session unavailable</h3>
          <p className="pos-session-muted">{error ?? "Could not connect to the server."}</p>
          <Button type="button" variant="secondary" onClick={() => void refresh()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const dayOpen = context.business_day?.status === "Open";
  const registerOpen = context.register_session?.status === "Open";
  const canCloseDay =
    Boolean(context.can_manage_business_day && dayOpen) &&
    (!context.require_all_registers_closed || (context.open_registers?.length ?? 0) === 0);

  return (
    <div className="pos-session-screen">
      <div className="bc-hero">
        <div>
          <p className="text-sm font-medium text-[color:var(--bc-muted)]">Checkout desk</p>
          <h2 className="text-2xl font-bold tracking-tight">Register &amp; business day</h2>
          <p className="bc-section-sub">
            Open and close sessions here — synced with Beauty Business Day and Beauty Register Session
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void refresh()} disabled={busy}>
          Refresh
        </Button>
      </div>

      {message ? <div className="pos-session-banner pos-session-banner--success">{message}</div> : null}
      {error ? <div className="pos-session-banner pos-session-banner--error">{error}</div> : null}

      <div className="pos-session-grid">
        {/* Business Day */}
        <section className="pos-session-card">
          <header className="pos-session-card__header">
            <div>
              <p className="pos-session-card__eyebrow">Beauty Business Day</p>
              <h3>Business day</h3>
            </div>
            <span className={`pos-session-pill pos-session-pill--${statusTone(context.business_day?.status)}`}>
              {context.business_day?.status ?? "Not open"}
            </span>
          </header>

          {dayOpen ? (
            <dl className="pos-session-dl">
              <div>
                <dt>Document</dt>
                <dd>{context.business_day?.name}</dd>
              </div>
              <div>
                <dt>Business date</dt>
                <dd>{context.business_day?.business_date}</dd>
              </div>
              <div>
                <dt>Opened</dt>
                <dd>
                  {fmtDateTime(context.business_day?.opened_at)} · {context.business_day?.opened_by}
                </dd>
              </div>
              <div>
                <dt>Live totals</dt>
                <dd>
                  {context.business_day?.transaction_count ?? 0} tx ·{" "}
                  {fmtMoney(context.business_day?.total_sales)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="pos-session-muted">
              No open business day for this branch.
              {context.suggested_business_date
                ? ` Suggested date: ${context.suggested_business_date}.`
                : ""}
            </p>
          )}

          {context.can_manage_business_day ? (
            <div className="pos-session-card__actions">
              {!dayOpen ? (
                <div className="pos-session-form">
                  <Label htmlFor="business-date">Business date</Label>
                  <Input
                    id="business-date"
                    type="date"
                    value={businessDate}
                    onChange={(e) => setBusinessDate(e.target.value)}
                  />
                  <Label htmlFor="day-notes">Notes (optional)</Label>
                  <Input id="day-notes" value={dayNotes} onChange={(e) => setDayNotes(e.target.value)} />
                  <Button type="button" disabled={busy} onClick={() => void handleOpenDay()}>
                    Open business day
                  </Button>
                </div>
              ) : (
                <div className="pos-session-form">
                  {(context.open_registers?.length ?? 0) > 0 ? (
                    <p className="pos-session-warn">
                      Close all register sessions before closing the business day (
                      {context.open_registers?.length} still open).
                    </p>
                  ) : null}
                  <Label htmlFor="close-day-notes">Close notes (optional)</Label>
                  <Input
                    id="close-day-notes"
                    value={closeDayNotes}
                    onChange={(e) => setCloseDayNotes(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy || !canCloseDay}
                    onClick={() => void handleCloseDay()}
                  >
                    Close business day
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="pos-session-muted">Only a branch manager can open or close the business day.</p>
          )}
        </section>

        {/* Register pairing + session */}
        <section className="pos-session-card">
          <header className="pos-session-card__header">
            <div>
              <p className="pos-session-card__eyebrow">Beauty POS Register</p>
              <h3>This device</h3>
            </div>
            <span className={`pos-session-pill pos-session-pill--${stored ? "open" : "idle"}`}>
              {stored?.register_code ?? "Not paired"}
            </span>
          </header>

          {!stored ? (
            <div className="pos-session-form">
              <p className="pos-session-muted">
                Pair this tablet with a register. Get the API key from Desk → Beauty POS Register → Pairing.
              </p>
              <Label htmlFor="pair-code">Register code</Label>
              <Input id="pair-code" value={pairCode} onChange={(e) => setPairCode(e.target.value)} />
              <Label htmlFor="pair-key">API key</Label>
              <Input
                id="pair-key"
                type="password"
                value={pairKey}
                onChange={(e) => setPairKey(e.target.value)}
              />
              <Button type="button" disabled={busy} onClick={() => void handlePair()}>
                Pair register
              </Button>
            </div>
          ) : (
            <>
              <dl className="pos-session-dl">
                <div>
                  <dt>Register</dt>
                  <dd>
                    {stored.register_code}
                    {context.register?.register_name ? ` · ${context.register.register_name}` : ""}
                  </dd>
                </div>
                <div>
                  <dt>Session</dt>
                  <dd>
                    {registerOpen ? (
                      <>
                        <span className="pos-session-pill pos-session-pill--open inline">Open</span>{" "}
                        {context.register_session?.name}
                      </>
                    ) : (
                      "No open session on this register"
                    )}
                  </dd>
                </div>
                {registerOpen && context.register_session ? (
                  <>
                    <div>
                      <dt>Opened</dt>
                      <dd>{fmtDateTime(context.register_session.opened_at)}</dd>
                    </div>
                    <div>
                      <dt>Opening float</dt>
                      <dd>{fmtMoney(context.register_session.opening_float)}</dd>
                    </div>
                    <div>
                      <dt>Live sales</dt>
                      <dd>
                        {context.register_session.transaction_count ?? 0} tx ·{" "}
                        {fmtMoney(context.register_session.total_sales)}
                      </dd>
                    </div>
                    <div>
                      <dt>Expected cash</dt>
                      <dd>{fmtMoney(context.register_session.expected_cash)}</dd>
                    </div>
                  </>
                ) : null}
              </dl>

              <div className="pos-session-card__actions">
                {!dayOpen ? (
                  <p className="pos-session-warn">Open a business day before opening this register.</p>
                ) : !registerOpen ? (
                  <div className="pos-session-form">
                    <Label htmlFor="opening-float">Opening float</Label>
                    <Input
                      id="opening-float"
                      value={openingFloat}
                      onChange={(e) => setOpeningFloat(e.target.value)}
                    />
                    <Button type="button" disabled={busy} onClick={() => void handleOpenRegister()}>
                      Open register session
                    </Button>
                  </div>
                ) : (
                  <div className="pos-session-form">
                    <Label htmlFor="closing-cash">Closing cash count</Label>
                    <Input
                      id="closing-cash"
                      value={closingCash}
                      onChange={(e) => setClosingCash(e.target.value)}
                    />
                    <Label htmlFor="register-notes">Notes (optional)</Label>
                    <Input
                      id="register-notes"
                      value={registerNotes}
                      onChange={(e) => setRegisterNotes(e.target.value)}
                    />
                    <Button type="button" variant="secondary" disabled={busy} onClick={() => void handleCloseRegister()}>
                      Close register session
                    </Button>
                  </div>
                )}
                {context.can_unpair_register ? (
                  showUnpairConfirm ? (
                    <div className="pos-session-form">
                      <p className="pos-session-warn">
                        Unpairing removes this device&apos;s register link. Cashiers will need to pair again
                        with a new API key from Desk.
                      </p>
                      <Label htmlFor="unpair-confirm">Type {stored.register_code} to confirm</Label>
                      <Input
                        id="unpair-confirm"
                        value={unpairConfirmCode}
                        onChange={(e) => setUnpairConfirmCode(e.target.value)}
                        autoComplete="off"
                      />
                      <div className="pos-session-card__actions">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={busy || registerOpen}
                          onClick={() => void handleUnpair()}
                        >
                          Confirm unpair
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setShowUnpairConfirm(false);
                            setUnpairConfirmCode("");
                            setError(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={registerOpen}
                      onClick={() => setShowUnpairConfirm(true)}
                    >
                      Unpair device
                    </Button>
                  )
                ) : (
                  <p className="pos-session-muted">Only a branch manager can unpair this device.</p>
                )}
              </div>
            </>
          )}
        </section>

        {/* Open registers today */}
        <section className="pos-session-card pos-session-card--wide">
          <header className="pos-session-card__header">
            <div>
              <p className="pos-session-card__eyebrow">Beauty Register Session</p>
              <h3>Today&apos;s registers</h3>
            </div>
          </header>

          {(context.open_registers?.length ?? 0) === 0 &&
          (context.closed_registers?.length ?? 0) === 0 ? (
            <p className="pos-session-muted">No register sessions for the current business day.</p>
          ) : (
            <div className="pos-session-table-wrap">
              <table className="pos-session-table">
                <thead>
                  <tr>
                    <th>Session</th>
                    <th>Register</th>
                    <th>Cashier</th>
                    <th>Status</th>
                    <th>Sales</th>
                    <th>Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {[...(context.open_registers ?? []), ...(context.closed_registers ?? [])].map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>{row.register_code}</td>
                      <td>{row.cashier}</td>
                      <td>
                        <span className={`pos-session-pill pos-session-pill--${statusTone(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                      <td>
                        {row.transaction_count ?? 0} · {fmtMoney(row.total_sales)}
                      </td>
                      <td>{row.status === "Closed" ? fmtMoney(row.cash_variance) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent business days */}
        <section className="pos-session-card pos-session-card--wide">
          <header className="pos-session-card__header">
            <div>
              <p className="pos-session-card__eyebrow">History</p>
              <h3>Recent business days</h3>
            </div>
          </header>
          {(context.recent_business_days?.length ?? 0) === 0 ? (
            <p className="pos-session-muted">No business days recorded yet.</p>
          ) : (
            <div className="pos-session-table-wrap">
              <table className="pos-session-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Transactions</th>
                    <th>Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {context.recent_business_days?.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>{row.business_date}</td>
                      <td>
                        <span className={`pos-session-pill pos-session-pill--${statusTone(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                      <td>{row.transaction_count ?? 0}</td>
                      <td>{fmtMoney(row.total_sales)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {context.enforce_business_day || context.enforce_register_session ? (
        <p className="pos-session-footer-note">
          Checkout requires
          {context.enforce_business_day ? " an open business day" : ""}
          {context.enforce_business_day && context.enforce_register_session ? " and" : ""}
          {context.enforce_register_session ? " an open register session" : ""}.
        </p>
      ) : null}
    </div>
  );
}
