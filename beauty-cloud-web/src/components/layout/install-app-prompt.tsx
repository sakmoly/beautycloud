"use client";

import { useEffect, useMemo, useState } from "react";

import { withBasePath } from "@/lib/base-path";
import {
  detectInstallBrowser,
  installGuideSteps,
  installGuideTitle,
  isMobileDevice,
  isStandaloneDisplay,
  type InstallBrowserKind,
} from "@/lib/install-app";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppGuide({
  open,
  onClose,
  browserKind,
}: {
  open: boolean;
  onClose: () => void;
  browserKind?: InstallBrowserKind;
}) {
  const kind = browserKind ?? detectInstallBrowser();
  const steps = useMemo(() => installGuideSteps(kind), [kind]);
  const [copied, setCopied] = useState(false);
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link and open it in Safari:", pageUrl);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={installGuideTitle(kind)} size="md">
      <div className="space-y-4">
        {kind === "ios-chrome" ? (
          <p className="rounded-xl border border-[color:var(--bc-warning)]/30 bg-[color:var(--bc-warning)]/10 px-4 py-3 text-sm leading-relaxed text-[color:var(--bc-text)]">
            You are in <strong>Chrome on iPhone</strong>. That is why you only see bookmark or favorite —
            not Add to Home Screen. Switch to <strong>Safari</strong> using the steps below.
          </p>
        ) : null}

        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[color:var(--bc-text)]">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        {kind === "ios-chrome" ? (
          <Button type="button" className="w-full" onClick={() => void copyLink()}>
            {copied ? "Link copied" : "Copy link for Safari"}
          </Button>
        ) : null}

        <p className="text-xs leading-relaxed text-[color:var(--bc-muted)]">
          Tip: <strong>Add to Home Screen</strong> is not the same as bookmark or favorite. It creates an
          app icon that opens full-screen.
        </p>
      </div>
    </Modal>
  );
}

export function InstallAppPrompt() {
  const [visible, setVisible] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [browserKind, setBrowserKind] = useState<InstallBrowserKind>("desktop");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay()) return;
    if (!isMobileDevice()) return;

    const dismissed = sessionStorage.getItem("bc-install-dismissed");
    if (dismissed === "1") return;

    setBrowserKind(detectInstallBrowser());
    setVisible(true);
  }, []);

  useEffect(() => {
    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(withBasePath("/sw.js")).catch(() => {
      /* non-fatal */
    });
  }, []);

  function dismiss() {
    sessionStorage.setItem("bc-install-dismissed", "1");
    setVisible(false);
  }

  async function installApp() {
    if (!installEvent) {
      setGuideOpen(true);
      return;
    }
    setInstalling(true);
    try {
      await installEvent.prompt();
      await installEvent.userChoice;
    } finally {
      setInstalling(false);
      setVisible(false);
    }
  }

  const showNativeInstall = browserKind === "android-chrome" && Boolean(installEvent);

  return (
    <>
      {visible ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] p-4 shadow-[0_-8px_30px_rgb(0_0_0/0.12)] sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-sm sm:rounded-2xl sm:border">
          <p className="text-sm font-semibold text-[color:var(--bc-text)]">Add Beauty Cloud to home screen</p>
          <p className="mt-1 text-sm leading-relaxed text-[color:var(--bc-muted)]">
            {browserKind === "ios-chrome"
              ? "Chrome on iPhone only saves bookmarks. Tap below for Safari steps."
              : "Create a home screen icon for quick access and camera QR scanning."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {showNativeInstall ? (
              <Button type="button" disabled={installing} onClick={() => void installApp()}>
                {installing ? "Installing…" : "Install app"}
              </Button>
            ) : (
              <Button type="button" onClick={() => setGuideOpen(true)}>
                Show me how
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
      ) : null}

      <InstallAppGuide open={guideOpen} onClose={() => setGuideOpen(false)} browserKind={browserKind} />
    </>
  );
}

export function InstallAppButton() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<InstallBrowserKind>("desktop");

  useEffect(() => {
    setKind(detectInstallBrowser());
  }, []);

  if (isStandaloneDisplay() || !isMobileDevice()) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--bc-border)] bg-white/80 px-3.5 py-2 text-sm font-medium text-[color:var(--bc-muted)] transition hover:border-[color:var(--bc-primary)]/30 hover:text-[color:var(--bc-text)]"
        title="Install Beauty Cloud on your phone home screen"
      >
        <span aria-hidden>📲</span>
        Phone app
      </button>
      <InstallAppGuide open={open} onClose={() => setOpen(false)} browserKind={kind} />
    </>
  );
}
