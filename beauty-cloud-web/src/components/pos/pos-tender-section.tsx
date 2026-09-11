"use client";

export type TenderLine = {
  id: string;
  mode: string;
  amount: string;
};

export function parseTenderAmount(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function sumTender(lines: TenderLine[]): number {
  return lines.reduce((sum, line) => sum + parseTenderAmount(line.amount), 0);
}

export function createTenderLine(mode: string, amount = ""): TenderLine {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    mode,
    amount,
  };
}

export function initTenderLines(defaultMode: string): TenderLine[] {
  return [createTenderLine(defaultMode, "")];
}

type PosTenderSectionProps = {
  paymentMethods: string[];
  lines: TenderLine[];
  onChange: (lines: TenderLine[]) => void;
  grandTotal: number;
  disabled?: boolean;
};

export function PosTenderSection({
  paymentMethods,
  lines,
  onChange,
  grandTotal,
  disabled = false,
}: PosTenderSectionProps) {
  const canTender = grandTotal > 0 && !disabled;
  const paid = sumTender(lines);
  const outstanding = canTender ? Math.max(grandTotal - paid, 0) : 0;
  const change = canTender ? Math.max(paid - grandTotal, 0) : 0;

  function updateLine(id: string, patch: Partial<TenderLine>) {
    onChange(lines.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function removeLine(id: string) {
    if (lines.length <= 1) return;
    onChange(lines.filter((line) => line.id !== id));
  }

  function addLine(mode?: string) {
    const nextMode = mode ?? paymentMethods[0] ?? "Cash";
    const balance = Math.max(grandTotal - sumTender(lines), 0);
    onChange([...lines, createTenderLine(nextMode, balance > 0 ? String(balance) : "")]);
  }

  function fillRemaining(id: string) {
    const others = lines.filter((line) => line.id !== id);
    const balance = Math.max(grandTotal - sumTender(others), 0);
    updateLine(id, { amount: balance > 0 ? String(balance) : "" });
  }

  if (!canTender) {
    return (
      <div className="pos-tender">
        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--bc-muted)]">
          Tender
        </p>
        <p className="mt-2 rounded-2xl bg-[color:var(--bc-accent-muted)] px-3 py-2.5 text-xs text-[color:var(--bc-muted)]">
          Add services or products to the ticket before collecting payment.
        </p>
      </div>
    );
  }

  return (
    <div className="pos-tender space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--bc-muted)]">
          Tender
        </p>
        {!disabled ? (
          <button
            type="button"
            className="text-xs font-semibold text-[color:var(--bc-primary)] hover:underline"
            onClick={() => addLine()}
          >
            + Add payment
          </button>
        ) : null}
      </div>

      <ul className="space-y-2">
        {lines.map((line) => (
          <li key={line.id} className="pos-tender-row">
            <select
              className="pos-tender-mode"
              value={line.mode}
              disabled={disabled}
              onChange={(e) => updateLine(line.id, { mode: e.target.value })}
            >
              {paymentMethods.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="Received"
              aria-label={`${line.mode} amount received`}
              className="pos-tender-amount"
              value={line.amount}
              disabled={disabled}
              onChange={(e) => updateLine(line.id, { amount: e.target.value })}
            />
            {!disabled && lines.length > 1 ? (
              <button
                type="button"
                className="pos-tender-remove"
                aria-label="Remove payment"
                onClick={() => removeLine(line.id)}
              >
                ×
              </button>
            ) : null}
            {!disabled && outstanding > 0 ? (
              <button
                type="button"
                className="pos-tender-fill"
                onClick={() => fillRemaining(line.id)}
              >
                Fill
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {!disabled ? (
        <div className="flex flex-wrap gap-2">
          {paymentMethods.map((mode) => (
            <button
              key={mode}
              type="button"
              className="bc-chip inactive text-xs"
              onClick={() => addLine(mode)}
            >
              + {mode}
            </button>
          ))}
        </div>
      ) : null}

      {paid === 0 ? (
        <p className="text-xs text-[color:var(--bc-muted)]">
          Enter the amount received for each payment method.
        </p>
      ) : (
        <dl className="pos-tender-summary">
          {outstanding > 0 ? (
            <div className="pos-tender-outstanding">
              <dt>Balance due</dt>
              <dd>SAR {outstanding.toFixed(2)}</dd>
            </div>
          ) : null}
          {change > 0 ? (
            <div className="pos-tender-change">
              <dt>Change</dt>
              <dd>SAR {change.toFixed(2)}</dd>
            </div>
          ) : null}
          {outstanding === 0 && change === 0 ? (
            <div className="pos-tender-ready">
              <dt>Tendered</dt>
              <dd>SAR {paid.toFixed(2)}</dd>
            </div>
          ) : null}
        </dl>
      )}
    </div>
  );
}
