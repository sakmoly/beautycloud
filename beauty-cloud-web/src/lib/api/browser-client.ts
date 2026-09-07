/**
 * Browser-side helper for Beauty Cloud BFF routes.
 * Never call Frappe directly from the client.
 */

import type {
  AvailabilitySlot,
  BeautyAppointment,
  BeautyBranch,
  BeautyService,
  BeauticianScheduleLine,
  BookingReceipt,
  CalendarEvent,
  PosCartItem,
  PosCatalogueItem,
  PosCustomerHit,
  PosOrderRow,
  PosServiceCategory,
  ReceptionDashboard,
  ReportDashboard,
  ReceptionCalendarData,
  StockRow,
} from "@/lib/api/types";
import type { PublicBootstrap } from "@/lib/frappe/types";
import { withBasePath } from "@/lib/base-path";

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }
  return payload as T;
}

export async function fetchBootstrap() {
  const response = await fetch(withBasePath("/api/beauty/bootstrap"), {
    cache: "no-store",
  });
  return parseJson<PublicBootstrap>(response);
}

export async function callBeautyMethod<T>(input: {
  method: string;
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: Record<string, unknown>;
  guest?: boolean;
}): Promise<T> {
  const response = await fetch(withBasePath("/api/beauty/method"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await parseJson<{ data: T }>(response);
  return payload.data;
}

export async function getStaffSessionStatus() {
  const response = await fetch(withBasePath("/api/beauty/auth/session"), {
    cache: "no-store",
  });
  return parseJson<{
    authenticated: boolean;
    user?: string;
    full_name?: string;
  }>(response);
}

export async function getCustomerSessionStatus() {
  const response = await fetch(withBasePath("/api/beauty/customer/session"), {
    cache: "no-store",
  });
  return parseJson<{
    verified: boolean;
    mobile?: string;
    email?: string;
    expires_at?: string;
  }>(response);
}

export async function logoutCustomerSession() {
  const response = await fetch(withBasePath("/api/beauty/customer/session"), {
    method: "DELETE",
  });
  return parseJson<{ verified: boolean }>(response);
}

export async function requestCustomerOtp(input: {
  mobile?: string;
  email?: string;
  purpose?: string;
  channel?: string;
}) {
  const response = await fetch(withBasePath("/api/beauty/customer/otp"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "request",
      mobile: input.mobile,
      email: input.email,
      purpose: input.purpose ?? "Booking",
      channel: input.channel,
    }),
  });
  return parseJson<{ request_id?: string; dev_otp?: string; channel?: string }>(response);
}

export async function verifyCustomerOtp(input: {
  mobile?: string;
  email?: string;
  otp: string;
  request_id?: string;
}) {
  const response = await fetch(withBasePath("/api/beauty/customer/otp"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "verify", ...input }),
  });
  return parseJson<{
    verified: boolean;
    mobile?: string;
    email?: string;
    expires_at: string;
  }>(response);
}

export async function createBooking(body: Record<string, unknown>) {
  const response = await fetch(withBasePath("/api/beauty/customer/booking"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create", ...body }),
  });
  const payload = await parseJson<{ data: unknown }>(response);
  return payload.data;
}

export async function initiateBookingPayment(appointment: string) {
  const response = await fetch(withBasePath("/api/beauty/customer/payment"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "initiate", appointment }),
  });
  const payload = await parseJson<{ data: unknown }>(response);
  return payload.data;
}

export async function completeDemoPayment(input: {
  payment_name: string;
  demo_token: string;
}) {
  const response = await fetch(withBasePath("/api/beauty/customer/payment"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "demo_complete", ...input }),
  });
  const payload = await parseJson<{ data: unknown }>(response);
  return payload.data;
}

export async function completeTelrReturn(order_ref: string) {
  const response = await fetch(withBasePath("/api/beauty/customer/payment"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "telr_return", order_ref }),
  });
  const payload = await parseJson<{
    data: {
      confirmed?: boolean;
      appointment?: string;
      status?: string;
    };
  }>(response);
  return payload.data;
}

export async function getPaymentStatus(payment_name: string) {
  const response = await fetch(
    withBasePath(
      `/api/beauty/customer/payment?payment_name=${encodeURIComponent(payment_name)}`,
    ),
    { cache: "no-store" },
  );
  const payload = await parseJson<{
    data: {
      confirmed?: boolean;
      appointment?: string;
      status?: string;
    };
  }>(response);
  return payload.data;
}

