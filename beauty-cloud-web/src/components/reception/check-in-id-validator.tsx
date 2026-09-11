"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

function normalizeAppointmentId(value: string): string {
  return value.trim().toUpperCase();
}

export function CheckInIdValidator({
  expectedAppointment,
  onVerified,
  onClear,
}: {
  expectedAppointment: string;
  onVerified: (appointmentId: string) => void;
  onClear?: () => void;
}) {
  const [enteredId, setEnteredId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  const verify = useCallback(
    (raw: string) => {
      setError(null);
      const normalized = normalizeAppointmentId(raw);
      const expected = normalizeAppointmentId(expectedAppointment);

      if (!normalized) {
        setError("Enter the guest's appointment reference (e.g. BAPT-2026-00038).");
        setVerified(false);
        onClear?.();
        return false;
      }

      if (!/^BAPT-/i.test(normalized)) {
        setError("Appointment ID should look like BAPT-2026-00038.");
        setVerified(false);
        onClear?.();
        return false;
      }

      if (normalized !== expected) {
        setError(
          `This ID is for ${normalized}, not ${expectedAppointment}. Open the correct appointment or ask the guest again.`,
        );
        setVerified(false);
        onClear?.();
        return false;
      }

      setEnteredId(raw.trim());
      setVerified(true);
      onVerified(normalized);
      return true;
    },
    [expectedAppointment, onClear, onVerified],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    verify(enteredId);
  }

  return (
    <section className="rounded-2xl border border-[color:var(--bc-border)] bg-[color:var(--bc-accent-muted)]/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--bc-muted)]">
        Verify appointment ID
      </p>
      <p className="mt-1 text-sm text-[color:var(--bc-muted)]">
        Ask the guest for their booking reference and enter it below to confirm the right person before
        check-in.
      </p>

      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        <div>
          <Label htmlFor="checkin-id">Appointment ID</Label>
          <Input
            id="checkin-id"
            value={enteredId}
            onChange={(e) => {
              setEnteredId(e.target.value);
              setVerified(false);
              setError(null);
              onClear?.();
            }}
            placeholder="BAPT-2026-00038"
            className="font-mono text-sm uppercase"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="secondary" disabled={!enteredId.trim()}>
            Verify ID
          </Button>
          {verified ? (
            <span className="inline-flex items-center rounded-full bg-[color:var(--bc-success)]/15 px-3 py-1.5 text-sm font-semibold text-[color:var(--bc-success)]">
              ✓ Verified
            </span>
          ) : null}
        </div>
      </form>

      {error ? <p className="mt-3 text-sm text-[color:var(--bc-danger)]">{error}</p> : null}
    </section>
  );
}
