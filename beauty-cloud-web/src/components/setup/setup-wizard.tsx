"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  SETUP_STEPS,
  type SetupStepId,
  type SetupStepStatus,
} from "@/components/setup/setup-stepper";
import {
  completeSetup,
  getSetupContext,
  getSetupStatus,
  saveSetupStep,
} from "@/lib/api/browser-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { SetupGuide } from "@/components/setup/setup-guide";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { withBasePath } from "@/lib/base-path";

export function SetupWizard({ frappeBaseUrl }: { frappeBaseUrl: string }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<SetupStepId>("company");
  const [steps, setSteps] = useState<SetupStepStatus[]>([]);
  const [ready, setReady] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [companies, setCompanies] = useState<Array<{ name: string; company_name: string }>>([]);
  const [branches, setBranches] = useState<Array<{ name: string; branch_code: string; branch_name: string }>>([]);

  const [company, setCompany] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [branchCode, setBranchCode] = useState("MAIN");
  const [branchName, setBranchName] = useState("Main Salon");
  const [branchPhone, setBranchPhone] = useState("");
  const [branchEmail, setBranchEmail] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [slotInterval, setSlotInterval] = useState("15");
  const [publicUrl, setPublicUrl] = useState("");
  const [tenantCode, setTenantCode] = useState("");

  const refresh = useCallback(async () => {
    setError(null);
    const [status, context] = await Promise.all([getSetupStatus(), getSetupContext()]);
    setSteps(status.steps as SetupStepStatus[]);
    setReady(Boolean(status.ready));
    setSetupComplete(Boolean(status.setup_complete));
    setCompanies(context.companies ?? []);
    setBranches(context.branches ?? []);
    if (context.settings?.company) setCompany(context.settings.company);
    if (status.company) setCompany(status.company);
  }, []);

  useEffect(() => {
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load setup"))
      .finally(() => setLoading(false));
  }, [refresh]);

  const stepIndex = useMemo(() => SETUP_STEPS.findIndex((row) => row.id === step), [step]);
  const currentStatus = steps.find((row) => row.id === step);

  async function runStep(action: () => Promise<unknown>, next?: SetupStepId) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh();
      if (next) setStep(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Step failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <LoadingState title="Loading setup wizard" description="Checking salon readiness" />;
  }

  function startAddBranch() {
    setBranchCode("");
    setBranchName("");
    setBranchPhone("");
    setBranchEmail("");
    setBranchAddress("");
    setStep("branch");
  }

  return (
    <>
      <SetupGuide
        setupComplete={setupComplete}
        frappeBaseUrl={frappeBaseUrl}
        branchCount={branches.length}
        onAddBranch={startAddBranch}
      />

    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--bc-muted)]">
          Setup steps
        </p>
        {SETUP_STEPS.map((row, index) => {
          const status = steps.find((item) => item.id === row.id);
          const active = row.id === step;
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => setStep(row.id)}
              className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                active
                  ? "border-[color:var(--bc-primary)] bg-[color:var(--bc-accent-soft)]"
                  : "border-[color:var(--bc-border)] bg-white hover:bg-[color:var(--bc-accent-muted)]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {index + 1}. {row.label}
                  {row.optional ? " (optional)" : ""}
                </span>
                <span aria-hidden>{status?.status === "complete" ? "✓" : "○"}</span>
              </div>
              {status?.message ? (
                <p className="mt-1 text-xs text-[color:var(--bc-muted)]">{status.message}</p>
              ) : null}
            </button>
          );
        })}
      </aside>

      <div>
        <Card
          title={`${stepIndex + 1}. ${SETUP_STEPS[stepIndex]?.label ?? "Setup"}`}
          description={currentStatus?.message}
          elevated
        >
          {error ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          {step === "company" ? (
            <div className="space-y-4">
              <p className="text-sm text-[color:var(--bc-muted)]">
                Link this Beauty Cloud site to your ERPNext company.
              </p>
              <div>
                <Label htmlFor="setup-company">Company</Label>
                <select
                  id="setup-company"
                  className="mt-1.5 min-h-11 w-full border border-[color:var(--bc-border)] bg-white px-3.5 text-sm"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                >
                  <option value="">Select company…</option>
                  {companies.map((row) => (
                    <option key={row.name} value={row.name}>
                      {row.company_name || row.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button disabled={busy || !company} onClick={() => void runStep(() => saveSetupStep("company", { company }), "branding")}>
                Save & continue
              </Button>
            </div>
          ) : null}

          {step === "branding" ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="setup-display-name">Salon display name</Label>
                <Input id="setup-display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Lumière Beauty Lounge" />
              </div>
              <div>
                <Label htmlFor="setup-support-email">Support email</Label>
                <Input id="setup-support-email" type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="hello@yoursalon.com" />
              </div>
              <Button
                disabled={busy || !displayName.trim()}
                onClick={() =>
                  void runStep(
                    () =>
                      saveSetupStep("branding", {
                        company_display_name: displayName.trim(),
                        application_title: displayName.trim(),
                        support_email: supportEmail.trim(),
                      }),
                    "branch",
                  )
                }
              >
                Save & continue
              </Button>
            </div>
          ) : null}

          {step === "branch" ? (
            <div className="space-y-4">
              {setupComplete ? (
                <p className="rounded-lg border border-[color:var(--bc-border)] bg-[color:var(--bc-accent-muted)]/40 px-4 py-3 text-sm text-[color:var(--bc-muted)]">
                  Adding a <strong>new branch</strong> under the same company. Use a unique branch code
                  (e.g. <code className="rounded bg-white px-1">JEDDAH</code>,{" "}
                  <code className="rounded bg-white px-1">MALL</code>). Then set opening hours in step 4
                  for that branch in Desk.
                </p>
              ) : (
                <p className="text-sm text-[color:var(--bc-muted)]">
                  Create your first salon location. You can add more branches later from this same wizard.
                </p>
              )}
              {branches.length > 0 ? (
                <div className="rounded-lg border border-[color:var(--bc-border)] px-4 py-3 text-sm">
                  <p className="font-medium">Existing branches on this site</p>
                  <ul className="mt-2 space-y-1 text-[color:var(--bc-muted)]">
                    {branches.map((row) => (
                      <li key={row.name}>
                        {row.branch_name} ({row.branch_code})
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="setup-branch-code">Branch code</Label>
                  <Input id="setup-branch-code" value={branchCode} onChange={(e) => setBranchCode(e.target.value.toUpperCase())} />
                </div>
                <div>
                  <Label htmlFor="setup-branch-name">Branch name</Label>
                  <Input id="setup-branch-name" value={branchName} onChange={(e) => setBranchName(e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="setup-branch-phone">Phone</Label>
                <Input id="setup-branch-phone" value={branchPhone} onChange={(e) => setBranchPhone(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="setup-branch-email">Email</Label>
                <Input id="setup-branch-email" value={branchEmail} onChange={(e) => setBranchEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="setup-branch-address">Address</Label>
                <Input id="setup-branch-address" value={branchAddress} onChange={(e) => setBranchAddress(e.target.value)} />
              </div>
              <Button
                disabled={busy || !branchCode.trim() || !branchName.trim()}
                onClick={() =>
                  void runStep(
                    () =>
                      saveSetupStep("branch", {
                        branch_code: branchCode.trim(),
                        branch_name: branchName.trim(),
                        phone: branchPhone.trim(),
                        email: branchEmail.trim(),
                        address: branchAddress.trim(),
                      }),
                    "schedule",
                  )
                }
              >
                Save & continue
              </Button>
            </div>
          ) : null}

          {step === "schedule" ? (
            <div className="space-y-4">
              <p className="text-sm text-[color:var(--bc-muted)]">
                Default hours: Mon–Sat 09:00–21:00, Sunday closed. Edit later in Desk if needed.
              </p>
              <div>
                <Label htmlFor="setup-slot-interval">Slot interval (minutes)</Label>
                <Input id="setup-slot-interval" type="number" min={5} max={60} value={slotInterval} onChange={(e) => setSlotInterval(e.target.value)} />
              </div>
              <Button
                disabled={busy}
                onClick={() =>
                  void runStep(
                    () =>
                      saveSetupStep("schedule", {
                        beauty_branch: branches[0]?.name,
                        slot_interval_minutes: Number(slotInterval) || 15,
                      }),
                    "services",
                  )
                }
              >
                Save default hours
              </Button>
            </div>
          ) : null}

          {step === "services" ? (
            <div className="space-y-4">
              <p className="text-sm text-[color:var(--bc-muted)]">
                Load a starter catalog (hair, skin, nails) or add services later in ERPNext Desk.
              </p>
              <Button disabled={busy} onClick={() => void runStep(() => saveSetupStep("services", { load_sample: 1 }), "team")}>
                Load sample service catalog
              </Button>
            </div>
          ) : null}

          {step === "team" ? (
            <div className="space-y-4">
              <p className="text-sm text-[color:var(--bc-muted)]">
                Load sample beauticians with skills and weekly schedules. HR shifts auto-sync when saved.
              </p>
              <Button disabled={busy} onClick={() => void runStep(() => saveSetupStep("team", { load_sample: 1 }), "payments")}>
                Load sample team
              </Button>
            </div>
          ) : null}

          {step === "payments" ? (
            <div className="space-y-4">
              <p className="text-sm text-[color:var(--bc-muted)]">
                Enables demo Telr payments, salon payment-before-service, and HR schedule integration.
              </p>
              <Button
                disabled={busy}
                onClick={() =>
                  void runStep(
                    () =>
                      saveSetupStep("payments", {
                        require_payment_at_booking: 1,
                        require_payment_before_service: 1,
                        require_payment_at_kiosk: 1,
                        enable_telr: 1,
                        telr_demo_mode: 1,
                        enable_hr_schedule: 1,
                        auto_sync_hr_shifts: 1,
                      }),
                    "tenant",
                  )
                }
              >
                Apply recommended payment settings
              </Button>
            </div>
          ) : null}

          {step === "tenant" ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-[color:var(--bc-border)] bg-[color:var(--bc-accent-muted)]/40 px-4 py-3 text-sm text-[color:var(--bc-muted)]">
                <p className="font-medium text-[color:var(--bc-text)]">One URL for the whole salon — branches are internal</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    <strong>Online booking</strong> — same site URL; the customer picks the branch in the
                    booking flow.
                  </li>
                  <li>
                    <strong>Reception / staff</strong> — staff select the branch when booking or viewing
                    the calendar.
                  </li>
                  <li>
                    <strong>Kiosk</strong> — each kiosk device is tied to one branch (no customer branch
                    picker).
                  </li>
                </ul>
                <p className="mt-2">
                  This step registers the site once for payment redirects — not per branch. New branches do
                  not need a new URL.
                </p>
              </div>
              {currentStatus?.status === "complete" ? (
                <p className="text-sm text-[color:var(--bc-muted)]">
                  Already registered: <strong>{currentStatus.message}</strong>. You can skip this step when
                  adding branches.
                </p>
              ) : null}
              <div>
                <Label htmlFor="setup-tenant-code">Tenant code (site-wide, optional)</Label>
                <Input id="setup-tenant-code" value={tenantCode} onChange={(e) => setTenantCode(e.target.value)} placeholder="bahyea-beauty" />
              </div>
              <div>
                <Label htmlFor="setup-public-url">Public URL (site-wide)</Label>
                <Input id="setup-public-url" value={publicUrl} onChange={(e) => setPublicUrl(e.target.value)} placeholder="http://printechsdammam.dyndns.org:86" />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void runStep(async () => saveSetupStep("tenant", {}), "review")}
                >
                  {currentStatus?.status === "complete" ? "Continue" : "Skip for now"}
                </Button>
                {currentStatus?.status !== "complete" ? (
                  <Button
                    disabled={busy || !tenantCode.trim()}
                    onClick={() =>
                      void runStep(
                        () =>
                          saveSetupStep("tenant", {
                            tenant_code: tenantCode.trim(),
                            tenant_name: displayName || branchName,
                            public_url: publicUrl.trim(),
                          }),
                        "review",
                      )
                    }
                  >
                    Save site URL
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {step === "review" ? (
            <div className="space-y-4">
              {setupComplete ? (
                <p className="text-sm text-[color:var(--bc-muted)]">
                  Setup was finished on this site. Use the checklist on the left to review or update any
                  step. To add another location, go to step 3 (Branch) with a new branch code.
                </p>
              ) : !ready ? (
                <ErrorState
                  title="Not ready yet"
                  description="Complete the required steps on the left before going live."
                />
              ) : (
                <p className="text-sm text-[color:var(--bc-muted)]">
                  All required checks passed. Mark setup complete to unlock the full staff workspace.
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                {!setupComplete ? (
                  <Button disabled={busy || !ready} onClick={() => void runStep(() => completeSetup())}>
                    Finish setup
                  </Button>
                ) : null}
                <Link
                  href={withBasePath("/book")}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[color:var(--bc-border)] bg-white px-6 text-sm font-semibold text-[color:var(--bc-text)] shadow-sm"
                >
                  Test online booking
                </Link>
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3 border-t border-[color:var(--bc-border)] pt-4">
            <Button
              variant="ghost"
              disabled={stepIndex <= 0 || busy}
              onClick={() => setStep(SETUP_STEPS[Math.max(0, stepIndex - 1)].id)}
            >
              ← Previous
            </Button>
            <Button
              variant="ghost"
              disabled={stepIndex >= SETUP_STEPS.length - 1 || busy}
              onClick={() => setStep(SETUP_STEPS[Math.min(SETUP_STEPS.length - 1, stepIndex + 1)].id)}
            >
              Next →
            </Button>
          </div>
        </Card>
      </div>
    </div>
    </>
  );
}
