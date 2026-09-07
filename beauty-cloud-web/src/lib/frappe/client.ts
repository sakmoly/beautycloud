import { getFrappeConfig } from "@/lib/config";
import { FrappeApiError, parseFrappeError } from "@/lib/frappe/errors";
import type { FrappeErrorPayload } from "@/lib/frappe/types";

type FrappeParams = Record<string, string | number | boolean | undefined | null>;

interface FrappeCallOptions {
  params?: FrappeParams;
  body?: Record<string, unknown>;
  sid?: string;
  cache?: RequestCache;
}

interface FrappeRawResponse<T = unknown> {
  message?: T;
  exc_type?: string;
  exception?: string;
  _server_messages?: string;
}

function buildHeaders(sid?: string): Record<string, string> {
  const { host, site } = getFrappeConfig();
  const headers: Record<string, string> = {
    Host: host,
    Accept: "application/json",
  };
  if (site) {
    headers["X-Frappe-Site-Name"] = site;
  }
  if (sid) {
    headers.Cookie = `sid=${sid}`;
  }
  return headers;
}

function appendParams(url: URL, params?: FrappeParams) {
  if (!params) return;
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }
}

function encodeFormBody(body?: Record<string, unknown>): string | undefined {
  if (!body) return undefined;
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null) continue;
    form.set(
      key,
      typeof value === "object" ? JSON.stringify(value) : String(value),
    );
  }
  return form.toString();
}

export async function frappeCall<T>(
  method: string,
  options: FrappeCallOptions = {},
): Promise<T> {
  const { baseUrl } = getFrappeConfig();
  const hasBody = Boolean(options.body && Object.keys(options.body).length);
  const url = new URL(`${baseUrl}/api/method/${method}`);

  if (!hasBody) {
    appendParams(url, options.params);
  }

  const headers = buildHeaders(options.sid);
  if (hasBody) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  const response = await fetch(url, {
    method: hasBody ? "POST" : "GET",
    headers,
    body: hasBody ? encodeFormBody(options.body) : undefined,
    cache: options.cache ?? "no-store",
  });

  const payload = (await response.json()) as FrappeRawResponse<T>;

  if (!response.ok || payload.exc_type || payload.exception) {
    throw parseFrappeError(payload as FrappeErrorPayload, response.status);
  }

  if (payload.message === undefined) {
    throw new FrappeApiError("Empty response from Frappe", { status: 502 });
  }

  return payload.message;
}

export async function frappeLogin(
  usr: string,
  pwd: string,
): Promise<{ sid: string; user: string; full_name?: string }> {
  const { baseUrl } = getFrappeConfig();
  const response = await fetch(`${baseUrl}/api/method/login`, {
    method: "POST",
    headers: {
      ...buildHeaders(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ usr, pwd }).toString(),
    cache: "no-store",
  });

  const payload = (await response.json()) as FrappeRawResponse<string> & {
    full_name?: string;
  };

  if (!response.ok || payload.exc_type) {
    throw parseFrappeError(payload as FrappeErrorPayload, response.status);
  }

  const setCookie = response.headers.get("set-cookie") ?? "";
  const sidMatch = setCookie.match(/sid=([^;]+)/);
  if (!sidMatch) {
    throw new FrappeApiError("Login succeeded but session cookie was missing", {
      status: 502,
    });
  }

  const fullNameMatch = setCookie.match(/full_name=([^;]+)/);

  return {
    sid: sidMatch[1],
    user: usr,
    full_name: payload.full_name ?? fullNameMatch?.[1]?.replace(/\+/g, " "),
  };
}

export async function frappeLogout(sid: string): Promise<void> {
  const { baseUrl } = getFrappeConfig();
  await fetch(`${baseUrl}/api/method/logout`, {
    method: "POST",
    headers: buildHeaders(sid),
    cache: "no-store",
  });
}
