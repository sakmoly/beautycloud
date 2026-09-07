"use client";

type Step = "services" | "slots" | "otp" | "confirm" | "payment" | "done";

const BASE_STEPS: { id: Step; label: string }[] = [
  { id: "services", label: "Services" },
  { id: "slots", label: "Time" },
  { id: "otp", label: "Verify" },
  { id: "confirm", label: "Confirm" },
  { id: "done", label: "Done" },
];

export function BookingStepper({
  current,
  requirePayment = false,
}: {
  current: Step;
  requirePayment?: boolean;
}) {
  const steps = requirePayment
    ? [
        ...BASE_STEPS.slice(0, 4),
        { id: "payment" as Step, label: "Pay" },
        BASE_STEPS[4],
      ]
    : BASE_STEPS;

  const currentIndex = steps.findIndex((s) => s.id === current);

  return (
    <ol className="flex items-center gap-0 overflow-x-auto pb-1">
      {steps.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;

        return (
          <li key={step.id} className="flex min-w-0 flex-1 items-center">
            <div className="flex min-w-0 flex-col items-center gap-1.5">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
                  active
                    ? "bg-[color:var(--bc-primary)] text-white shadow-md shadow-[color:var(--bc-primary)]/30"
                    : done
                      ? "bg-[color:var(--bc-primary)]/15 text-[color:var(--bc-primary)]"
                      : "bg-white text-[color:var(--bc-muted)] ring-1 ring-[color:var(--bc-border)]"
                }`}
              >
                {done ? "✓" : index + 1}
              </span>
              <span
                className={`hidden truncate text-xs font-medium sm:block ${
                  active ? "text-[color:var(--bc-text)]" : "text-[color:var(--bc-muted)]"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 ? (
              <div
                className={`mx-1 mb-5 h-0.5 flex-1 rounded-full sm:mx-2 ${
                  index < currentIndex
                    ? "bg-[color:var(--bc-primary)]/40"
                    : "bg-[color:var(--bc-border)]"
                }`}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
