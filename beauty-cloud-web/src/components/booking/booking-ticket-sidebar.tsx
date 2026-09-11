"use client";

import Link from "next/link";

import type { BeautyBranch } from "@/lib/api/types";
import type { PublicCatalogService, VatBootstrapSettings } from "@/lib/frappe/types";
import { withBasePath } from "@/lib/base-path";
import { splitVatAmount } from "@/lib/vat";

function formatDuration(minutes?: number) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

export function BookingTicketSidebar({
  branch,
  branchLabel,
  branchAddress,
  branchImage,
  selectedServices,
  totalPrice,
  totalDuration,
  currency = "SAR",
  onRemoveService,
  onContinue,
  continueLabel = "Continue",
  continueDisabled = false,
  showContinue = false,
  vat,
}: {
  branch?: BeautyBranch | null;
  branchLabel?: string;
  branchAddress?: string;
  branchImage?: string | null;
  selectedServices: PublicCatalogService[];
  totalPrice: number;
  totalDuration: number;
  currency?: string;
  onRemoveService?: (name: string) => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  showContinue?: boolean;
  vat?: VatBootstrapSettings;
}) {
  const name = branch?.branch_name ?? branchLabel ?? "Your salon";
  const address = branch?.address ?? branchAddress ?? "";
  const vatEnabled = Boolean(vat?.enabled);
  const vatPercent = vat?.vat_percent ?? 15;
  const pricesIncludeVat = vat?.prices_include_vat !== false;
  const totals =
    selectedServices.length > 0 && vatEnabled
      ? splitVatAmount(totalPrice, vatPercent, pricesIncludeVat)
      : null;

  return (
    <aside className="bc-booking-ticket lg:sticky lg:top-0 lg:min-h-full lg:border-l lg:border-[color:var(--bc-border)]">
      <div className="bc-booking-ticket-header">
        <div className="flex gap-3">
          {branchImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branchImage}
              alt=""
              className="h-14 w-14 shrink-0 object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center bg-[color:var(--bc-accent-muted)] text-2xl">
              ✦
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold leading-snug">{name}</p>
            {address ? (
              <p className="mt-1 text-xs leading-relaxed text-[color:var(--bc-muted)]">{address}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="bc-booking-ticket-body">
        {selectedServices.length === 0 ? (
          <p className="py-6 text-center text-sm text-[color:var(--bc-muted)]">No services selected yet.</p>
        ) : (
          <ul className="space-y-3">
            {selectedServices.map((service) => (
              <li key={service.name} className="flex items-start justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium leading-snug">{service.service_name}</p>
                  {service.service_name_ar ? (
                    <p className="text-xs text-[color:var(--bc-muted)]">{service.service_name_ar}</p>
                  ) : null}
                  {service.default_duration ? (
                    <p className="mt-0.5 text-xs text-[color:var(--bc-muted)]">
                      {formatDuration(service.default_duration)}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-semibold">
                    {currency} {service.standard_selling_price ?? 0}
                  </span>
                  {onRemoveService ? (
                    <button
                      type="button"
                      onClick={() => onRemoveService(service.name)}
                      className="text-[color:var(--bc-muted)] hover:text-[color:var(--bc-danger)]"
                      aria-label={`Remove ${service.service_name}`}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="bc-booking-ticket-edge" aria-hidden />
      <div className="bc-booking-ticket-footer">
        {totals ? (
          <div className="bc-booking-ticket-vat space-y-1.5 text-sm">
            <div className="flex items-center justify-between gap-4 text-[color:var(--bc-muted)]">
              <span>Subtotal (excl. VAT)</span>
              <span>
                {currency} {totals.netAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-[color:var(--bc-muted)]">
              <span>VAT {vatPercent}%</span>
              <span>
                {currency} {totals.vatAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-[color:var(--bc-border)] pt-2">
              <span className="font-semibold">Total (incl. VAT)</span>
              <span className="text-lg font-bold">
                {currency} {totals.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold">
              {selectedServices.length === 0 ? "Free" : `${currency} ${totalPrice}`}
            </span>
          </div>
        )}
        {selectedServices.length > 0 && totalDuration > 0 ? (
          <p className="mt-1 text-xs text-[color:var(--bc-muted)]">
            Estimated duration · {formatDuration(totalDuration)}
            {vatEnabled && pricesIncludeVat ? " · Prices include VAT" : ""}
          </p>
        ) : null}
        {showContinue && onContinue ? (
          <button
            type="button"
            onClick={onContinue}
            disabled={continueDisabled}
            className="bc-btn-dark mt-4 w-full disabled:opacity-50"
          >
            {continueLabel}
          </button>
        ) : null}
      </div>
    </aside>
  );
}

export function WizardCloseButton() {
  return (
    <Link
      href={withBasePath("/")}
      className="flex h-8 w-8 items-center justify-center text-xl leading-none text-white/90 hover:text-white"
      aria-label="Close booking"
    >
      ×
    </Link>
  );
}
