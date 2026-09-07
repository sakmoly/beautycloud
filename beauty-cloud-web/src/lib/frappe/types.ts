export type CssVariables = Record<string, string>;

export interface Branding {
  application_title?: string;
  company_display_name?: string;
  logo_light?: string | null;
  logo_dark?: string | null;
  favicon?: string | null;
  booking_header_image?: string | null;
  theme_mode?: string;
  support_email?: string | null;
  support_phone?: string | null;
  custom_footer_text?: string | null;
  css_variables?: CssVariables;
}

export interface TenantInfo {
  tenant_code?: string;
  tenant_name?: string;
  status?: string;
  site_name?: string;
  public_url?: string;
  subscription_start?: string;
  subscription_end?: string;
}

export interface PlanInfo {
  plan_code?: string;
  plan_name?: string;
  monthly_price?: number;
  currency?: string;
}

export type FeatureFlags = Record<string, boolean>;

export interface TenantLimits {
  max_branches?: number;
  max_employees?: number;
  max_kiosk_devices?: number;
}

export interface TenantContext {
  tenant?: TenantInfo | null;
  plan?: PlanInfo | null;
  features?: FeatureFlags;
  limits?: TenantLimits;
  status?: string;
  company?: string;
}

export interface PaymentMethodsByChannel {
  booking?: string[];
  pos?: string[];
  kiosk?: string[];
}

export interface BookingPaymentSettings {
  require_payment_at_booking?: boolean;
  booking_payment_type?: "Full Amount" | "Deposit Only";
  booking_deposit_percent?: number;
  enable_telr?: boolean;
  telr_demo_mode?: boolean;
  currency?: string;
}

export interface SalonPaymentSettings {
  require_payment_before_service?: boolean;
  require_payment_at_kiosk?: boolean;
  require_qr_for_check_in?: boolean;
}

export interface PublicBootstrap {
  application_title: string;
  company: string;
  company_display_name?: string;
  invoice_posting_type?: string;
  sms_enabled?: boolean;
  email_enabled?: boolean;
  send_booking_confirmation_email?: boolean;
  otp_expiry_minutes?: number;
  default_slot_interval_minutes?: number;
  payment_methods?: PaymentMethodsByChannel;
  booking_payment?: BookingPaymentSettings;
  salon_payment?: SalonPaymentSettings;
  branding?: Branding;
  tenant?: TenantInfo | null;
  plan?: PlanInfo | null;
  features?: FeatureFlags;
}

export interface BookingPaymentSession {
  payment_required?: boolean;
  payment_name?: string;
  appointment?: string;
  amount?: number;
  currency?: string;
  payment_type?: string;
  appointment_total?: number;
  status?: string;
  demo_mode?: boolean;
  demo_token?: string;
  payment_url?: string | null;
  confirmed?: boolean;
  demo_card?: {
    number: string;
    expiry: string;
    cvv: string;
  };
  name?: string;
}

export interface FrappeErrorPayload {
  exc_type?: string;
  exception?: string;
  _server_messages?: string;
  message?: string;
}

export interface StaffSession {
  user: string;
  full_name?: string;
  sid: string;
}

export interface CustomerSession {
  mobile?: string;
  email?: string;
  verification_token: string;
  verified_at: string;
  expires_at: string;
}
