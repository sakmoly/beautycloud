const STORAGE_KEY = "beauty_cloud_pos_register";

export type StoredPosRegister = {
  register_code: string;
  register_api_key: string;
  register_name?: string;
  beauty_branch?: string;
};

export function loadStoredRegister(): StoredPosRegister | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPosRegister;
    if (!parsed.register_code || !parsed.register_api_key) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredRegister(value: StoredPosRegister) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function clearStoredRegister() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
