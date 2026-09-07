"use client";

import { useCallback, useEffect, useState } from "react";

import {
  callBeautyMethod,
  checkoutPosCart,
  getPosCatalogue,
  getPosServices,
  lookupPosBarcode,
  validatePosCart,
} from "@/lib/api/browser-client";
import type { BeautyService, PosCartItem, PosCatalogueItem } from "@/lib/api/types";
import { parseCheckInQr } from "@/lib/check-in-qr";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const WALKIN_ITEMS: PosCartItem[] = [
  {
    line_type: "Service",
    beauty_service: "SRV-MANICURE",
    service_name: "Manicure",
    qty: 1,
    rate: 90,
    employee: "HR-EMP-00002",
  },
];

const WALKIN_CUSTOMER = "Walk-In Guest";

interface LoadedAppointment {
  beauty_appointment?: string;
  customer?: string;
  customer_name?: string;
  beauty_branch?: string;
  payment_status?: string;
  total_amount?: number;
  status?: string;
  items?: PosCartItem[];
}

type AddTab = "services" | "products";

function lineLabel(line: PosCartItem) {
  return line.service_name ?? line.beauty_service ?? line.item_name ?? line.item ?? "Item";
}

export function PosCheckoutView() {
  const [branch, setBranch] = useState("BBY-MAIN");
  const [appointmentRef, setAppointmentRef] = useState("");
  const [customer, setCustomer] = useState(WALKIN_CUSTOMER);
  const [customerName, setCustomerName] = useState(WALKIN_CUSTOMER);
  const [items, setItems] = useState<PosCartItem[]>(WALKIN_ITEMS);
  const [linkedAppointment, setLinkedAppointment] = useState<string | undefined>();
  const [paymentStatus, setPaymentStatus] = useState<string | undefined>();
  const [validation, setValidation] = useState<Record<string, unknown> | null>(null);
  const [receipt, setReceipt] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addTab, setAddTab] = useState<AddTab>("services");
  const [services, setServices] = useState<BeautyService[]>([]);
  const [products, setProducts] = useState<PosCatalogueItem[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const [svc, cat] = await Promise.all([
        getPosServices(),
        getPosCatalogue({ beauty_branch: branch, search: catalogSearch || undefined }),
      ]);
      setServices(svc);
      setProducts(cat.items ?? []);
    } catch {
      setServices([]);
      setProducts([]);
    } finally {
      setCatalogLoading(false);
    }
  }, [branch, catalogSearch]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  function buildCartPayload() {
    return {
      customer: customer || undefined,
      beauty_branch: branch,
      beauty_appointment: linkedAppointment,
      items,
    };
  }

  function resetValidation() {
    setValidation(null);
    setReceipt(null);
  }

  function addService(service: BeautyService) {
    setItems((prev) => [
      ...prev,
      {
        line_type: "Service",
        beauty_service: service.name,
        service_name: service.service_name,
        qty: 1,
        rate: service.standard_selling_price ?? 0,
      },
    ]);
    resetValidation();
  }

  function addProduct(product: PosCatalogueItem) {
    setItems((prev) => [
      ...prev,
      {
        line_type: "Item",
        item: product.item_code,
        item_name: product.item_name,
        qty: 1,
        rate: product.rate ?? 0,
      },
    ]);
    resetValidation();
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
    resetValidation();
  }

  async function scanBarcode() {
    if (!barcode.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const hit = await lookupPosBarcode(barcode.trim(), branch);
      addProduct(hit);
      setBarcode("");
      setAddTab("products");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Barcode not found");
    } finally {
      setBusy(false);
    }
  }

  async function loadAppointment() {
    const raw = appointmentRef.trim();
    if (!raw) return;
    const parsed = parseCheckInQr(raw);
    const name = parsed?.appointment ?? raw;
    setBusy(true);
    setError(null);
    try {
      const appt = await callBeautyMethod<LoadedAppointment>({
        method: "beauty_cloud.api.pos.load_appointment",
        params: { name },
      });
      setBranch(appt.beauty_branch ?? branch);
      setCustomer(appt.customer ?? "");
      setCustomerName(appt.customer_name ?? "");
      setItems(appt.items?.length ? appt.items : WALKIN_ITEMS);
      setLinkedAppointment(appt.beauty_appointment);
      setPaymentStatus(appt.payment_status);
      resetValidation();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load appointment");
    } finally {
      setBusy(false);
    }
  }

  function useWalkInMode() {
    setAppointmentRef("");
    setLinkedAppointment(undefined);
    setPaymentStatus(undefined);
    setCustomer(WALKIN_CUSTOMER);
    setCustomerName(WALKIN_CUSTOMER);
    setItems(WALKIN_ITEMS);
    resetValidation();
    setError(null);
  }

  async function validate() {
    if (!customer) {
      setError("Customer is required for POS checkout. Load an appointment or enter a customer ID.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await validatePosCart(buildCartPayload());
      setValidation(result as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation failed");
    } finally {
      setBusy(false);
    }
  }

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const total =
        (validation?.grand_total as number) ??
        items.reduce((s, i) => s + (i.rate ?? 0) * (i.qty ?? 1), 0);
      const result = await checkoutPosCart({
        ...buildCartPayload(),
        payments: [{ mode_of_payment: "Cash", amount: total }],
      });
      setReceipt(result as Record<string, unknown>);
      if (linkedAppointment) {
        setPaymentStatus("Paid");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  const grandTotal =
    (validation?.grand_total as number) ??
    items.reduce((sum, line) => sum + (line.rate ?? 0) * (line.qty ?? 1), 0);

  const filteredServices = services.filter(
    (s) =>
      !catalogSearch ||
      s.service_name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      s.service_code.toLowerCase().includes(catalogSearch.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <Card title="When to use POS">
        <ul className="list-inside list-disc space-y-1 text-sm text-[color:var(--bc-muted)]">
          <li>
            <strong className="text-[color:var(--bc-text)]">Queue / Calendar → Collect payment</strong> —
            fastest for a booked service (cash only, links to appointment).
          </li>
          <li>
            <strong className="text-[color:var(--bc-text)]">POS</strong> — full checkout with invoice,
            services, retail products, barcode scan, or walk-in with no booking.
          </li>
        </ul>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="POS checkout">
          <div className="space-y-4">
            <div>
              <Label htmlFor="appointment">Appointment / scan QR (optional)</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  id="appointment"
                  placeholder="BAPT-2026-00003"
                  value={appointmentRef}
                  onChange={(e) => setAppointmentRef(e.target.value)}
                />
                <Button variant="secondary" onClick={loadAppointment} disabled={busy || !appointmentRef.trim()}>
                  Load
                </Button>
              </div>
            </div>

            <Button variant="ghost" onClick={useWalkInMode}>
              Walk-in (no booking)
            </Button>

            <div>
              <Label htmlFor="branch">Branch</Label>
              <Input id="branch" value={branch} onChange={(e) => setBranch(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="customer">Customer ID</Label>
              <Input id="customer" value={customer} onChange={(e) => setCustomer(e.target.value)} />
              {customerName ? (
                <p className="mt-1 text-sm text-[color:var(--bc-muted)]">{customerName}</p>
              ) : null}
            </div>

            {linkedAppointment ? (
              <div className="rounded-lg border border-[color:var(--bc-border)] bg-[color:var(--bc-surface)] p-3 text-sm">
                <p className="font-medium">{linkedAppointment}</p>
                <p className="text-[color:var(--bc-muted)]">
                  Payment:{" "}
                  <Badge tone={paymentStatus === "Paid" ? "success" : "warning"}>
                    {paymentStatus ?? "Unpaid"}
                  </Badge>
                </p>
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-sm font-medium">Cart</p>
              {items.length === 0 ? (
                <p className="text-sm text-[color:var(--bc-muted)]">
                  Cart is empty — add services or products from the panel on the right.
                </p>
              ) : (
                <ul className="space-y-2">
                  {items.map((line, i) => (
                    <li
                      key={`${line.beauty_service ?? line.item}-${i}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-[color:var(--bc-border)] px-3 py-2 text-sm"
                    >
                      <div>
                        <p>{lineLabel(line)}</p>
                        <p className="text-xs text-[color:var(--bc-muted)]">
                          {line.line_type} · qty {line.qty}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>SAR {(line.rate ?? 0) * (line.qty ?? 1)}</span>
                        <Button variant="ghost" onClick={() => removeItem(i)}>
                          Remove
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-right font-semibold">Total: SAR {grandTotal}</p>
            </div>

            {error ? <p className="text-sm text-[color:var(--bc-danger)]">{error}</p> : null}

            <div className="flex gap-2">
              <Button variant="secondary" onClick={validate} disabled={busy || items.length === 0}>
                Validate
              </Button>
              <Button onClick={checkout} disabled={busy || !validation}>
                Checkout (Cash)
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Add to cart">
            <div className="space-y-3">
              <div>
                <Label htmlFor="barcode">Scan barcode</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="barcode"
                    placeholder="Scan or type barcode, press Enter"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void scanBarcode();
                      }
                    }}
                  />
                  <Button variant="secondary" onClick={scanBarcode} disabled={busy || !barcode.trim()}>
                    Add
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Filter services or products"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant={addTab === "services" ? "primary" : "secondary"}
                  onClick={() => setAddTab("services")}
                >
                  Services
                </Button>
                <Button
                  variant={addTab === "products" ? "primary" : "secondary"}
                  onClick={() => setAddTab("products")}
                >
                  Products
                </Button>
              </div>

              {catalogLoading ? (
                <p className="text-sm text-[color:var(--bc-muted)]">Loading catalogue…</p>
              ) : addTab === "services" ? (
                <ul className="max-h-72 space-y-2 overflow-y-auto">
                  {filteredServices.length === 0 ? (
                    <li className="text-sm text-[color:var(--bc-muted)]">No services found.</li>
                  ) : (
                    filteredServices.map((service) => (
                      <li
                        key={service.name}
                        className="flex items-center justify-between rounded-lg border border-[color:var(--bc-border)] px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">{service.service_name}</p>
                          <p className="text-xs text-[color:var(--bc-muted)]">
                            {service.service_category ?? service.service_code}
                          </p>
                        </div>
                        <Button variant="secondary" onClick={() => addService(service)}>
                          SAR {service.standard_selling_price ?? 0}
                        </Button>
                      </li>
                    ))
                  )}
                </ul>
              ) : (
                <ul className="max-h-72 space-y-2 overflow-y-auto">
                  {products.length === 0 ? (
                    <li className="text-sm text-[color:var(--bc-muted)]">
                      No retail products in stock for this branch.
                    </li>
                  ) : (
                    products.map((product) => (
                      <li
                        key={product.item_code}
                        className="flex items-center justify-between rounded-lg border border-[color:var(--bc-border)] px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">{product.item_name}</p>
                          <p className="text-xs text-[color:var(--bc-muted)]">
                            {product.item_code}
                            {product.stock_qty != null ? ` · stock ${product.stock_qty}` : ""}
                          </p>
                        </div>
                        <Button variant="secondary" onClick={() => addProduct(product)}>
                          SAR {product.rate ?? 0}
                        </Button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </Card>

          <Card title="Result">
            {validation ? (
              <div className="mb-4 space-y-1 text-sm">
                <p>
                  <span className="text-[color:var(--bc-muted)]">Grand total:</span> SAR{" "}
                  {String(validation.grand_total ?? "—")}
                </p>
                <p>
                  <span className="text-[color:var(--bc-muted)]">Outstanding:</span> SAR{" "}
                  {String(validation.outstanding_amount ?? "—")}
                </p>
                {Array.isArray(validation.items) ? (
                  <ul className="mt-3 space-y-1 border-t border-[color:var(--bc-border)] pt-3">
                    {(validation.items as Array<Record<string, unknown>>).map((line, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{String(line.item_name ?? line.beauty_service ?? "Line")}</span>
                        <span>SAR {String(line.amount ?? "—")}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-[color:var(--bc-muted)]">Validate the cart to see line totals.</p>
            )}
            {receipt ? (
              <div className="rounded-lg bg-[color:var(--bc-success)]/10 p-4 text-sm">
                <p className="font-semibold text-[color:var(--bc-success)]">Payment successful</p>
                <p className="mt-1">Transaction: {String(receipt.name ?? "—")}</p>
                <p>Invoice: {String(receipt.invoice ?? "—")}</p>
                <p>Status: {String(receipt.status ?? "—")}</p>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
