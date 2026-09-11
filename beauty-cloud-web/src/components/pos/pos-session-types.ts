export type PosBusinessDaySummary = {
  name?: string;
  business_date?: string;
  status?: string;
  opened_at?: string;
  opened_by?: string;
  closed_at?: string;
  closed_by?: string;
  posted_at?: string;
  posted_by?: string;
  transaction_count?: number;
  total_sales?: number;
  notes?: string;
};

export type PosRegisterSessionSummary = {
  name?: string;
  status?: string;
  register_code?: string;
  cashier?: string;
  business_date?: string;
  beauty_business_day?: string;
  opened_at?: string;
  opening_float?: number;
  closed_at?: string;
  closing_cash?: number;
  expected_cash?: number;
  cash_variance?: number;
  total_sales?: number;
  transaction_count?: number;
  notes?: string;
};

export type PosRegisterRow = {
  name?: string;
  register_code?: string;
  register_name?: string;
  pos_profile?: string;
  last_seen_at?: string;
};

export type PosSessionContext = {
  beauty_branch?: string;
  branch_name?: string;
  can_manage_business_day?: boolean;
  can_open_business_day?: boolean;
  can_close_business_day?: boolean;
  can_unpair_register?: boolean;
  enforce_business_day?: boolean;
  enforce_register_session?: boolean;
  require_all_registers_closed?: boolean;
  business_day_cutoff_time?: string;
  business_day?: PosBusinessDaySummary | null;
  suggested_business_date?: string;
  register?: { name?: string; register_code?: string; register_name?: string } | null;
  register_pairing_error?: string | null;
  register_session?: PosRegisterSessionSummary | null;
  open_registers?: PosRegisterSessionSummary[];
  closed_registers?: PosRegisterSessionSummary[];
  recent_business_days?: PosBusinessDaySummary[];
  available_registers?: PosRegisterRow[];
  can_fetch_pairing_key?: boolean;
};
