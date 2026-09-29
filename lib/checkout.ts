import "server-only";
import { computeOrder, cents, CURRENCY, expectedTotal } from "./pricing";
import { encodeOrderMeta, decodeOrderMeta } from "./order-meta";
import { paypalFetch, PayPalError, type PayPalCapture, type PayPalOrder } from "./paypal";
import { signReportToken } from "./report-token";
import type { CreateOrderBody, ReportPayload } from "./schemas";
import { HttpError, log } from "./http";

const SEASON_NAMES: Record<string, string> = {
  "light-spring": "Light Spring", "true-spring": "True Spring", "bright-spring": "Bright Spring",
  "light-summer": "Light Summer", "true-summer": "True Summer", "soft-summer": "Soft Summer",
  "soft-autumn": "Soft Autumn", "true-autumn": "True Autumn", "deep-autumn": "Deep Autumn",
  "deep-winter": "Deep Winter", "true-winter": "True Winter", "bright-winter": "Bright Winter",
};

/** Build the PayPal Orders v2 request. Amount is computed here, never taken from the client. */
export function buildOrderRequest(body: CreateOrderBody) {
  const { items, total } = computeOrder(body.capsule);
  return {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: "season-card",
        description: `Season Card: ${SEASON_NAMES[body.season]} full report${body.capsule ? " + capsule wardrobe" : ""}`,
        custom_id: encodeOrderMeta(body),
        soft_descriptor: "SEASONCARD",
        amount: {
          currency_code: CURRENCY,
          value: total,
          breakdown: { item_total: { currency_code: CURRENCY, value: total } },
        },
        items: items.map((i) => ({
          name: i.name,
          description: i.description,
          sku: i.sku,
          quantity: String(i.quantity),
          category: "DIGITAL_GOODS",
          unit_amount: { currency_code: CURRENCY, value: cents(i.unitCents) },
        })),
      },
    ],
    application_context: {
      brand_name: "Season Card",
      shipping_preference: "NO_SHIPPING",
      user_action: "PAY_NOW",
    },
  };
}

export async function createOrder(body: CreateOrderBody): Promise<{ id: string; total: string }> {
  const req = buildOrderRequest(body);
  const order = await paypalFetch<PayPalOrder>("/v2/checkout/orders", { method: "POST", body: req });
  log("info", "order.created", { orderId: order.id, season: body.season, capsule: body.capsule, amount: req.purchase_units[0].amount.value });
  return { id: order.id, total: req.purchase_units[0].amount.value };
}

export type CaptureOutcome =
  | { kind: "completed"; token: string; payload: ReportPayload }
  | { kind: "pending"; status: string }
  | { kind: "declined" };

export async function captureOrder(orderId: string): Promise<CaptureOutcome> {
  let order: PayPalOrder;
  try {
    order = await paypalFetch<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: "POST",
      body: {},
      requestId: `capture-${orderId}`,
    });
  } catch (e) {
    if (e instanceof PayPalError && e.issue === "INSTRUMENT_DECLINED") return { kind: "declined" };
    if (e instanceof PayPalError && e.issue === "ORDER_ALREADY_CAPTURED") {
      order = await paypalFetch<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
    } else if (e instanceof PayPalError && (e.status === 404 || e.issue === "INVALID_RESOURCE_ID")) {
      throw new HttpError(404, "ORDER_NOT_FOUND");
    } else {
      throw e;
    }
  }

  const pu = order.purchase_units?.[0];
  let capture: PayPalCapture | undefined = pu?.payments?.captures?.[0];
  if (!capture) return { kind: "pending", status: order.status };

  if (capture.status !== "COMPLETED") {
    // Idempotent replays return the original response; ask for the capture's fresh status.
    capture = await paypalFetch<PayPalCapture>(`/v2/payments/captures/${encodeURIComponent(capture.id)}`);
    if (capture.status === "DECLINED" || capture.status === "FAILED") return { kind: "declined" };
    if (capture.status !== "COMPLETED") return { kind: "pending", status: capture.status };
  }

  let meta = decodeOrderMeta(capture.custom_id ?? pu?.custom_id);
  let payerEmail = order.payer?.email_address ?? null;
  if (!meta) {
    const full = await paypalFetch<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
    meta = decodeOrderMeta(full.purchase_units?.[0]?.custom_id);
    payerEmail = payerEmail ?? full.payer?.email_address ?? null;
  }
  if (!meta) {
    log("error", "capture.missing_meta", { orderId, captureId: capture.id });
    throw new HttpError(409, "ORDER_NOT_RECOGNISED");
  }

  const expected = expectedTotal(meta.capsule);
  if (capture.amount.currency_code !== CURRENCY || capture.amount.value !== expected) {
    log("error", "capture.amount_mismatch", { orderId, captureId: capture.id, got: capture.amount, expected });
    throw new HttpError(409, "AMOUNT_MISMATCH");
  }

  const payload: ReportPayload = {
    orderId: order.id,
    captureId: capture.id,
    season: meta.season,
    metrics: meta.metrics,
    samples: meta.samples,
    capsule: meta.capsule,
    amount: capture.amount.value,
    paidAt: capture.create_time ?? new Date().toISOString(),
    payerEmail,
  };
  log("info", "order.captured", { orderId: order.id, captureId: capture.id, season: meta.season, capsule: meta.capsule, amount: capture.amount.value });
  return { kind: "completed", token: signReportToken(payload), payload };
}
