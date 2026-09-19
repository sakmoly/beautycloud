export type CssVariables = Record<string, string>;

export interface HeroSlide {
  image?: string | null;
  eyebrow?: string | null;
  title: string;
  subtitle?: string | null;
  cta_label?: string | null;
  cta_link?: string | null;
  sort_order?: number;
}

export interface Branding {
  application_title?: string;
  company_display_name?: string;
  logo_light?: string | null;
  logo_dark?: string | null;
  favicon?: string | null;
  booking_header_image?: string | null;
  promo_bar_enabled?: boolean;
  promo_bar_text?: string | null;
  hero_slides?: HeroSlide[];
  tagline?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  about_teaser?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  twitter_url?: string | null;
  tiktok_url?: string | null;
  theme_mode?: string;
  support_email?: string | null;
  support_phone?: string | null;
  custom_footer_text?: string | null;
  menu_items?: WebMenuItem[];
  footer_menu_items?: WebMenuItem[];
  css_variables?: CssVariables;
}

export interface WebMenuItem {
  label: string;
  url: string;
  link_type?: "Internal" | "External" | "System";
  parent_label?: string | null;
  sort_order?: number;
  is_visible?: boolean;
  highlight?: boolean;
  open_in_new_tab?: boolean;
}

export interface WebNavItem extends WebMenuItem {
  children?: WebNavItem[];
  source?: string;
}

export interface WebPageGalleryItem {
  image?: string | null;
  caption?: string | null;
  sort_order?: number;
}

export interface WebPageWhyUsItem {
  icon?: string | null;
  title: string;
  description?: string | null;
  sort_order?: number;
}

export interface WebPageFaqItem {
  question: string;
  answer?: string | null;
  sort_order?: number;
}

export interface PublicBranchSummary {
  name: string;
  branch_code?: string;
  branch_name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface PublicStylistSummary {
  name: string;
  employee_name: string;
  image?: string | null;
  designation?: string | null;
}

export interface WebPageSection {
  section_type:
    | "Hero"
    | "Trust Chips"
    | "Why Us"
    | "Services Grid"
    | "Stylists"
    | "Branches"
    | "Text & Image"
    | "CTA"
    | "Book CTA"
    | "Rich Text"
    | "Image Banner"
    | "Gallery"
    | "FAQ";
  title?: string | null;
  subtitle?: string | null;
  body?: string | null;
  trust_chips?: string | null;
  image?: string | null;
  image_position?: "Left" | "Right";
  link_label?: string | null;
  link_url?: string | null;
  secondary_link_label?: string | null;
  secondary_link_url?: string | null;
  embed_category?: string | null;
  embed_limit?: number;
  sort_order?: number;
  gallery?: WebPageGalleryItem[];
  why_us?: WebPageWhyUsItem[];
  faq?: WebPageFaqItem[];
  categories?: PublicCatalogCategory[];
  branches?: PublicBranchSummary[];
  stylists?: PublicStylistSummary[];
}

export interface WebPageContent {
  page_slug: string;
  page_template?: "Standard" | "Salon Landing";
  title: string;
  subtitle?: string | null;
  meta_description?: string | null;
  is_home_page?: boolean;
  show_in_menu?: boolean;
  menu_label?: string | null;
  body?: string | null;
  hero_image?: string | null;
  sections?: WebPageSection[];
  url?: string;
}

export interface WebPageSummary {
  page_slug: string;
  title: string;
  subtitle?: string | null;
  menu_label?: string;
  show_in_menu?: boolean;
  menu_sort_order?: number;
  url?: string;
}

export interface PublicCatalogCategory {
  name: string;
  label: string;
  label_ar?: string | null;
  is_group: boolean;
  sort_order: number;
  image?: string | null;
  child_count: number;
  service_count: number;
}

export interface PublicCatalogService {
  name: string;
  service_code?: string;
  service_name: string;
  service_name_ar?: string | null;
  service_category?: string;
  default_duration?: number;
  standard_selling_price?: number;
  description?: string | null;
  image?: string | null;
}

export interface PublicServiceCatalog {
  parent?: PublicCatalogCategory | null;
  categories: PublicCatalogCategory[];
  services: PublicCatalogService[];
  breadcrumb: Array<{ name: string; label: string }>;
  level: "root" | "category" | "services";
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
  require_payment_for_check_in?: boolean;
  require_qr_for_check_in?: boolean;
  require_id_for_check_in?: boolean;
  require_check_in_before_service?: boolean;
  require_invoice_before_service?: boolean;
}

export interface StaffWorkflowCapabilities {
  can_check_in?: boolean;
  can_start_service?: boolean;
  can_complete_service?: boolean;
  require_check_in_before_service?: boolean;
  require_invoice_before_service?: boolean;
  roles?: string[];
  default_branch?: string | null;
  branch_scope?: string[] | null;
}

export interface UnpaidDraftHoldSettings {
  auto_cancel_unpaid_draft_bookings?: boolean;
  unpaid_draft_hold_minutes?: number;
}

export interface VatBootstrapSettings {
  enabled?: boolean;
  prices_include_vat?: boolean;
  vat_percent?: number;
}

export interface PublicBootstrap {
  application_title: string;
  company: string;
  company_display_name?: string;
  invoice_posting_type?: string;
  vat?: VatBootstrapSettings;
  sms_enabled?: boolean;
  email_enabled?: boolean;
  send_booking_confirmation_email?: boolean;
  otp_expiry_minutes?: number;
  default_slot_interval_minutes?: number;
  payment_methods?: PaymentMethodsByChannel;
  booking_payment?: BookingPaymentSettings;
  salon_payment?: SalonPaymentSettings;
  staff_workflow?: StaffWorkflowCapabilities;
  unpaid_draft_hold?: UnpaidDraftHoldSettings;
  branding?: Branding;
  navigation?: WebNavItem[];
  footer_navigation?: WebNavItem[];
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
  payment_label?: string;
  name?: string;
}

export interface KioskPaymentConfig {
  require_payment?: boolean;
  label?: string;
  gateway?: string;
  enable_telr?: boolean;
  telr_demo_mode?: boolean;
  currency?: string;
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
