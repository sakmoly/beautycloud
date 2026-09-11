"use client";

import { useEffect, useState, type ReactNode } from "react";

import { callBeautyMethod } from "@/lib/api/browser-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/states";
import { DESK_PATHS, deskUrl, frappeAssetUrl } from "@/lib/desk-links";
import type { PublicBootstrap, TenantContext } from "@/lib/frappe/types";

const FEATURE_LABELS: Record<string, string> = {
  online_booking: "Online booking",
  reception: "Reception",
  beautician_tablet: "Beautician tablet",
  inventory_custody: "Inventory custody",
  pos: "Point of sale",
  commission: "Commission",
  loyalty: "Loyalty",
  kiosk: "Kiosk",
  multi_branch: "Multi branch",
  management_reports: "Management reports",
};

const THEME_COLORS: Array<{ key: string; label: string; cssVar: string }> = [
  { key: "primary", label: "Primary", cssVar: "--bc-primary" },
  { key: "secondary", label: "Secondary", cssVar: "--bc-secondary" },
  { key: "accent", label: "Accent", cssVar: "--bc-accent" },
  { key: "background", label: "Background", cssVar: "--bc-background" },
  { key: "surface", label: "Surface", cssVar: "--bc-surface" },
  { key: "text", label: "Text", cssVar: "--bc-text" },
  { key: "muted", label: "Muted", cssVar: "--bc-muted" },
  { key: "success", label: "Success", cssVar: "--bc-success" },
  { key: "warning", label: "Warning", cssVar: "--bc-warning" },
  { key: "danger", label: "Danger", cssVar: "--bc-danger" },
];

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatMoney(amount?: number | null, currency = "SAR"): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
}

function statusTone(status?: string): "success" | "warning" | "danger" | "default" | "muted" {
  const s = (status ?? "").toLowerCase();
  if (s === "active") return "success";
  if (s === "suspended") return "warning";
  if (s === "cancelled" || s === "canceled") return "danger";
  return "default";
}

function InfoRow({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[color:var(--bc-border)] py-2.5 text-sm last:border-0">
      <dt className="shrink-0 text-[color:var(--bc-muted)]">{label}</dt>
      <dd className="text-right font-medium">{value ?? "—"}</dd>
    </div>
  );
}

function ColorSwatch({ label, color }: { label: string; color?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[color:var(--bc-border)] bg-white p-2.5">
      <span
        className="h-9 w-9 shrink-0 rounded-lg border border-black/10 shadow-inner"
        style={{ backgroundColor: color ?? "#e5e7eb" }}
      />
      <div className="min-w-0">
        <p className="text-xs font-medium text-[color:var(--bc-text)]">{label}</p>
        <p className="truncate font-mono text-[10px] text-[color:var(--bc-muted)]">
          {color ?? "Not set"}
        </p>
      </div>
    </div>
  );
}

function FeaturePill({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        enabled
          ? "bg-[color:var(--bc-success)]/10 text-[color:var(--bc-success)]"
          : "bg-[color:var(--bc-muted)]/10 text-[color:var(--bc-muted)]"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-[color:var(--bc-success)]" : "bg-[color:var(--bc-muted)]"}`} />
      {label}
    </span>
  );
}

function DeskLink({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-xl border border-[color:var(--bc-border)] bg-white p-4 transition hover:border-[color:var(--bc-primary)]/40 hover:shadow-sm"
    >
      <span className="font-medium text-[color:var(--bc-text)] group-hover:text-[color:var(--bc-primary)]">
        {label}
      </span>
      <span className="mt-1 text-sm text-[color:var(--bc-muted)]">{description}</span>
    </a>
  );
}