export async function getMyAppointments() {
  const response = await fetch(withBasePath("/api/beauty/customer/booking"), { cache: "no-store" });
  const payload = await parseJson<{ data: BeautyAppointment[] }>(response);
  return payload.data ?? [];
}

export async function getBookingReceipt(appointment: string) {
  const response = await fetch(
    withBasePath(`/api/beauty/customer/receipt?appointment=${encodeURIComponent(appointment)}`),
    { cache: "no-store" },
  );
  const payload = await parseJson<{ data: BookingReceipt }>(response);
  return payload.data;
}

export async function getBranches() {
  return callBeautyMethod<BeautyBranch[]>({
    method: "beauty_cloud.api.bootstrap.get_branches",
    guest: true,
  });
}

export async function getServices() {
  return callBeautyMethod<BeautyService[]>({
    method: "beauty_cloud.api.bootstrap.get_services",
    guest: true,
  });
}

export async function getSlots(input: {
  beauty_branch: string;
  appointment_date: string;
  services: string[];
  employee?: string;
}) {
  return callBeautyMethod<AvailabilitySlot[]>({
    method: "beauty_cloud.api.availability.get_slots",
    guest: true,
    params: {
      beauty_branch: input.beauty_branch,
      appointment_date: input.appointment_date,
      services: JSON.stringify(input.services),
      employee: input.employee,
    },
  });
}

export async function getReceptionDashboard(
  beauty_branch: string,
  appointment_date?: string,
) {
  return callBeautyMethod<ReceptionDashboard>({
    method: "beauty_cloud.api.reception.get_dashboard",
    params: { beauty_branch, appointment_date },
  });
}

export async function getReceptionCalendar(input: {
  beauty_branch: string;
  start_date: string;
  end_date?: string;
  employee?: string;
}) {
  return callBeautyMethod<ReceptionCalendarData>({
    method: "beauty_cloud.api.reception.get_calendar",
    params: input,
  });
}

export async function getReceptionQueue(
  beauty_branch: string,
  appointment_date?: string,
) {
  return callBeautyMethod<BeautyAppointment[]>({
    method: "beauty_cloud.api.reception.get_queue",
    params: { beauty_branch, appointment_date },
  });
}

export async function receptionAction(
  method: string,
  body: Record<string, unknown>,
) {
  return callBeautyMethod({ method, body });
}

export async function getBeauticianSchedule(
  start_date?: string,
  end_date?: string,
  employee?: string,
  beauty_branch?: string,
) {
  return callBeautyMethod<{
    today?: BeauticianScheduleLine[];
    upcoming?: BeauticianScheduleLine[];
    all?: BeauticianScheduleLine[];
    can_select_employee?: boolean;
    employee?: string | null;
    employee_name?: string | null;
  }>({
    method: "beauty_cloud.api.beautician.get_schedule",
    params: { start_date, end_date, employee, beauty_branch },
  });
}

export async function getBeauticianMe() {
  return callBeautyMethod<{
    employee: string | null;
    employee_name?: string | null;
    can_select_employee?: boolean;
    employees?: Array<{ name: string; employee_name: string }>;
    user?: string;
  }>({
    method: "beauty_cloud.api.beautician.get_me",
  });
}

export async function getBranchStock(beauty_branch: string) {
  return callBeautyMethod<StockRow[]>({
    method: "beauty_cloud.api.inventory.branch_stock",
    params: { beauty_branch },
  });
}

export async function validatePosCart(body: {
  customer?: string;
  beauty_branch: string;
  beauty_appointment?: string;
  items: PosCartItem[];
}) {
  return callBeautyMethod({
    method: "beauty_cloud.api.pos.validate",
    body,
  });
}

export async function checkoutPosCart(body: Record<string, unknown>) {
  return callBeautyMethod({
    method: "beauty_cloud.api.pos.checkout_cart",
    body,
  });
}

export async function getPosServices() {
  return callBeautyMethod<BeautyService[]>({
    method: "beauty_cloud.api.pos.get_services",
  });
}

export async function getPosCatalogue(input: {
  beauty_branch: string;
  search?: string;
  item_group?: string;
  page?: number;
}) {
  return callBeautyMethod<{ items: PosCatalogueItem[]; total?: number }>({
    method: "beauty_cloud.api.pos.get_catalogue",
    params: {
      beauty_branch: input.beauty_branch,
      search: input.search,
      item_group: input.item_group,
      page: input.page ?? 1,
    },
  });
}

