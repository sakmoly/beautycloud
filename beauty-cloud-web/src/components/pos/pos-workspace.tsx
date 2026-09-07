"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import "./pos.css";

import {
  checkoutPosCart,
  getBranches,
  getPosCatalogue,
  getPosOrders,
  getPosSessionContext,
  getPosPaymentMethods,
  getPosProductGroups,
  getPosServiceCategories,
  loadPosAppointment,
  lookupPosBarcode,
  searchPosCustomers,
} from "@/lib/api/browser-client";
import type {
  BeautyBranch,
  BeautyService,
  PosCartItem,
  PosCatalogueItem,
  PosCustomerHit,
  PosOrderRow,
  PosServiceCategory,
} from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/states";
import {
  categoryIcon,
  customerInitials,
  formatTime,
  lineLabel,
  paymentTone,
  productIcon,
  serviceIcon,
} from "@/components/pos/pos-utils";
import { printPosReceipt } from "@/components/pos/pos-receipt-print";
import { loadStoredRegister } from "@/components/pos/pos-register-store";
import type { PosSessionContext } from "@/components/pos/pos-session-types";
import { evaluatePosCheckoutReady } from "@/components/pos/pos-session-utils";
import { PosFulfillmentScreen } from "@/components/pos/pos-fulfillment-screen";
import { PosSessionScreen } from "@/components/pos/pos-session-screen";
import { PosSessionStatus } from "@/components/pos/pos-session-status";

const WALKIN_CUSTOMER = "Walk-In Guest";

type WorkspaceTab = "orders" | "pickup" | "session";
type Screen = "list" | "order";
type CatalogueTab = "services" | "products";
type OrderFilter = "all" | "unpaid" | "waiting";

function PosTopTabs({
  active,
  onChange,
}: {
  active: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
}) {
  return (
    <div className="pos-top-tabs">
      <button
        type="button"
        className={`pos-top-tab ${active === "orders" ? "active" : ""}`}
        onClick={() => onChange("orders")}
      >
        Orders
      </button>
      <button
        type="button"
        className={`pos-top-tab ${active === "pickup" ? "active" : ""}`}
        onClick={() => onChange("pickup")}
      >
        Retail pickup
      </button>
      <button
        type="button"
        className={`pos-top-tab ${active === "session" ? "active" : ""}`}
        onClick={() => onChange("session")}
      >
        Register &amp; Day
      </button>
    </div>
  );
}

const EMPTY_CART: PosCartItem[] = [];

