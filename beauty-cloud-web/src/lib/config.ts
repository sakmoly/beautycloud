function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getFrappeConfig() {
  return {
    baseUrl: process.env.FRAPPE_BASE_URL ?? "http://127.0.0.1:86",
    host: process.env.FRAPPE_HOST ?? "printechsdammam.dyndns.org",
    site: process.env.FRAPPE_SITE ?? "site.beautycloud",
  };
}

export function getSessionSecret() {
  return required("SESSION_SECRET", process.env.SESSION_SECRET);
}

/** Secure cookies require HTTPS. Default off unless explicitly enabled or Frappe base URL is https. */
export function getSessionCookieSecure(): boolean {
  const flag = process.env.SESSION_COOKIE_SECURE;
  if (flag === "1" || flag === "true") return true;
  if (flag === "0" || flag === "false") return false;
  return (process.env.FRAPPE_BASE_URL ?? "").startsWith("https://");
}

export function getPublicBasePath() {
  return process.env.NEXT_PUBLIC_BASE_PATH ?? "";
}
