"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type Html5QrcodeInstance = {
  stop: () => Promise<void>;
  clear: () => void | Promise<void>;
};

export function QrCameraScanner({
  active,
  onScan,
  onError,
}: {
  active: boolean;
  onScan: (text: string) => void;
  onError?: (message: string) => void;
}) {
  const regionId = useId().replace(/:/g, "");
  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  const handledRef = useRef(false);
  const [starting, setStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      await scanner.stop();
      await Promise.resolve(scanner.clear());
    } catch {
      /* already stopped */
    }
  }, []);

  useEffect(() => {
    if (!active) {
      handledRef.current = false;
      void stopCamera();
      setCameraError(null);
      setStarting(false);
      return;
    }

    if (!window.isSecureContext) {
      const message =
        "Camera needs a secure connection (HTTPS). Paste the QR text below, or open this page on HTTPS.";
      setCameraError(message);
      onError?.(message);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      const message = "This browser does not support camera access. Paste the QR text below instead.";
      setCameraError(message);
      onError?.(message);
      return;
    }

    let cancelled = false;
    handledRef.current = false;

    async function start() {
      setStarting(true);
      setCameraError(null);
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode(regionId, { verbose: false });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: { ideal: "environment" } },
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const size = Math.min(viewfinderWidth, viewfinderHeight, 280) * 0.85;
              return { width: size, height: size };
            },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (handledRef.current) return;
            handledRef.current = true;
            onScan(decodedText);
            void stopCamera();
          },
          () => {
            /* scan attempt — ignore until a code is found */
          },
        );
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message.includes("NotAllowed")
              ? "Camera permission denied. Allow camera access in your browser settings, or paste the QR text below."
              : err.message
            : "Could not open the camera.";
        setCameraError(message);
        onError?.(message);
      } finally {
        if (!cancelled) setStarting(false);
      }
    }

    void start();

    return () => {
      cancelled = true;
      void stopCamera();
    };
  }, [active, onError, onScan, regionId, stopCamera]);

  if (!active) return null;

  return (
    <div className="space-y-2">
      <div
        id={regionId}
        className="overflow-hidden rounded-2xl border border-[color:var(--bc-border)] bg-black [&_video]:!h-auto [&_video]:!max-h-72 [&_video]:!w-full [&_img]:hidden"
      />
      {starting ? (
        <p className="text-center text-sm text-[color:var(--bc-muted)]">Opening camera…</p>
      ) : null}
      {cameraError ? <p className="text-sm text-[color:var(--bc-danger)]">{cameraError}</p> : null}
    </div>
  );
}

export function QrCameraToggle({
  open,
  onToggle,
  disabled,
}: {
  open: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <Button type="button" variant={open ? "ghost" : "secondary"} disabled={disabled} onClick={onToggle}>
      {open ? "Close camera" : "Scan with camera"}
    </Button>
  );
}