export function PosWorkspace() {
  const searchParams = useSearchParams();
  const initialAppointment = searchParams.get("appointment");
  const initialAppointmentOpened = useRef(false);

  const [screen, setScreen] = useState<Screen>("list");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [branches, setBranches] = useState<BeautyBranch[]>([]);
  const [branch, setBranch] = useState("BBY-MAIN");
  const [orders, setOrders] = useState<PosOrderRow[]>([]);
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [listSearch, setListSearch] = useState("");

  const [items, setItems] = useState<PosCartItem[]>(EMPTY_CART);
  const [customer, setCustomer] = useState(WALKIN_CUSTOMER);
  const [customerName, setCustomerName] = useState(WALKIN_CUSTOMER);
  const [linkedAppointment, setLinkedAppointment] = useState<string>();
  const [paymentStatus, setPaymentStatus] = useState<string>();

  const [catalogueTab, setCatalogueTab] = useState<CatalogueTab>("services");
  const [serviceCategories, setServiceCategories] = useState<PosServiceCategory[]>([]);
  const [productGroups, setProductGroups] = useState<Array<{ name: string; item_count: number }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProductGroup, setSelectedProductGroup] = useState<string | null>(null);
  const [products, setProducts] = useState<PosCatalogueItem[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [barcode, setBarcode] = useState("");

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerHits, setCustomerHits] = useState<PosCustomerHit[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(["Cash"]);
  const [selectedPayment, setSelectedPayment] = useState("Cash");

  const [receipt, setReceipt] = useState<Record<string, unknown> | null>(null);
  const [posReady, setPosReady] = useState(false);
  const [posBlockReason, setPosBlockReason] = useState<string | null>(
    "Checking register session…",
  );
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("orders");

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const loadOrders = useCallback(async () => {
    const rows = await getPosOrders(branch, today);
    setOrders(rows);
  }, [branch, today]);

  const loadCatalogue = useCallback(async () => {
    const [svcCat, prodGroups, payModes] = await Promise.all([
      getPosServiceCategories(),
      getPosProductGroups(branch),
      getPosPaymentMethods().catch(() => ["Cash"]),
    ]);
    setServiceCategories(svcCat.categories ?? []);
    setProductGroups(prodGroups ?? []);
    const modes = payModes?.length ? payModes : ["Cash"];
    setPaymentMethods(modes);
    if (!modes.includes(selectedPayment)) setSelectedPayment(modes[0]);
    if (!selectedCategory && svcCat.categories?.[0]) setSelectedCategory(svcCat.categories[0].name);
    if (!selectedProductGroup && prodGroups?.[0]) setSelectedProductGroup(prodGroups[0].name);
  }, [branch, selectedCategory, selectedProductGroup, selectedPayment]);

  const loadProducts = useCallback(async () => {
    const cat = await getPosCatalogue({
      beauty_branch: branch,
      search: catalogSearch || undefined,
      item_group: selectedProductGroup || undefined,
    });
    setProducts(cat.items ?? []);
  }, [branch, catalogSearch, selectedProductGroup]);

  useEffect(() => {
    getBranches()
      .then((b) => {
        setBranches(b);
        if (b[0]?.name) setBranch(b[0].name);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (screen === "list") void loadOrders().catch(() => setOrders([]));
  }, [screen, loadOrders]);

  useEffect(() => {
    if (screen === "order") void loadCatalogue().catch(() => {});
  }, [screen, loadCatalogue]);

  useEffect(() => {
    if (screen === "order" && catalogueTab === "products") {
      void loadProducts().catch(() => setProducts([]));
    }
  }, [screen, catalogueTab, loadProducts]);

  useEffect(() => {
    if (loading || initialAppointmentOpened.current || !initialAppointment) return;
    initialAppointmentOpened.current = true;
    void openAppointmentByName(initialAppointment);
  }, [loading, initialAppointment]);

  useEffect(() => {
    if (customerQuery.trim().length < 2) {
      setCustomerHits([]);
      return;
    }
    const t = setTimeout(() => {
      void searchPosCustomers(customerQuery.trim())
        .then(setCustomerHits)
        .catch(() => setCustomerHits([]));
    }, 250);
    return () => clearTimeout(t);
  }, [customerQuery]);

  const filteredOrders = useMemo(() => {
    let rows = orders;
    if (orderFilter === "unpaid") rows = rows.filter((o) => o.payment_status !== "Paid");
    else if (orderFilter === "waiting") {
      rows = rows.filter((o) =>
        ["Waiting", "Checked In", "Booked", "Confirmed"].includes(o.status ?? ""),
      );
    }
    if (listSearch.trim()) {
      const q = listSearch.toLowerCase();
      rows = rows.filter(
        (o) =>
          o.name?.toLowerCase().includes(q) ||
          o.customer_name?.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [orders, orderFilter, listSearch]);

  const activeCategory = serviceCategories.find((c) => c.name === selectedCategory);
  const visibleServices = useMemo(() => {
    const list = activeCategory?.services ?? [];
    if (!catalogSearch.trim()) return list;
    const q = catalogSearch.toLowerCase();
    return list.filter(
      (s) =>
        s.service_name.toLowerCase().includes(q) ||
        s.service_code.toLowerCase().includes(q),
    );
  }, [activeCategory, catalogSearch]);

  const grandTotal = items.reduce((sum, line) => sum + (line.rate ?? 0) * (line.qty ?? 1), 0);

  function resetTicket() {
    setItems(EMPTY_CART);
    setCustomer(WALKIN_CUSTOMER);
    setCustomerName(WALKIN_CUSTOMER);
    setLinkedAppointment(undefined);
    setPaymentStatus(undefined);
    setReceipt(null);
    setError(null);
    setCustomerQuery("");
    setCustomerHits([]);
    setCatalogSearch("");
    setBarcode("");
  }

  function startNewOrder() {
    resetTicket();
    setScreen("order");
    setCatalogueTab("services");
  }

  async function openAppointmentByName(name: string) {
    setBusy(true);
    setError(null);
    try {
      const appt = await loadPosAppointment(name);
      setBranch(appt.beauty_branch ?? branch);
      setCustomer(appt.customer ?? WALKIN_CUSTOMER);
      setCustomerName(appt.customer_name ?? appt.customer ?? "");
      setItems(appt.items?.length ? appt.items : EMPTY_CART);
      setLinkedAppointment(appt.beauty_appointment);
      setPaymentStatus(appt.payment_status);
      setReceipt(null);
      setScreen("order");
      setCatalogueTab("services");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open order");
    } finally {
      setBusy(false);
    }
  }

  async function openOrder(order: PosOrderRow) {
    await openAppointmentByName(order.name);
  }

  function bumpCart(updater: (prev: PosCartItem[]) => PosCartItem[]) {
    setItems(updater);
    setReceipt(null);
    setError(null);
  }

  function addService(service: BeautyService) {
    bumpCart((prev) => [
      ...prev,
      {
        line_type: "Service",
        beauty_service: service.name,
        service_name: service.service_name,
        qty: 1,
        rate: service.standard_selling_price ?? 0,
      },
    ]);
  }

  function addProduct(product: PosCatalogueItem) {
    bumpCart((prev) => [
      ...prev,
      {
        line_type: "Item",
        item: product.item_code,
        item_name: product.item_name,
        qty: 1,
        rate: product.rate ?? 0,
      },
    ]);
  }

  function removeItem(index: number) {
    bumpCart((prev) => prev.filter((_, i) => i !== index));
  }

  async function scanBarcode() {
    if (!barcode.trim()) return;
    setBusy(true);
    setError(null);
    try {
      addProduct(await lookupPosBarcode(barcode.trim(), branch));
      setBarcode("");
      setCatalogueTab("products");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Barcode not found");
    } finally {
      setBusy(false);
    }
  }

  function pickCustomer(hit: PosCustomerHit) {
    setCustomer(hit.name);
    setCustomerName(hit.customer_name);
    setCustomerQuery("");
    setCustomerHits([]);
  }

  async function completePayment() {
    if (!customer) {
      setError("Select a customer before checkout.");
      return;
    }
    if (items.length === 0) {
      setError("Add at least one service or product.");
      return;
    }

    const paired = loadStoredRegister();
    try {
      const ctx = (await getPosSessionContext({
        beauty_branch: branch,
        register_code: paired?.register_code,
        register_api_key: paired?.register_api_key,
      })) as PosSessionContext;
      const gate = evaluatePosCheckoutReady(ctx, Boolean(paired));
      if (!gate.ready) {
        setPosReady(false);
        setPosBlockReason(gate.reason);
        setError(gate.reason ?? "POS session is not ready for checkout.");
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not verify POS session");
      return;
    }

    if (!posReady) {
      setError(posBlockReason ?? "Open Register & Day before checkout.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = (await checkoutPosCart({
        customer,
        beauty_branch: branch,
        beauty_appointment: linkedAppointment,
        items,
        payments: [{ mode_of_payment: selectedPayment, amount: grandTotal }],
        register_code: paired?.register_code,
        register_api_key: paired?.register_api_key,
      })) as { name?: string; invoice?: string };
      setReceipt(result as Record<string, unknown>);
      setPaymentStatus("Paid");
      printPosReceipt({
        transaction: String(result.name ?? ""),
        invoice: result.invoice ? String(result.invoice) : undefined,
        customer: customerName,
        items,
        total: grandTotal,
        paymentMode: selectedPayment,
        appointment: linkedAppointment,
      });
      void loadOrders();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <LoadingState title="Loading POS" description="Preparing checkout workspace" />;
  }

  if (workspaceTab === "session" && screen === "list") {
    return (
      <div className="pos-shell pos-compact space-y-4">
        <PosTopTabs active={workspaceTab} onChange={setWorkspaceTab} />
        <PosSessionScreen branch={branch} onReadyChange={setPosReady} />
      </div>
    );
  }

  if (workspaceTab === "pickup" && screen === "list") {
    return (
      <div className="pos-shell pos-compact space-y-4">
        <PosTopTabs active={workspaceTab} onChange={setWorkspaceTab} />
        <PosFulfillmentScreen branch={branch} />
      </div>
    );
  }

  if (screen === "list") {
    return (
      <div className="pos-shell pos-compact space-y-4">
        <PosTopTabs active={workspaceTab} onChange={setWorkspaceTab} />
        <div className="bc-hero flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[color:var(--bc-muted)]">Checkout desk</p>
            <h2 className="text-2xl font-bold tracking-tight">Today&apos;s orders</h2>
            <p className="bc-section-sub">Tap a booking to pay · or start a walk-in sale</p>
          </div>
          <Button onClick={startNewOrder}>+ New sale</Button>
        </div>

        <PosSessionStatus
          branch={branch}
          onReadyChange={(ready, reason) => {
            setPosReady(ready);
            setPosBlockReason(reason ?? null);
          }}
          onManage={() => setWorkspaceTab("session")}
        />

        <div className="pos-filters-bar">
          <div className="min-w-[140px] flex-1">
            <Label htmlFor="pos-branch">Branch</Label>
            <select
              id="pos-branch"
              className="mt-1.5 min-h-12 w-full rounded-full border border-[color:var(--bc-border)] bg-white px-4 text-sm shadow-sm outline-none focus:border-[color:var(--bc-secondary)]"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            >
              {branches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.branch_name ?? b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "unpaid", "waiting"] as OrderFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                className={`bc-chip ${orderFilter === f ? "active" : "inactive"}`}
                onClick={() => setOrderFilter(f)}
              >
                {f === "all" ? "All" : f === "unpaid" ? "Unpaid" : "Waiting"}
              </button>
            ))}
          </div>
          <div className="min-w-[220px] flex-[2]">
            <Label htmlFor="order-search">Search</Label>
            <div className="bc-search mt-1.5">
              <span className="bc-search-icon" aria-hidden>
                🔍
              </span>
              <input
                id="order-search"
                placeholder="Customer or booking ref"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredOrders.length === 0 ? (
            <div className="pos-empty-state">
              No orders today — tap <strong className="text-[color:var(--bc-text)]">New sale</strong> for
              walk-ins
            </div>
          ) : (
            filteredOrders.map((order) => (
              <button
                key={order.name}
                type="button"
                onClick={() => void openOrder(order)}
                className="pos-order-card"
              >
                <div className="pos-order-card-top">
                  <span className="bc-avatar">{customerInitials(order.customer_name)}</span>
                  <div className="pos-order-card-body">
                    <p className="pos-order-card-name">{order.customer_name ?? "Guest"}</p>
                    <p className="pos-order-card-ref">{order.name}</p>
                  </div>
                  <Badge tone={paymentTone(order.payment_status)}>
                    {order.payment_status ?? "Unpaid"}
                  </Badge>
                </div>
                <p className="pos-order-card-services">
                  {formatTime(order.scheduled_start)} · {order.status}
                </p>
                <p className="pos-order-card-services line-clamp-2">
                  {(order.services ?? [])
                    .map((s) => s.service_name)
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
                <p className="pos-order-card-price">SAR {order.total_amount ?? 0}</p>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  const branchLabel = branches.find((b) => b.name === branch)?.branch_name ?? branch;

  return (
    <div className="pos-shell pos-compact flex flex-col gap-4">
      <div className="bc-hero flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setScreen("list")}>
            ← Back
          </Button>
          <div>
            <p className="text-xs font-medium text-[color:var(--bc-muted)]">{branchLabel}</p>
            <h2 className="text-xl font-bold tracking-tight">
              {linkedAppointment ?? "Walk-in sale"}
            </h2>
          </div>
        </div>
        {linkedAppointment ? (
          <Badge tone={paymentTone(paymentStatus)}>{paymentStatus ?? "Unpaid"}</Badge>
        ) : null}
      </div>

      <PosSessionStatus
        branch={branch}
        onReadyChange={(ready, reason) => {
          setPosReady(ready);
          setPosBlockReason(reason ?? null);
        }}
        onManage={() => {
          setScreen("list");
          setWorkspaceTab("session");
        }}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <section className="pos-catalog flex flex-col overflow-hidden">
          <div className="pos-catalog-toolbar">
            <p className="bc-section-title">Discover services & products</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={`bc-chip ${catalogueTab === "services" ? "active" : "inactive"}`}
                onClick={() => setCatalogueTab("services")}
              >
                Services
              </button>
              <button
                type="button"
                className={`bc-chip ${catalogueTab === "products" ? "active" : "inactive"}`}
                onClick={() => setCatalogueTab("products")}
              >
                Products
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_7rem_auto]">
              <div className="bc-search">
                <span className="bc-search-icon" aria-hidden>
                  🔍
                </span>
                <input
                  placeholder="Search catalogue…"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                />
              </div>
              <Input
                placeholder="Barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void scanBarcode();
                  }
                }}
                className="min-h-10 rounded-full text-sm"
              />
              <Button variant="secondary" onClick={() => void scanBarcode()} disabled={!barcode.trim()}>
                Scan
              </Button>
            </div>
          </div>

          {catalogueTab === "services" ? (
            <>
              <div className="pos-categories-row">
                {serviceCategories.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    className={`bc-cat-circle ${selectedCategory === cat.name ? "active" : ""}`}
                    onClick={() => setSelectedCategory(cat.name)}
                  >
                    <span className="bc-cat-circle-icon">{categoryIcon(cat.label)}</span>
                    <span className="bc-cat-circle-label">{cat.label}</span>
                  </button>
                ))}
              </div>
              <div className="pos-catalog-scroll pos-services-list">
                {visibleServices.map((service) => (
                  <button
                    key={service.name}
                    type="button"
                    onClick={() => addService(service)}
                    className="bc-service-row"
                  >
                    <span className="bc-service-row-icon">{serviceIcon(service.service_name)}</span>
                    <span className="bc-service-row-body">
                      <span className="bc-service-row-title">{service.service_name}</span>
                      <span className="bc-service-row-meta">
                        {service.default_duration ?? "—"} min
                      </span>
                    </span>
                    <span className="bc-service-row-price">
                      SAR {service.standard_selling_price ?? 0}
                    </span>
                    <span className="bc-service-row-chevron" aria-hidden>
                      ›
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="pos-categories-row">
                {productGroups.map((group) => (
                  <button
                    key={group.name}
                    type="button"
                    className={`bc-cat-circle ${selectedProductGroup === group.name ? "active" : ""}`}
                    onClick={() => setSelectedProductGroup(group.name)}
                  >
                    <span className="bc-cat-circle-icon">{productIcon(group.name)}</span>
                    <span className="bc-cat-circle-label">{group.name}</span>
                  </button>
                ))}
              </div>
              <div className="pos-catalog-scroll pos-product-grid">
                {products.length === 0 ? (
                  <p className="col-span-full py-8 text-center text-sm text-[color:var(--bc-muted)]">
                    No products in stock
                  </p>
                ) : (
                  products.map((product) => (
                    <button
                      key={product.item_code}
                      type="button"
                      onClick={() => addProduct(product)}
                      className="pos-product-tile"
                    >
                      <span className="pos-product-tile-icon">{productIcon(product.item_name)}</span>
                      <span className="pos-product-tile-name">{product.item_name}</span>
                      <span className="pos-product-tile-price">SAR {product.rate ?? 0}</span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </section>

        <aside className="pos-ticket flex flex-col">
          <div className="pos-ticket-header">
            <div className="flex items-center gap-2">
              <span className="bc-avatar">{customerInitials(customerName)}</span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--bc-muted)]">
                  Customer
                </p>
                <p className="font-bold">{customerName}</p>
              </div>
            </div>
            <Input
              id="customer-search"
              placeholder="Search name or mobile"
              value={customerQuery || (customerHits.length ? "" : customerName)}
              onChange={(e) => setCustomerQuery(e.target.value)}
              className="mt-3 min-h-10 bg-white text-sm"
            />
            {customerHits.length > 0 ? (
              <ul className="mt-2 overflow-hidden rounded-2xl border border-[color:var(--bc-border)] bg-white shadow-sm">
                {customerHits.map((hit) => (
                  <li key={hit.name}>
                    <button
                      type="button"
                      className="w-full border-b border-[color:var(--bc-border)] px-3 py-2.5 text-left text-sm last:border-0 hover:bg-[color:var(--bc-accent-muted)]"
                      onClick={() => pickCustomer(hit)}
                    >
                      <span className="font-medium">{hit.customer_name}</span>
                      {hit.mobile_no ? (
                        <span className="ml-2 text-[color:var(--bc-muted)]">{hit.mobile_no}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex-1 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--bc-muted)]">
              Your ticket · {items.length} items
            </p>
            {items.length === 0 ? (
              <p className="rounded-2xl bg-[color:var(--bc-accent-muted)] p-4 text-center text-sm text-[color:var(--bc-muted)]">
                Tap services or products to add them
              </p>
            ) : (
              <ul className="pos-ticket-scroll space-y-2">
                {items.map((line, i) => (
                  <li key={`${line.beauty_service ?? line.item}-${i}`} className="pos-ticket-line">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{lineLabel(line)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-bold tabular-nums text-[color:var(--bc-secondary)]">
                        {(line.rate ?? 0) * (line.qty ?? 1)}
                      </span>
                      <button
                        type="button"
                        className="text-lg text-[color:var(--bc-danger)]"
                        onClick={() => removeItem(i)}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="pos-ticket-footer space-y-3">
            <div className="pos-ticket-total">
              <span>Total</span>
              <span className="pos-ticket-total-amount">SAR {grandTotal}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {paymentMethods.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`bc-chip ${selectedPayment === mode ? "active" : "inactive"}`}
                  onClick={() => setSelectedPayment(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>

            {error ? (
              <div className="rounded-2xl border border-[color:var(--bc-danger)]/30 bg-[color:var(--bc-danger)]/5 px-3 py-2 text-xs text-[color:var(--bc-danger)]">
                {error}
              </div>
            ) : null}

            {receipt ? (
              <div className="rounded-2xl bg-[color:var(--bc-success)]/10 p-3 text-xs">
                <p className="font-bold text-[color:var(--bc-success)]">Payment complete ✓</p>
                <p className="mt-1 text-[color:var(--bc-muted)]">
                  {String(receipt.invoice ?? receipt.name)}
                </p>
                <Button
                  variant="secondary"
                  className="mt-2 w-full"
                  onClick={() =>
                    printPosReceipt({
                      transaction: String(receipt.name ?? ""),
                      invoice: receipt.invoice ? String(receipt.invoice) : undefined,
                      customer: customerName,
                      items,
                      total: grandTotal,
                      paymentMode: selectedPayment,
                      appointment: linkedAppointment,
                    })
                  }
                >
                  Print receipt
                </Button>
                <Button variant="ghost" className="mt-2 w-full" onClick={() => setScreen("list")}>
                  Done
                </Button>
              </div>
            ) : (
              <>
                {!posReady && posBlockReason ? (
                  <p className="rounded-2xl border border-[color:var(--bc-warning)]/40 bg-[color:var(--bc-warning)]/10 px-3 py-2 text-xs text-[color:var(--bc-warning)]">
                    {posBlockReason}
                  </p>
                ) : null}
                <Button
                  className="w-full"
                  onClick={() => void completePayment()}
                  disabled={busy || items.length === 0 || !posReady}
                >
                  {busy
                    ? "Processing…"
                    : !posReady
                      ? "Open register to pay"
                      : `Pay · SAR ${grandTotal}`}
                </Button>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
