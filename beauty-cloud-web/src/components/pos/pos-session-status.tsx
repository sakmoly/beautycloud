"use client";

import { useCallback, useEffect, useState } from "react";

import { getPosSessionContext } from "@/lib/api/browser-client";
import { loadStoredRegisterForBranch } from "@/components/pos/pos-register-store";
import type { PosSessionContext } from "@/components/pos/pos-session-types";
import { evaluatePosCheckoutReady } from "@/components/pos/pos-session-utils";

type Props = {
  branch: string;
  onManage?: () => void;
  onReadyChange?: (ready: boolean, reason?: string | null) => void;
};

export function PosSessionStatus({ branch, onManage, onReadyChange }: Props) {
  const [context, setContext] = useState<PosSessionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockReason, setBlockReason] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const reg = loadStoredRegisterForBranch(branch);
      const ctx = (await getPosSessionContext({
        beauty_branch: branch,
        register_code: reg?.register_code,
        register_api_key: reg?.register_api_key,
      })) as PosSessionContext;
      setContext(ctx);
      const gate = evaluatePosCheckoutReady(ctx, Boolean(reg));
      setBlockReason(gate.reason);
      onReadyChange?.(gate.ready, gate.reason);
    } catch (error) {
      setContext(null);
      const message =
        error instanceof Error ? error.message : "Could not verify POS session";
      setBlockReason(message);
      onReadyChange?.(false, message);
    } finally {
      setLoading(false);
    }
  }, [branch, onReadyChange]);

  useEffect(() => {
    void refresh().catch(() => {});
  }, [refresh]);

  const dayLabel = context?.business_day?.business_date ?? "Not open";
  const dayStatus = context?.business_day?.status;
  const registerCode = loadStoredRegisterForBranch(branch)?.register_code ?? "Not paired";
  const registerStatus = context?.register_session?.status;

  const ready = Boolean(context) && !blockReason;

  return (
    <div className={`pos-session-status ${ready ? "pos-session-status--ready" : "pos-session-status--blocked"}`}>
      <div className="pos-session-status__items">
        <span>
          Day: <strong>{dayLabel}</strong>
          {dayStatus ? ` (${dayStatus})` : ""}
        </span>
        <span>
          Register: <strong>{registerCode}</strong>
          {registerStatus === "Open" ? " · Open" : registerStatus === "Closed" ? " · Closed" : ""}
        </span>
        {!loading && blockReason ? (
          <span className="pos-session-status__hint">{blockReason}</span>
        ) : null}
      </div>
      {onManage ? (
        <button type="button" className="pos-session-status__link" onClick={onManage}>
          Register &amp; Day →
        </button>
      ) : null}
    </div>
  );
}
