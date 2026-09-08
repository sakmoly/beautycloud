"use client";

import type { ReactNode } from "react";

export type WizardStep = "services" | "visit" | "slots" | "otp" | "confirm" | "payment" | "done";

const DISPLAY_STEPS: { id: WizardStep; label: string }[] = [
  { id: "services", label: "Select services" },
  { id: "visit", label: "Visit details" },
  { id: "slots", label: "Pick a time" },
  { id: "otp", label: "Your details" },
];

function stepIndex(step: WizardStep): number {
  if (step === "services") return 0;
  if (step === "visit") return 1;
  if (step === "slots") return 2;
  if (step === "otp" || step === "confirm" || step === "payment" || step === "done") return 3;
  return 0;
}

export function getWizardProgress(step: WizardStep) {
  const index = stepIndex(step);
  const current = DISPLAY_STEPS[index] ?? DISPLAY_STEPS[0];
  return {
    current: index + 1,
    total: DISPLAY_STEPS.length,
    label: step === "done" ? "Confirmed" : current.label,
  };
}

export function BookingWizardHeader({
  step,
  onClose,
}: {
  step: WizardStep;
  onClose?: ReactNode;
}) {
  const progress = getWizardProgress(step);

  return (
    <header className="bc-wizard-header">
      <div className="mx-auto flex max-w-7xl items-start justify-between gap-4">
        <div>
          <p className="text-sm text-white/85">
            {progress.current} of {progress.total}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{progress.label}</h1>
        </div>
        {onClose}
      </div>
    </header>
  );
}

/** @deprecated Use BookingWizardHeader in wizard shell */
export function BookingStepper({
  current,
}: {
  current: WizardStep;
  requirePayment?: boolean;
}) {
  const progress = getWizardProgress(current);
  return (
    <p className="text-sm text-[color:var(--bc-muted)]">
      Step {progress.current} of {progress.total} · {progress.label}
    </p>
  );
}
