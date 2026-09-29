import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as createOrderRoute } from "@/app/api/paypal/create-order/route";
import { POST as captureRoute } from "@/app/api/paypal/capture/route";
import { POST as refundRoute } from "@/app/api/refund/route";
import { POST as setupRoute } from "@/app/api/admin/setup/route";
import { GET as summaryRoute } from "@/app/api/admin/summary/route";
import { _resetPayPalTokenCache } from "@/lib/paypal";
import { signReportToken, verifyReportToken } from "@/lib/report-token";
import { encodeOrderMeta } from "@/lib/order-meta";
import { mockPayPal, setPayPalEnv } from "./helpers";
import type { CreateOrderBody, ReportPayload } from "@/lib/schemas";

const body: CreateOrderBody = {
  season: "soft-autumn",
  metrics: {
    undertone: { score: 0.66, label: "Warm-neutral" },
    depth: { score: 0.5, label: "Medium" },
    contrast: { score: 0.14, label: "Low" },
    chroma: { score: 0.14, label: "Soft" },
  },
  samples: { skin: "#C9A084", eyes: "#6E583E", hair: "#5C4230" },
  capsule: true,
};
const post = (url: string, data: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://seasoncard.app${url}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(data) });

beforeEach(() => {
  setPayPalEnv();
  _resetPayPalTokenCache();
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("POST /api/paypal/create-order", () => {
  it("creates an order with the server-computed amount", async () => {
    const { calls } = mockPayPal((url) => (url.endsWith("/v2/checkout/orders") ? { status: 201, body: { id: "ORDER123", status: "CREATED" } } : undefined));
    const res = await createOrderRoute(post("/api/paypal/create-order", body));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "ORDER123", total: "14.98", currency: "USD" });
    const sent = calls.find((c) => c.url.endsWith("/v2/checkout/orders"))!.body as { purchase_units: { amount: { value: string } }[] };
    expect(sent.purchase_units[0].amount.value).toBe("14.98");
  });

  it("rejects invalid bodies without calling PayPal", async () => {
    const { fn } = mockPayPal(() => undefined);
    const res = await createOrderRoute(post("/api/paypal/create-order", { ...body, capsule: "yes" }));
    expect(res.status).toBe(400);
    expect(fn).not.toHaveBeenCalled();
  });

  it("caches the OAuth token between calls", async () => {
    const { calls } = mockPayPal((url) => (url.endsWith("/v2/checkout/orders") ? { body: { id: "O1" } } : undefined));
    await createOrderRoute(post("/api/paypal/create-order", body));
    await createOrderRoute(post("/api/paypal/create-order", body));
    expect(calls.filter((c) => c.url.endsWith("/v1/oauth2/token"))).toHaveLength(1);
  });
});

describe("POST /api/paypal/capture", () => {
  const captured = (value: string, capsule = true) => ({
    id: "ORDER123",
    status: "COMPLETED",
    payer: { email_address: "buyer@example.com" },
    purchase_units: [
      {
        payments: {
          captures: [
            { id: "CAP1", status: "COMPLETED", amount: { currency_code: "USD", value }, create_time: "2026-09-29T10:00:00Z", custom_id: encodeOrderMeta({ ...body, capsule }) },
          ],
        },
      },
    ],
  });

  it("returns a signed report token built from PayPal's record", async () => {
    const { calls } = mockPayPal((url) => (url.endsWith("/v2/checkout/orders/ORDER123/capture") ? { status: 201, body: captured("14.98") } : undefined));
    const res = await captureRoute(post("/api/paypal/capture", { orderId: "ORDER123" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toBe(`/r/${data.token}`);
    const p = verifyReportToken(data.token)!;
    expect(p).toMatchObject({ orderId: "ORDER123", captureId: "CAP1", capsule: true, amount: "14.98", payerEmail: "buyer@example.com", season: "soft-autumn" });
    const cap = calls.find((c) => c.url.endsWith("/capture"))!;
    expect((cap.init.headers as Record<string, string>)["PayPal-Request-Id"]).toBe("capture-ORDER123");
  });

  it("refuses to issue a token when the captured amount doesn't match", async () => {
    mockPayPal((url) => (url.endsWith("/capture") ? { status: 201, body: captured("9.99", true) } : undefined));
    const res = await captureRoute(post("/api/paypal/capture", { orderId: "ORDER123" }));
    expect(res.status).toBe(409);
  });

  it("recovers an already-captured order", async () => {
    mockPayPal((url) => {
      if (url.endsWith("/capture")) return { status: 422, body: { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "ORDER_ALREADY_CAPTURED" }] } };
      if (url.endsWith("/v2/checkout/orders/ORDER123")) return { body: captured("14.98") };
      return undefined;
    });
    const res = await captureRoute(post("/api/paypal/capture", { orderId: "ORDER123" }));
    expect(res.status).toBe(200);
  });

  it("reports declined instruments", async () => {
    mockPayPal((url) => (url.endsWith("/capture") ? { status: 422, body: { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "INSTRUMENT_DECLINED" }] } } : undefined));
    const res = await captureRoute(post("/api/paypal/capture", { orderId: "ORDER123" }));
    expect(res.status).toBe(402);
  });

  it("validates the order id", async () => {
    mockPayPal(() => undefined);
    const res = await captureRoute(post("/api/paypal/capture", { orderId: "../../v1/x" }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/refund", () => {
  const payload = (paidAt: string): ReportPayload => ({
    orderId: "ORDER123", captureId: "CAP1", season: "soft-autumn", metrics: body.metrics, samples: body.samples,
    capsule: true, amount: "14.98", paidAt, payerEmail: null,
  });

  it("refunds within 7 days using the capture id as PayPal-Request-Id", async () => {
    const { calls } = mockPayPal((url) => (url.endsWith("/v2/payments/captures/CAP1/refund") ? { status: 201, body: { id: "REF1", status: "COMPLETED" } } : undefined));
    const token = signReportToken(payload(new Date(Date.now() - 86_400_000).toISOString()));
    const res = await refundRoute(post("/api/refund", { token }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "COMPLETED", refundId: "REF1" });
    const r = calls.find((c) => c.url.endsWith("/refund"))!;
    expect((r.init.headers as Record<string, string>)["PayPal-Request-Id"]).toBe("CAP1");
  });

  it("is idempotent when the capture is already refunded", async () => {
    mockPayPal((url) => (url.endsWith("/refund") ? { status: 422, body: { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "CAPTURE_FULLY_REFUNDED" }] } } : undefined));
    const token = signReportToken(payload(new Date().toISOString()));
    const res = await refundRoute(post("/api/refund", { token }));
    expect(res.status).toBe(200);
    expect((await res.json()).alreadyRefunded).toBe(true);
  });

  it("refuses after 7 days", async () => {
    const { fn } = mockPayPal(() => undefined);
    const token = signReportToken(payload(new Date(Date.now() - 8 * 86_400_000).toISOString()));
    const res = await refundRoute(post("/api/refund", { token }));
    expect(res.status).toBe(403);
    expect(fn).not.toHaveBeenCalled();
  });

  it("refuses forged tokens", async () => {
    mockPayPal(() => undefined);
    const token = signReportToken(payload(new Date().toISOString()));
    const res = await refundRoute(post("/api/refund", { token: token.slice(0, -2) + "xx" }));
    expect(res.status).toBe(400);
  });
});

describe("admin routes", () => {
  it("require the admin key", async () => {
    mockPayPal(() => undefined);
    expect((await setupRoute(post("/api/admin/setup", {}))).status).toBe(401);
    expect((await setupRoute(post("/api/admin/setup", {}, { "x-admin-key": "wrong" }))).status).toBe(401);
  });

  it("registers the webhook when none exists", async () => {
    const { calls } = mockPayPal((url, init) => {
      if (url.endsWith("/v1/notifications/webhooks") && (init.method ?? "GET") === "GET") return { body: { webhooks: [] } };
      if (url.endsWith("/v1/notifications/webhooks") && init.method === "POST") return { status: 201, body: { id: "WH-NEW", url: "", event_types: [] } };
      return undefined;
    });
    const res = await setupRoute(post("/api/admin/setup", {}, { "x-admin-key": "admin-key-xyz" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({ webhookId: "WH-NEW", created: true, url: "https://seasoncard.app/api/paypal/webhook" });
    const created = calls.find((c) => c.init.method === "POST" && c.url.endsWith("/webhooks"))!.body as { event_types: { name: string }[] };
    expect(created.event_types.map((e) => e.name)).toEqual([
      "PAYMENT.CAPTURE.COMPLETED", "PAYMENT.CAPTURE.REFUNDED", "PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.REVERSED",
    ]);
  });

  it("returns the existing webhook", async () => {
    mockPayPal((url) =>
      url.endsWith("/v1/notifications/webhooks")
        ? { body: { webhooks: [{ id: "WH-123", url: "https://seasoncard.app/api/paypal/webhook", event_types: [
            { name: "PAYMENT.CAPTURE.COMPLETED" }, { name: "PAYMENT.CAPTURE.REFUNDED" }, { name: "PAYMENT.CAPTURE.DENIED" }, { name: "PAYMENT.CAPTURE.REVERSED" },
          ] }] } }
        : undefined,
    );
    const data = await (await setupRoute(post("/api/admin/setup", {}, { "x-admin-key": "admin-key-xyz" }))).json();
    expect(data).toMatchObject({ webhookId: "WH-123", created: false, updated: false, envVarMatches: true });
  });

  it("summarises revenue from Transaction Search", async () => {
    const now = new Date();
    mockPayPal((url) =>
      url.includes("/v1/reporting/transactions")
        ? { body: { total_pages: 1, transaction_details: [
            { transaction_info: { transaction_event_code: "T0006", transaction_status: "S", transaction_initiation_date: now.toISOString(), transaction_amount: { currency_code: "USD", value: "14.98" }, fee_amount: { currency_code: "USD", value: "-0.82" } } },
            { transaction_info: { transaction_event_code: "T0006", transaction_status: "S", transaction_initiation_date: now.toISOString(), transaction_amount: { currency_code: "USD", value: "9.99" }, fee_amount: { currency_code: "USD", value: "-0.64" } } },
            { transaction_info: { transaction_event_code: "T1107", transaction_status: "S", transaction_initiation_date: now.toISOString(), transaction_amount: { currency_code: "USD", value: "-9.99" } } },
          ] } }
        : undefined,
    );
    const res = await summaryRoute(new Request("https://seasoncard.app/api/admin/summary", { headers: { "x-admin-key": "admin-key-xyz" } }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.last7Days).toMatchObject({ sales: 2, grossUsd: "24.97", refundsUsd: "9.99", feesUsd: "-1.46", netUsd: "13.52" });
  });

  it("degrades gracefully when Transaction Search is not authorised", async () => {
    mockPayPal((url) => (url.includes("/v1/reporting/transactions") ? { status: 403, body: { name: "NOT_AUTHORIZED", message: "no" } } : undefined));
    const res = await summaryRoute(new Request("https://seasoncard.app/api/admin/summary", { headers: { "x-admin-key": "admin-key-xyz" } }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("TRANSACTION_SEARCH_NOT_AUTHORIZED");
  });
});
