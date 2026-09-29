import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handlePayPalWebhook } from "@/lib/webhook";
import { _resetPayPalTokenCache } from "@/lib/paypal";
import { POST as webhookRoute } from "@/app/api/paypal/webhook/route";
import { mockPayPal, setPayPalEnv } from "./helpers";

const SIG_HEADERS = {
  "paypal-transmission-id": "69cd13f0-d67a-11e5-baa3-778b53f4ae55",
  "paypal-transmission-time": "2026-09-29T10:00:00Z",
  "paypal-transmission-sig": "c2lnbmF0dXJl",
  "paypal-cert-url": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360caa42",
  "paypal-auth-algo": "SHA256withRSA",
};

const captureCompleted = {
  id: "WH-EVT-1",
  event_type: "PAYMENT.CAPTURE.COMPLETED",
  create_time: "2026-09-29T10:00:00Z",
  resource_type: "capture",
  resource: {
    id: "3C679366HH908993F",
    status: "COMPLETED",
    amount: { value: "14.98", currency_code: "USD" },
    custom_id: "sc1|soft-autumn|1|66:3,50:2,14:0,14:0|C9A084,6E583E,5C4230",
    supplementary_data: { related_ids: { order_id: "5O190127TN364715T" } },
    payee: { email_address: "merchant@example.com" },
  },
};

const refundEvent = {
  id: "WH-EVT-2",
  event_type: "PAYMENT.CAPTURE.REFUNDED",
  resource: {
    id: "1JU08902781691411",
    status: "COMPLETED",
    amount: { value: "14.98", currency_code: "USD" },
    links: [{ rel: "up", href: "https://api.sandbox.paypal.com/v2/payments/captures/3C679366HH908993F" }],
  },
};

function verifyResponder(status: "SUCCESS" | "FAILURE") {
  return mockPayPal((url) => (url.endsWith("/v1/notifications/verify-webhook-signature") ? { body: { verification_status: status } } : undefined));
}

let logs: string[];
beforeEach(() => {
  setPayPalEnv();
  _resetPayPalTokenCache();
  logs = [];
  vi.spyOn(console, "log").mockImplementation((l: string) => void logs.push(l));
  vi.spyOn(console, "warn").mockImplementation((l: string) => void logs.push(l));
  vi.spyOn(console, "error").mockImplementation((l: string) => void logs.push(l));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("PayPal webhook handler", () => {
  it("verifies the signature with PayPal and logs a ledger line for CAPTURE.COMPLETED", async () => {
    const { calls } = verifyResponder("SUCCESS");
    const res = await handlePayPalWebhook(JSON.stringify(captureCompleted), new Headers(SIG_HEADERS));
    expect(res.status).toBe(200);

    const verify = calls.find((c) => c.url.endsWith("/v1/notifications/verify-webhook-signature"))!;
    expect(verify.url.startsWith("https://api-m.sandbox.paypal.com")).toBe(true);
    expect(verify.body).toMatchObject({
      webhook_id: "WH-123",
      transmission_id: SIG_HEADERS["paypal-transmission-id"],
      transmission_sig: SIG_HEADERS["paypal-transmission-sig"],
      cert_url: SIG_HEADERS["paypal-cert-url"],
      auth_algo: SIG_HEADERS["paypal-auth-algo"],
      transmission_time: SIG_HEADERS["paypal-transmission-time"],
      webhook_event: captureCompleted,
    });

    const ledger = logs.map((l) => JSON.parse(l)).find((l) => l.event === "ledger");
    expect(ledger).toMatchObject({ kind: "sale", captureId: "3C679366HH908993F", orderId: "5O190127TN364715T", amount: "14.98", currency: "USD" });
    expect(logs.join("\n")).not.toContain("@example.com");
  });

  it("extracts the capture id for REFUNDED events", async () => {
    verifyResponder("SUCCESS");
    const res = await handlePayPalWebhook(JSON.stringify(refundEvent), new Headers(SIG_HEADERS));
    expect(res.status).toBe(200);
    const ledger = logs.map((l) => JSON.parse(l)).find((l) => l.event === "ledger");
    expect(ledger).toMatchObject({ kind: "refund", captureId: "3C679366HH908993F", refundId: "1JU08902781691411" });
  });

  it.each(["PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.REVERSED"])("handles %s", async (type) => {
    verifyResponder("SUCCESS");
    const res = await handlePayPalWebhook(JSON.stringify({ ...captureCompleted, event_type: type }), new Headers(SIG_HEADERS));
    expect(res.status).toBe(200);
    expect(logs.some((l) => l.includes(type))).toBe(true);
  });

  it("rejects events PayPal does not verify", async () => {
    verifyResponder("FAILURE");
    const res = await handlePayPalWebhook(JSON.stringify(captureCompleted), new Headers(SIG_HEADERS));
    expect(res.status).toBe(401);
    expect(logs.some((l) => l.includes('"event":"ledger"'))).toBe(false);
  });

  it("rejects requests without signature headers before calling PayPal", async () => {
    const { fn } = verifyResponder("SUCCESS");
    const res = await handlePayPalWebhook(JSON.stringify(captureCompleted), new Headers({}));
    expect(res.status).toBe(400);
    expect(fn).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON", async () => {
    verifyResponder("SUCCESS");
    expect((await handlePayPalWebhook("{nope", new Headers(SIG_HEADERS))).status).toBe(400);
  });

  it("acknowledges verified events it does not handle", async () => {
    verifyResponder("SUCCESS");
    const res = await handlePayPalWebhook(JSON.stringify({ id: "x", event_type: "CHECKOUT.ORDER.APPROVED", resource: {} }), new Headers(SIG_HEADERS));
    expect(res).toEqual({ status: 200, body: { ok: true, ignored: true } });
  });

  it("route returns 503 when PAYPAL_WEBHOOK_ID is missing so PayPal retries later", async () => {
    delete process.env.PAYPAL_WEBHOOK_ID;
    verifyResponder("SUCCESS");
    const req = new Request("https://seasoncard.app/api/paypal/webhook", { method: "POST", headers: SIG_HEADERS, body: JSON.stringify(captureCompleted) });
    const res = await webhookRoute(req);
    expect(res.status).toBe(503);
  });

  it("route returns 200 for a verified event", async () => {
    verifyResponder("SUCCESS");
    const req = new Request("https://seasoncard.app/api/paypal/webhook", { method: "POST", headers: SIG_HEADERS, body: JSON.stringify(captureCompleted) });
    const res = await webhookRoute(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