export function AdminBrandingView({
  bootstrap: initialBootstrap,
  frappeBaseUrl,
}: {
  bootstrap: PublicBootstrap;
  frappeBaseUrl: string;
}) {
  const [tenantContext, setTenantContext] = useState<TenantContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    callBeautyMethod<TenantContext>({ method: "beauty_cloud.api.tenant.current" })
      .then(setTenantContext)
      .finally(() => setLoading(false));
  }, []);

  const branding = initialBootstrap.branding;
  const cssVars = branding?.css_variables ?? {};
  const tenant = tenantContext?.tenant;
  const plan = tenantContext?.plan;
  const features = tenantContext?.features ?? {};
  const limits = tenantContext?.limits ?? {};
  const status = tenantContext?.status ?? tenant?.status ?? "Active";
  const logoUrl = frappeAssetUrl(frappeBaseUrl, branding?.logo_light);

  if (loading) {
    return <LoadingState title="Loading admin dashboard" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--bc-radius)] border border-[color:var(--bc-border)] bg-white p-5">
        <div>
          <p className="text-sm text-[color:var(--bc-muted)]">Site overview</p>
          <p className="mt-1 text-lg font-semibold">
            {initialBootstrap.company_display_name ?? initialBootstrap.company}
          </p>
          <p className="mt-1 text-sm text-[color:var(--bc-muted)]">
            {tenant?.tenant_name ?? "Standalone site"} · {tenant?.site_name ?? "site.beautycloud"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={statusTone(status)}>{status}</Badge>
          <a href={deskUrl(frappeBaseUrl, DESK_PATHS.workspace)} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary">Open ERPNext Desk</Button>
          </a>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Branding" description="Active theme applied to booking and staff apps">
          <div className="mb-4 flex items-center gap-4">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Logo"
                className="h-14 w-auto max-w-[140px] rounded-lg border border-[color:var(--bc-border)] bg-white object-contain p-2"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[color:var(--bc-primary)]/10 text-lg font-bold text-[color:var(--bc-primary)]">
                {(initialBootstrap.application_title ?? "BC").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold">{initialBootstrap.application_title}</p>
              <p className="text-sm text-[color:var(--bc-muted)]">
                Theme: {branding?.theme_mode ?? "Light"}
              </p>
            </div>
          </div>

          <dl>
            <InfoRow label="Display name" value={initialBootstrap.company_display_name} />
            <InfoRow label="Support email" value={branding?.support_email} />
            <InfoRow label="Support phone" value={branding?.support_phone} />
            <InfoRow
              label="Footer"
              value={
                branding?.custom_footer_text ? (
                  <span className="max-w-[220px] truncate">{branding.custom_footer_text}</span>
                ) : (
                  "—"
                )
              }
            />
          </dl>

          <div className="mt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--bc-muted)]">
              Theme colors
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {THEME_COLORS.map(({ label, cssVar }) => (
                <ColorSwatch key={cssVar} label={label} color={cssVars[cssVar]} />
              ))}
            </div>
            {cssVars["--bc-radius"] ? (
              <p className="mt-3 text-xs text-[color:var(--bc-muted)]">
                Corner radius: <span className="font-mono">{cssVars["--bc-radius"]}</span>
              </p>
            ) : null}
          </div>

          <div className="mt-5">
            <a
              href={deskUrl(frappeBaseUrl, DESK_PATHS.branding)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary">Edit branding in Desk</Button>
            </a>
          </div>
        </Card>

        <Card title="Tenant & subscription" description="SaaS tenant registered for this site">
          {tenant ? (
            <dl>
              <InfoRow label="Tenant code" value={tenant.tenant_code} />
              <InfoRow label="Tenant name" value={tenant.tenant_name} />
              <InfoRow label="Status" value={<Badge tone={statusTone(tenant.status)}>{tenant.status}</Badge>} />
              <InfoRow label="Site" value={tenant.site_name} />
              <InfoRow
                label="Public URL"
                value={
                  tenant.public_url ? (
                    <a
                      href={tenant.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[color:var(--bc-primary)] hover:underline"
                    >
                      {tenant.public_url}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <InfoRow label="Subscription start" value={formatDate(tenant.subscription_start)} />
              <InfoRow label="Subscription end" value={formatDate(tenant.subscription_end)} />
            </dl>
          ) : (
            <div className="rounded-xl border border-dashed border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] p-4 text-sm text-[color:var(--bc-muted)]">
              No tenant record is linked to this site. All plan features are enabled locally for
              development. Register a tenant in Desk to manage subscriptions.
            </div>
          )}

          <div className="mt-5">
            <a
              href={deskUrl(frappeBaseUrl, DESK_PATHS.tenants)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary">Manage tenants</Button>
            </a>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Current plan" description="Features and limits for this site">
          {plan ? (
            <>
              <p className="text-2xl font-semibold">{plan.plan_name}</p>
              <p className="mt-1 text-sm text-[color:var(--bc-muted)]">{plan.plan_code}</p>
              <p className="mt-3 text-lg font-medium text-[color:var(--bc-primary)]">
                {formatMoney(plan.monthly_price, plan.currency ?? "SAR")}
                <span className="text-sm font-normal text-[color:var(--bc-muted)]"> / month</span>
              </p>
              <dl className="mt-4">
                <InfoRow label="Max branches" value={limits.max_branches || "Unlimited"} />
                <InfoRow label="Max employees" value={limits.max_employees || "Unlimited"} />
                <InfoRow label="Max kiosk devices" value={limits.max_kiosk_devices || "Unlimited"} />
              </dl>
            </>
          ) : (
            <p className="text-sm text-[color:var(--bc-muted)]">
              No subscription plan assigned. Using full feature set for local development.
            </p>
          )}
          <div className="mt-5">
            <a href={deskUrl(frappeBaseUrl, DESK_PATHS.plans)} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">View plans</Button>
            </a>
          </div>
        </Card>

        <Card
          title="Booking & payments"
          description="Customer booking rules from Beauty Cloud Settings"
          className="lg:col-span-2"
        >
          <dl>
            <InfoRow
              label="Payment at booking"
              value={
                initialBootstrap.booking_payment?.require_payment_at_booking ? (
                  <Badge tone="warning">Required</Badge>
                ) : (
                  <Badge tone="muted">Optional</Badge>
                )
              }
            />
            <InfoRow
              label="Payment type"
              value={initialBootstrap.booking_payment?.booking_payment_type ?? "—"}
            />
            <InfoRow
              label="Deposit"
              value={
                initialBootstrap.booking_payment?.booking_deposit_percent != null
                  ? `${initialBootstrap.booking_payment.booking_deposit_percent}%`
                  : "—"
              }
            />
            <InfoRow
              label="Telr gateway"
              value={
                initialBootstrap.booking_payment?.enable_telr ? (
                  <Badge tone={initialBootstrap.booking_payment.telr_demo_mode ? "warning" : "success"}>
                    {initialBootstrap.booking_payment.telr_demo_mode ? "Demo mode" : "Live"}
                  </Badge>
                ) : (
                  <Badge tone="muted">Disabled</Badge>
                )
              }
            />
            <InfoRow label="SMS / OTP" value={initialBootstrap.sms_enabled ? "Enabled" : "Disabled"} />
            <InfoRow
              label="Payment before service"
              value={
                initialBootstrap.salon_payment?.require_payment_before_service ? (
                  <Badge tone="warning">Required</Badge>
                ) : (
                  <Badge tone="muted">Optional</Badge>
                )
              }
            />
            <InfoRow
              label="Payment at kiosk"
              value={
                initialBootstrap.salon_payment?.require_payment_at_kiosk ? (
                  <Badge tone="warning">Required</Badge>
                ) : (
                  <Badge tone="muted">Reception collects</Badge>
                )
              }
            />
            <InfoRow
              label="Slot interval"
              value={
                initialBootstrap.default_slot_interval_minutes
                  ? `${initialBootstrap.default_slot_interval_minutes} min`
                  : "—"
              }
            />
            <InfoRow
              label="Unpaid draft auto-cancel"
              value={
                initialBootstrap.unpaid_draft_hold?.auto_cancel_unpaid_draft_bookings ? (
                  <Badge tone="warning">
                    After {initialBootstrap.unpaid_draft_hold.unpaid_draft_hold_minutes ?? 15} min
                  </Badge>
                ) : (
                  <Badge tone="muted">Manual cleanup</Badge>
                )
              }
            />
          </dl>
          <div className="mt-5">
            <a href={deskUrl(frappeBaseUrl, DESK_PATHS.settings)} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">Open Beauty Cloud Settings</Button>
            </a>
          </div>
        </Card>
      </div>

      <Card title="Plan features" description="Modules enabled for this tenant">
        <div className="flex flex-wrap gap-2">
          {Object.entries(FEATURE_LABELS).map(([key, label]) => (
            <FeaturePill key={key} label={label} enabled={Boolean(features[key] ?? !tenant)} />
          ))}
        </div>
        {tenant && Object.keys(features).length === 0 ? (
          <p className="mt-3 text-sm text-[color:var(--bc-muted)]">No feature flags returned from plan.</p>
        ) : null}
      </Card>

      <Card title="Quick links" description="Open common admin records in ERPNext Desk">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DeskLink
            href={deskUrl(frappeBaseUrl, DESK_PATHS.workspace)}
            label="Beauty Cloud workspace"
            description="All doctypes and shortcuts"
          />
          <DeskLink
            href={deskUrl(frappeBaseUrl, DESK_PATHS.settings)}
            label="Beauty Cloud Settings"
            description="Booking, OTP, payments, SMS"
          />
          <DeskLink
            href={deskUrl(frappeBaseUrl, DESK_PATHS.branding)}
            label="Branding settings"
            description="Logos, colors, theme tokens"
          />
          <DeskLink
            href={deskUrl(frappeBaseUrl, DESK_PATHS.branches)}
            label="Branches"
            description="Salon locations and warehouses"
          />
          <DeskLink
            href={deskUrl(frappeBaseUrl, DESK_PATHS.services)}
            label="Services"
            description="Treatments, pricing, duration"
          />
          <DeskLink
            href={deskUrl(frappeBaseUrl, DESK_PATHS.plans)}
            label="Subscription plans"
            description="Features and limits per plan"
          />
        </div>
      </Card>
    </div>
  );
}
