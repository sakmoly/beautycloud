"use client";

import { useCallback, useEffect, useState } from "react";

import { parseCheckInQr } from "@/lib/check-in-qr";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { QrCameraScanner, QrCameraToggle } from "@/components/reception/qr-camera-scanner";

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
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(() => {
    if (!cameraOpen) {
      document.getElementById("checkin-qr")?.focus();
    }
  }, [cameraOpen]);

  const verify = useCallback(
    (raw: string) => {
      setError(null);
      const parsed = parseCheckInQr(raw);
      if (!parsed) {
        setError("Unrecognized QR code. Ask the guest to show their booking QR from My bookings.");
        setVerified(false);
        onClear?.();
        return false;
      }

      if (expectedAppointment && parsed.appointment !== expectedAppointment) {
        setError(
          `This QR is for ${parsed.appointment}, not ${expectedAppointment}. Open the correct appointment or rescan.`,
        );
        setVerified(false);
        onClear?.();
        return false;
      }

      if (!parsed.token) {
        setError("QR code is missing a security token. Use the QR from the customer's booking confirmation.");
        setVerified(false);
        onClear?.();
        return false;
      }

      setScanValue(raw.trim());
      setVerified(true);
      setCameraOpen(false);
      onVerified(parsed);
      return true;
    },
    [expectedAppointment, onClear, onVerified],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    verify(scanValue);
  }

  function handleCameraScan(text: string) {
    verify(text);
  }

  return (
    <section className="rounded-2xl border border-[color:var(--bc-border)] bg-[color:var(--bc-accent-muted)]/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--bc-muted)]">
        Verify guest QR
      </p>
      <p className="mt-1 text-sm text-[color:var(--bc-muted)]">
        Tap <strong>Scan with camera</strong> on your phone, or paste the QR text. USB barcode scanners
        work in the field below too.
      </p>

      <div className="mt-3 space-y-3">
        <QrCameraToggle
          open={cameraOpen}
          disabled={verified}
          onToggle={() => {
            setCameraOpen((open) => !open);
            setError(null);
          }}
        />

        <QrCameraScanner
          active={cameraOpen && !verified}
          onScan={handleCameraScan}
          onError={(message) => setError(message)}
        />

        <form onSubmit={handleSubmit} className="space-y-3">
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
      </div>

      {error ? <p className="mt-3 text-sm text-[color:var(--bc-danger)]">{error}</p> : null}
    </section>
  );
}
