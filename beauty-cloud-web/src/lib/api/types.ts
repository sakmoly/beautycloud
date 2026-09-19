export type { BookingPaymentSession } from "@/lib/frappe/types";

export interface BeautyBranch {
  name: string;
  branch_code: string;
  branch_name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface BeautyService {
  name: string;
  service_code: string;
  service_name: string;
  service_category?: string;
  default_duration?: number;
  standard_selling_price?: number;
  image?: string | null;
}

export interface AvailabilitySlot {
  employee: string;
  employee_name: string;
  employee_image?: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  services: string[];
}

export interface SchedulePlanEmployee {
  employee: string;
  employee_name: string;
  employee_image?: string;
}

export interface SchedulePlanService {
  service: string;
  service_name: string;
  duration_minutes: number;
  employees: SchedulePlanEmployee[];
}

export interface BookingSchedulePlan {
  recommended_mode: "unified" | "split";
  allow_unified: boolean;
  allow_split: boolean;
  service_count: number;
  unified_employees: SchedulePlanEmployee[];
  services: SchedulePlanService[];
}

export interface ServiceAssignment {
  beauty_service: string;
  employee: string;
  employee_name?: string;
  start_time: string;
  end_time?: string;
}

export type ScheduleSelection =
  | {
      mode: "unified";
      employee: string;
      employee_name: string;
      employee_image?: string;
      start_time: string;
      end_time: string;
      duration_minutes: number;
    }
  | {
      mode: "split";
      assignments: ServiceAssignment[];
    };

export interface BeautyAppointment {
  name: string;
  beauty_branch?: string;
  appointment_date?: string;
  start_time?: string;
  end_time?: string;
  status?: string;
  customer?: string;
  customer_name?: string;
  mobile?: string;
  customer_mobile?: string;
  customer_email?: string;
  payment_status?: string;
  source?: string;
  total_amount?: number;
  scheduled_start?: string;
  services?: Array<{
    idx?: number;
    service_name?: string;
    employee_name?: string;
    start_time?: string;
    end_time?: string;
    status?: string;
  }>;
  online_payment?: {
    name?: string;
    status?: string;
    amount?: number;
    currency?: string;
    paid_at?: string;
    payment_type?: string;
  };
  pos_receipt?: {
    name?: string;
    invoice?: string;
    invoice_doctype?: string;
    grand_total?: number;
  };
}

export interface BookingReceipt {
  appointment: string;
  customer_name?: string;
  mobile?: string;
  appointment_date?: string;
  scheduled_start?: string;
  status?: string;
  payment_status?: string;
  total_amount?: number;
  branch_name?: string;
  company_name?: string;
  services?: Array<{ service_name?: string; employee_name?: string; amount?: number; rate?: number }>;
  receipt_type?: string;
  receipt_ref?: string;
  paid_amount?: number;
  currency?: string;
  paid_at?: string;
  payment_type?: string;
  gateway?: string;
  invoice_doctype?: string;
  pos_transaction?: string;
}

export interface ReceptionDashboardSummary {
  total_appointments?: number;
  booked?: number;
  checked_in?: number;
  waiting?: number;
  in_service?: number;
  completed?: number;
  cancelled?: number;
  no_show?: number;
  walk_ins?: number;
  expected_revenue?: number;
}

export interface ReceptionDashboard extends ReceptionDashboardSummary {
  beauty_branch?: string;
  appointment_date?: string;
  summary?: ReceptionDashboardSummary;
  queue_count?: number;
}

export interface CalendarEvent {
  name?: string;
  appointment?: string;
  title?: string;
  start?: string;
  end?: string;
  start_time?: string;
  end_time?: string;
  employee?: string;
  employee_name?: string;
  status?: string;
  line_status?: string;
  appointment_status?: string;
  customer_name?: string;
  customer?: string;
  customer_mobile?: string;
  customer_email?: string;
  service_name?: string;
  appointment_date?: string;
  beauty_branch?: string;
  beauty_service?: string;
  payment_status?: string;
  service_row?: number;
  has_invoice?: boolean;
}

export interface CalendarContext {
  scope: "all" | "own";
  employee?: string | null;
  employee_name?: string | null;
  can_filter_employee?: boolean;
  roles?: string[];
}

export interface ReceptionCalendarData {
  events?: CalendarEvent[];
  employees?: Array<{ name: string; employee_name: string }>;
  waiting?: BeautyAppointment[];
  context?: CalendarContext;
  start_date?: string;
  end_date?: string;
}

export interface BeauticianScheduleLine {
  name?: string;
  appointment?: string;
  appointment_name?: string;
  service_row?: number;
  service_name?: string;
  customer_name?: string;
  customer?: string;
  customer_mobile?: string;
  customer_email?: string;
  employee?: string;
  employee_name?: string;
  start_time?: string;
  end_time?: string;
  status?: string;
  appointment_status?: string;
  line_status?: string;
  payment_status?: string;
  has_invoice?: boolean;
}

export interface StockRow {
  item_code?: string;
  item_name?: string;
  warehouse?: string;
  actual_qty?: number;
}

export interface PosCartItem {
  line_type: "Service" | "Item";
  beauty_service?: string;
  service_name?: string;
  item?: string;
  item_name?: string;
  qty: number;
  rate: number;
  employee?: string;
}

export interface PosCatalogueItem {
  item_code: string;
  item_name: string;
  rate?: number;
  stock_qty?: number;
  item_group?: string;
  image?: string | null;
}

export interface PosServiceCategory {
  name: string;
  label: string;
  image?: string | null;
  services: BeautyService[];
}

export interface PosCustomerHit {
  name: string;
  customer_name: string;
  mobile_no?: string;
  email_id?: string;
}

export interface PosOrderRow extends BeautyAppointment {
  services?: Array<{
    service_name?: string;
    employee_name?: string;
    start_time?: string;
  }>;
}

export interface ReportDashboard {
  revenue?: number;
  appointments?: number;
  utilization_pct?: number;
  top_services?: Array<{ service_name: string; count: number; revenue: number }>;
}
