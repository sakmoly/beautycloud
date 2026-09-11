"use client";

export type SetupStepId =
  | "company"
  | "branding"
  | "branch"
  | "schedule"
  | "services"
  | "team"
  | "payments"
  | "tenant"
  | "review";

export const SETUP_STEPS: { id: SetupStepId; label: string; optional?: boolean }[] = [
  { id: "company", label: "Company" },
  { id: "branding", label: "Branding" },
  { id: "branch", label: "Branch" },
  { id: "schedule", label: "Opening hours" },
  { id: "services", label: "Services" },
  { id: "team", label: "Team" },
  { id: "payments", label: "Payments & HR" },
  { id: "tenant", label: "Site URL", optional: true },
  { id: "review", label: "Go live" },
];

export interface SetupStepStatus {
  id: SetupStepId;
  label: string;
  status: "complete" | "pending";
  message: string;
  optional?: boolean;
}
