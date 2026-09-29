import { vi } from "vitest";

export type Route = (url: string, init: RequestInit) => { status?: number; body: unknown } | undefined;

/** Install a fetch mock that answers PayPal OAuth automatically and delegates everything else to `route`. */
export function mockPayPal(route: Route) {
  const calls: { url: string; init: RequestInit; body: unknown }[] = [];
  const fn = vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    let body: unknown = init.body;
    try { body = typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { /* form body */ }
    calls.push({ url, init, body });
    if (url.endsWith("/v1/oauth2/token")) {
      return new Response(JSON.stringify({ access_token: "A21-test", expires_in: 32400 }), { status: 200 });
    }
    const r = route(url, init);
    if (!r) return new Response(JSON.stringify({ name: "NOT_MOCKED" }), { status: 500 });
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200 });
  });
  vi.stubGlobal("fetch", fn);
  return { fn, calls };
}

export function setPayPalEnv() {
  process.env.PAYPAL_CLIENT_ID = "client-id";
  process.env.PAYPAL_CLIENT_SECRET = "client-secret";
  process.env.PAYPAL_ENV = "sandbox";
  process.env.PAYPAL_WEBHOOK_ID = "WH-123";
  process.env.REPORT_TOKEN_SECRET = "test-secret-0123456789abcdef";
  process.env.ADMIN_KEY = "admin-key-xyz";
  process.env.SITE_URL = "https://seasoncard.app";
}
