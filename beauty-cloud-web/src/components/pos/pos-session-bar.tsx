"use client";

import { useCallback, useEffect, useState } from "react";

import {
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

export type PosSessionContext = {
  enforce_business_day?: boolean;
  enforce_register_session?: boolean;
  business_day?: {
    name?: string;
    business_date?: string;
    status?: string;
  } | null;
  suggested_business_date?: string;
  register?: { register_code?: string; register_name?: string } | null;
  register_session?: {
    name?: string;
    status?: string;
    opening_float?: number;
    business_date?: string;
  } | null;
  open_registers?: Array<{ name?: string; register_code?: string; cashier?: string }>;
  can_unpair_register?: boolean;
};

type Props = {
  branch: string;
  onReadyChange?: (ready: boolean) => void;
};

export function PosSessionBar({ branch, onReadyChange }: Props) {
  const [context, setContext] = useState<PosSessionContext | null>(null);
  const [stored, setStored] = useState<StoredPosRegister | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPair, setShowPair] = useState(false);
  const [showOpenRegister, setShowOpenRegister] = useState(false);
  const [showOpenDay, setShowOpenDay] = useState(false);
  const [showCloseRegister, setShowCloseRegister] = useState(false);

  const [pairCode, setPairCode] = useState("REG-01");
  const [pairKey, setPairKey] = useState("");
  const [openingFloat, setOpeningFloat] = useState("500");
  const [closingCash, setClosingCash] = useState("");
  const [businessDate, setBusinessDate] = useState("");
  const [loading, setLoading] = useState(true);

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

      const ready =
        (!ctx.enforce_business_day || ctx.business_day?.status === "Open") &&
        (!ctx.enforce_register_session || ctx.register_session?.status === "Open");
      onReadyChange?.(ready);
    } catch (e) {
      setContext(null);
      setError(e instanceof Error ? e.message : "Could not load POS session status");
      onReadyChange?.(false);
    } finally {
      setLoading(false);
    }
  }, [branch, onReadyChange]);

  useEffect(() => {
    void refresh().catch(() => {});
  }, [refresh]);

  const needsDay = Boolean(context?.enforce_business_day && context.business_day?.status !== "Open");
  const needsPair = !stored;
  const needsRegister = Boolean(
    context?.enforce_register_session && stored && context.register_session?.status !== "Open",
  );

  async function handlePair() {
    setBusy(true);
    setError(null);
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
      setShowPair(false);
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
    try {
      await openPosBusinessDay({ beauty_branch: branch, business_date: businessDate || undefined });
      setShowOpenDay(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open business day");
    } finally {
      setBusy(false);
    }
  }

  async function handleOpenRegister() {
    if (!stored) return;
    setBusy(true);
    setError(null);
    try {
      await openPosRegisterSession({
        register_code: stored.register_code,
        register_api_key: stored.register_api_key,
        opening_float: Number(openingFloat || 0),
      });
      setShowOpenRegister(false);
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
    try {
      await closePosRegisterSession({
        session: context.register_session.name,
        closing_cash: Number(closingCash || 0),
      });
      setShowCloseRegister(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not close register");
    } finally {
      setBusy(false);
    }
  }

  async function unpair() {
    if (!stored || !context?.can_unpair_register) return;
    if (context.register_session?.status === "Open") {
      setError("Close the register session before unpairing");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await unpairPosRegister({
        register_code: stored.register_code,
        register_api_key: stored.register_api_key,
      });
      clearStoredRegister();
      setStored(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not unpair register");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="pos-session-bar">
        <div className="pos-session-bar__summary">
          <span>Loading POS session…</span>
        </div>
      </div>
    );
  }

  if (!context) {
    return (
      <div className="pos-session-bar">
        <div className="pos-session-bar__summary">
          <span>
            <strong>POS session unavailable</strong>
          </span>
        </div>
        {error ? <p className="pos-session-bar__error">{error}</p> : null}
        <div className="pos-session-bar__actions">
          <Button type="button" variant="secondary" onClick={() => void refresh()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pos-session-bar">
      <div className="pos-session-bar__summary">
        <span>
          Business day:{" "}
          <strong>
            {context.business_day?.business_date ?? "Not open"}
            {context.business_day?.status ? ` (${context.business_day.status})` : ""}
          </strong>
        </span>
        <span>
          Register:{" "}
          <strong>
            {stored?.register_code ?? "Not paired"}
            {context.register_session?.status === "Open" ? " · Open" : ""}
          </strong>
        </span>
      </div>

      <div className="pos-session-bar__actions">
        {needsDay ? (
          <Button type="button" variant="secondary" onClick={() => setShowOpenDay(true)}>
            Open business day
          </Button>
        ) : null}
        {needsPair ? (
          <Button type="button" variant="secondary" onClick={() => setShowPair(true)}>
            Pair register
          </Button>
        ) : (
          <>
            {needsRegister ? (
              <Button type="button" variant="secondary" onClick={() => setShowOpenRegister(true)}>
                Open register
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => setShowCloseRegister(true)}>
                Close register
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={() => void unpair()} disabled={!context.can_unpair_register}>
              Unpair
            </Button>
          </>
        )}
      </div>

      {error ? <p className="pos-session-bar__error">{error}</p> : null}

      {showPair ? (
        <div className="pos-session-bar__panel">
          <Label>Register code</Label>
          <Input value={pairCode} onChange={(e) => setPairCode(e.target.value)} />
          <Label>API key (from Desk → Beauty POS Register → Pairing → Show API Key)</Label>
          <Input type="password" value={pairKey} onChange={(e) => setPairKey(e.target.value)} />
          <div className="pos-session-bar__panel-actions">
            <Button type="button" disabled={busy} onClick={() => void handlePair()}>
              Save pairing
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowPair(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {showOpenDay ? (
        <div className="pos-session-bar__panel">
          <Label>Business date</Label>
          <Input type="date" value={businessDate} onChange={(e) => setBusinessDate(e.target.value)} />
          <div className="pos-session-bar__panel-actions">
            <Button type="button" disabled={busy} onClick={() => void handleOpenDay()}>
              Open day
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowOpenDay(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {showOpenRegister ? (
        <div className="pos-session-bar__panel">
          <Label>Opening float</Label>
          <Input value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} />
          <div className="pos-session-bar__panel-actions">
            <Button type="button" disabled={busy} onClick={() => void handleOpenRegister()}>
              Open register
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowOpenRegister(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {showCloseRegister ? (
        <div className="pos-session-bar__panel">
          <Label>Closing cash count</Label>
          <Input value={closingCash} onChange={(e) => setClosingCash(e.target.value)} />
          <div className="pos-session-bar__panel-actions">
            <Button type="button" disabled={busy} onClick={() => void handleCloseRegister()}>
              Close register
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowCloseRegister(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
