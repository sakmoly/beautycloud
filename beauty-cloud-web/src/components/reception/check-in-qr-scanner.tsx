"use client";

import { useEffect, useState } from "react";

import { parseCheckInQr } from "@/lib/check-in-qr";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function CheckInQrScanner({
  expectedAppointment,
  onVerified,
  onClear,
}: {
  expectedAppointment?: string;
  onVerified: (payload: { appointment: string; token: string }) => void;
  onClear?: () => void;
}) {
  const [scanValue, setScanValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    document.getElementById("checkin-qr")?.focus();
  }, []);

  function verify(raw: string) {
    setError(null);
    const parsed = parseCheckInQr(raw);
    if (!parsed) {
      setError("Unrecognized QR code. Ask the guest to show their booking QR from My bookings.");
      setVerified(false);
      onClear?.();
      return;
    }

    if (expectedAppointment && parsed.appointment !== expectedAppointment) {
      setError(
        `This QR is for ${parsed.appointment}, not ${expectedAppointment}. Open the correct appointment or rescan.`,
      );
      setVerified(false);
      onClear?.();
      return;
    }

    if (!parsed.token) {
      setError("QR code is missing a security token. Use the QR from the customer's booking confirmation.");
      setVerified(false);
      onClear?.();
      return;
    }

    setVerified(true);
    onVerified(parsed);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    verify(scanValue);
  }

  return (
    <section className="rounded-2xl border border-[color:var(--bc-border)] bg-[color:var(--bc-accent-muted)]/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--bc-muted)]">
        Verify guest QR
      </p>
      <p className="mt-1 text-sm text-[color:var(--bc-muted)]">
        Scan the customer&apos;s booking QR code (phone screen or printout). USB barcode scanners work
        in this field too.
      </p>

      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        <div>
          <Label htmlFor="checkin-qr">Appointment QR</Label>
          <Input
            id="checkin-qr"
            value={scanValue}
            onChange={(e) => {
              setScanValue(e.target.value);
              setVerified(false);
              onClear?.();
            }}
            placeholder="Scan or paste BCAPT|BAPT-…|token"
            className="font-mono text-sm"
            autoComplete="off"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="secondary" disabled={!scanValue.trim()}>
            Verify QR
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
