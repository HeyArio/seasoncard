import "server-only";
import { requireEnv } from "./env";
import { paypalFetch } from "./paypal";
import { log } from "./http";

export const WEBHOOK_EVENT_TYPES = [
  "PAYMENT.CAPTURE.COMPLETED",
  "PAYMENT.CAPTURE.REFUNDED",
  "PAYMENT.CAPTURE.DENIED",
  "PAYMENT.CAPTURE.REVERSED",
] as const;

const REQUIRED_HEADERS = [
  "paypal-transmission-id",
  "paypal-transmission-time",
  "paypal-transmission-sig",
  "paypal-cert-url",
  "paypal-auth-algo",
] as const;

interface WebhookEvent {
  id?: string;
  event_type?: string;
  create_time?: string;
  resource_type?: string;
  resource?: {
    id?: string;
    status?: string;
    amount?: { value?: string; currency_code?: string };
    custom_id?: string;
    create_time?: string;
    supplementary_data?: { related_ids?: { order_id?: string } };
    links?: { rel?: string; href?: string }[];
  };
}

export interface WebhookResult {
  status: number;
  body: Record<string, unknown>;
}

/** Capture id a refund belongs to (from the refund resource's "up" link). */
function captureIdFromLinks(links?: { rel?: string; href?: string }[]): string | undefined {
  const up = links?.find((l) => l.rel === "up" && l.href?.includes("/captures/"));
  return up?.href?.split("/captures/")[1]?.split(/[/?]/)[0];
}

/**
 * Verify a PayPal webhook through /v1/notifications/verify-webhook-signature and write a
 * structured ledger line for the payment events we care about. Only non-PII fields are logged.
 */
export async function handlePayPalWebhook(rawBody: string, headers: Headers): Promise<WebhookResult> {
  if (rawBody.length > 256_000) return { status: 413, body: { error: "BODY_TOO_LARGE" } };
  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: "INVALID_JSON" } };
  }
  if (!event || typeof event !== "object" || typeof event.event_type !== "string") {
    return { status: 400, body: { error: "INVALID_EVENT" } };
  }
  const h: Record<string, string> = {};
  for (const k of REQUIRED_HEADERS) {
    const v = headers.get(k);
    if (!v) return { status: 400, body: { error: "MISSING_SIGNATURE_HEADERS" } };
    h[k] = v;
  }

  const webhookId = requireEnv("PAYPAL_WEBHOOK_ID");
  const verification = await paypalFetch<{ verification_status?: string }>("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    timeoutMs: 8_000,
    body: {
      auth_algo: h["paypal-auth-algo"],
      cert_url: h["paypal-cert-url"],
      transmission_id: h["paypal-transmission-id"],
      transmission_sig: h["paypal-transmission-sig"],
      transmission_time: h["paypal-transmission-time"],
      webhook_id: webhookId,
      webhook_event: event,
    },
  });

  if (verification.verification_status !== "SUCCESS") {
    log("warn", "paypal.webhook.rejected", { eventId: event.id, eventType: event.event_type, transmissionId: h["paypal-transmission-id"] });
    return { status: 401, body: { error: "SIGNATURE_VERIFICATION_FAILED" } };
  }

  const r = event.resource ?? {};
  const type = event.event_type;
  if (!(WEBHOOK_EVENT_TYPES as readonly string[]).includes(type)) {
    log("info", "paypal.webhook.ignored", { eventId: event.id, eventType: type });
    return { status: 200, body: { ok: true, ignored: true } };
  }

  const isRefund = type === "PAYMENT.CAPTURE.REFUNDED";
  log("info", "ledger", {
    source: "paypal.webhook",
    eventId: event.id,
    eventType: type,
    kind: { "PAYMENT.CAPTURE.COMPLETED": "sale", "PAYMENT.CAPTURE.REFUNDED": "refund", "PAYMENT.CAPTURE.DENIED": "denied", "PAYMENT.CAPTURE.REVERSED": "reversal" }[type],
    captureId: isRefund ? captureIdFromLinks(r.links) : r.id,
    refundId: isRefund ? r.id : undefined,
    orderId: r.supplementary_data?.related_ids?.order_id,
    status: r.status,
    amount: r.amount?.value,
    currency: r.amount?.currency_code,
    customId: r.custom_id,
    resourceTime: r.create_time,
    eventTime: event.create_time,
  });
  return { status: 200, body: { ok: true } };
}
