import "server-only";
import { paypalEnv, requireEnv } from "./env";

export function paypalBaseUrl(): string {
  return paypalEnv() === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export class PayPalError extends Error {
  constructor(
    message: string,
    public status: number,
    public name_: string | undefined,
    public debugId: string | undefined,
    public details: unknown,
  ) {
    super(message);
    this.name = "PayPalError";
  }
  /** First issue code from PayPal's error details, e.g. INSTRUMENT_DECLINED, ORDER_ALREADY_CAPTURED. */
  get issue(): string | undefined {
    const d = this.details as { issue?: string }[] | undefined;
    return Array.isArray(d) ? d[0]?.issue : undefined;
  }
}

let tokenCache: { token: string; expiresAt: number; key: string } | null = null;

/** Test hook. */
export function _resetPayPalTokenCache() {
  tokenCache = null;
}

export async function getAccessToken(): Promise<string> {
  const clientId = requireEnv("PAYPAL_CLIENT_ID");
  const secret = requireEnv("PAYPAL_CLIENT_SECRET");
  const key = `${paypalEnv()}:${clientId}`;
  if (tokenCache && tokenCache.key === key && tokenCache.expiresAt - 60_000 > Date.now()) return tokenCache.token;

  const res = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new PayPalError(`PayPal OAuth failed (${res.status})`, res.status, "AUTH_FAILED", undefined, body.slice(0, 300));
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000, key };
  return json.access_token;
}

export interface PayPalRequestInit {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  requestId?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export async function paypalFetch<T = unknown>(path: string, init: PayPalRequestInit = {}): Promise<T> {
  const doFetch = async (token: string) =>
    fetch(`${paypalBaseUrl()}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init.requestId ? { "PayPal-Request-Id": init.requestId } : {}),
        ...init.headers,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
      signal: AbortSignal.timeout(init.timeoutMs ?? 15_000),
    });

  let res = await doFetch(await getAccessToken());
  if (res.status === 401) {
    // Token revoked or expired early: refresh once.
    _resetPayPalTokenCache();
    res = await doFetch(await getAccessToken());
  }
  const text = await res.text();
  let json: unknown = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  if (!res.ok) {
    const j = (json ?? {}) as { name?: string; message?: string; debug_id?: string; details?: unknown };
    throw new PayPalError(j.message ?? `PayPal ${path} failed (${res.status})`, res.status, j.name, j.debug_id, j.details);
  }
  return json as T;
}

/* ---------- Types for the parts of PayPal responses we read ---------- */

export interface PayPalMoney {
  currency_code: string;
  value: string;
}
export interface PayPalCapture {
  id: string;
  status: string;
  amount: PayPalMoney;
  create_time?: string;
  custom_id?: string;
}
export interface PayPalOrder {
  id: string;
  status: string;
  payer?: { email_address?: string };
  purchase_units?: {
    custom_id?: string;
    amount?: PayPalMoney;
    payments?: { captures?: PayPalCapture[] };
  }[];
}
