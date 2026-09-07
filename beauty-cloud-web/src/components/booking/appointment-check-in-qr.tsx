"use client";

import { useEffect, useState } from "react";

import { checkInQrImageUrl } from "@/lib/check-in-qr";
import { withBasePath } from "@/lib/base-path";
import { callBeautyMethod } from "@/lib/api/browser-client";

export function AppointmentCheckInQr({
  appointment,
  guest = false,
  compact = false,
}: {
  appointment: string;
  guest?: boolean;
  compact?: boolean;
}) {
  const [qrText, setQrText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appointment) return;

    if (guest) {
      fetch(withBasePath(`/api/beauty/customer/check-in-qr?appointment=${encodeURIComponent(appointment)}`), {
        cache: "no-store",
      })
        .then(async (res) => {
          const payload = await res.json();
          if (!res.ok) throw new Error(payload.error ?? "Could not load QR");
          setQrText(payload.data?.qr_text ?? null);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Could not load QR"));
      return;
    }

    callBeautyMethod<{ qr_text: string }>({
      method: "beauty_cloud.api.reception.get_check_in_qr",
      params: { name: appointment },
    })
      .then((data) => setQrText(data.qr_text))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load QR"));
  }, [appointment, guest]);

  if (error) {
    return <p className="text-sm text-[color:var(--bc-danger)]">{error}</p>;
  }

  if (!qrText) {
    return <p className="text-sm text-[color:var(--bc-muted)]">Loading check-in QR…</p>;
  }

  const size = compact ? 140 : 200;

  return (
    <div className={`text-center ${compact ? "" : "rounded-2xl border border-[color:var(--bc-border)] bg-white p-4"}`}>
      {!compact ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--bc-muted)]">
          Check-in QR code
        </p>
      ) : null}
      <img
        src={checkInQrImageUrl(qrText, size)}
        alt={`Check-in QR for ${appointment}`}
        width={size}
        height={size}
        className={`mx-auto rounded-xl bg-white ${compact ? "mt-1" : "mt-3"}`}
      />
      {!compact ? (
        <>
          <p className="mt-2 text-sm font-semibold">{appointment}</p>
          <p className="mt-1 text-xs text-[color:var(--bc-muted)]">
            Show this at reception when you arrive
          </p>
        </>
      ) : null}
    </div>
  );
}