export async function lookupPosBarcode(barcode: string, beauty_branch: string) {
  return callBeautyMethod<PosCatalogueItem>({
    method: "beauty_cloud.api.pos.barcode_lookup",
    params: { barcode, beauty_branch },
  });
}

export async function getPosOrders(beauty_branch: string, appointment_date?: string) {
  return callBeautyMethod<PosOrderRow[]>({
    method: "beauty_cloud.api.pos.get_orders",
    params: { beauty_branch, appointment_date },
  });
}

export async function getPosServiceCategories() {
  return callBeautyMethod<{ categories: PosServiceCategory[]; total_services: number }>({
    method: "beauty_cloud.api.pos.get_service_categories",
  });
}

export async function getPosProductGroups(beauty_branch: string) {
  return callBeautyMethod<Array<{ name: string; item_count: number }>>({
    method: "beauty_cloud.api.pos.get_product_groups",
    params: { beauty_branch },
  });
}

export async function searchPosCustomers(query: string) {
  return callBeautyMethod<PosCustomerHit[]>({
    method: "beauty_cloud.api.pos.customer_search",
    params: { query },
  });
}

export async function getPosPaymentMethods() {
  return callBeautyMethod<string[]>({
    method: "beauty_cloud.api.pos.payment_methods",
    params: { channel: "pos" },
  });
}

export async function getPosSessionContext(input: {
  beauty_branch: string;
  register_code?: string;
  register_api_key?: string;
}) {
  return callBeautyMethod({
    method: "beauty_cloud.api.pos.session_context",
    params: input,
  });
}

export async function openPosBusinessDay(input: {
  beauty_branch: string;
  business_date?: string;
  notes?: string;
}) {
  return callBeautyMethod({
    method: "beauty_cloud.api.register.open_day",
    params: input,
  });
}

export async function pairPosRegister(input: {
  register_code: string;
  register_api_key: string;
  beauty_branch?: string;
}) {
  return callBeautyMethod({
    method: "beauty_cloud.api.register.pair_register",
    params: input,
  });
}

export async function unpairPosRegister(input: { register_code: string; register_api_key: string }) {
  return callBeautyMethod({
    method: "beauty_cloud.api.register.unpair_register_device",
    params: input,
  });
}

export async function openPosRegisterSession(input: {
  register_code: string;
  register_api_key: string;
  opening_float?: number;
}) {
  return callBeautyMethod({
    method: "beauty_cloud.api.register.open_register",
    params: input,
  });
}

export async function closePosRegisterSession(input: { session: string; closing_cash: number; notes?: string }) {
  return callBeautyMethod({
    method: "beauty_cloud.api.register.close_register",
    params: input,
  });
}

export async function closePosBusinessDay(input: {
  beauty_branch?: string;
  name?: string;
  notes?: string;
}) {
  return callBeautyMethod({
    method: "beauty_cloud.api.register.close_day",
    params: input,
  });
}

export async function getPosFulfillmentQueue(input: {
  beauty_branch: string;
  business_date?: string;
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}) {
  return callBeautyMethod({
    method: "beauty_cloud.api.pos.get_fulfillment_queue",
    params: input,
  });
}

export async function markPosItemsDelivered(lineNames: string[]) {
  return callBeautyMethod({
    method: "beauty_cloud.api.pos.mark_delivered",
    body: { line_names: lineNames.filter(Boolean) },
  });
}

export async function loadPosAppointment(name: string) {
  return callBeautyMethod<{
    beauty_appointment?: string;
    customer?: string;
    customer_name?: string;
    beauty_branch?: string;
    payment_status?: string;
    items?: PosCartItem[];
  }>({
    method: "beauty_cloud.api.pos.load_appointment",
    params: { name },
  });
}

export async function getCommissionReport(from_date?: string, to_date?: string) {
  return callBeautyMethod({
    method: "beauty_cloud.api.commission.report",
    params: { from_date, to_date },
  });
}

export async function getLoyaltyPackages() {
  return callBeautyMethod({
    method: "beauty_cloud.api.loyalty.packages",
  });
}

export async function getReportsDashboard(input: {
  from_date?: string;
  to_date?: string;
  beauty_branch?: string;
}) {
  return callBeautyMethod<ReportDashboard>({
    method: "beauty_cloud.api.reports.dashboard",
    params: input,
  });
}

export async function kioskBootstrap(device_id: string, api_key: string) {
  return callBeautyMethod({
    method: "beauty_cloud.api.kiosk.bootstrap",
    guest: true,
    params: { device_id, api_key },
  });
}
