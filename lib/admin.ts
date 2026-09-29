import "server-only";
import { optionalEnv, paypalEnv, siteUrl } from "./env";
import { paypalFetch } from "./paypal";
import { HttpError, log } from "./http";
import { WEBHOOK_EVENT_TYPES } from "./webhook";

interface PayPalWebhook {
  id: string;
  url: string;
  event_types: { name: string }[];
}

export async function ensureWebhook() {
  const url = `${siteUrl()}/api/paypal/webhook`;
  if (!url.startsWith("https://")) {
    throw new HttpError(400, "SITE_URL_NOT_HTTPS", "PayPal only delivers webhooks to https URLs. Set SITE_URL to your https origin.", { url });
  }
  const list = await paypalFetch<{ webhooks?: PayPalWebhook[] }>("/v1/notifications/webhooks");
  const existing = list.webhooks?.find((w) => w.url.replace(/\/+$/, "") === url);
  const wanted = [...WEBHOOK_EVENT_TYPES];

  let webhookId: string;
  let created = false;
  let updated = false;
  if (existing) {
    webhookId = existing.id;
    const have = new Set(existing.event_types.map((e) => e.name));
    if (!have.has("*") && wanted.some((w) => !have.has(w))) {
      const merged = Array.from(new Set([...have, ...wanted]));
      await paypalFetch(`/v1/notifications/webhooks/${encodeURIComponent(existing.id)}`, {
        method: "PATCH",
        body: [{ op: "replace", path: "/event_types", value: merged.map((name) => ({ name })) }],
      });
      updated = true;
    }
  } else {
    const hook = await paypalFetch<PayPalWebhook>("/v1/notifications/webhooks", {
      method: "POST",
      body: { url, event_types: wanted.map((name) => ({ name })) },
    });
    webhookId = hook.id;
    created = true;
  }
  const current = optionalEnv("PAYPAL_WEBHOOK_ID");
  log("info", "admin.webhook_setup", { webhookId, created, updated, env: paypalEnv() });
  return {
    webhookId,
    url,
    env: paypalEnv(),
    created,
    updated,
    eventTypes: wanted,
    envVarMatches: current === webhookId,
    next: current === webhookId ? "PAYPAL_WEBHOOK_ID already matches." : `Set PAYPAL_WEBHOOK_ID=${webhookId} and redeploy.`,
  };
}

interface TxnInfo {
  transaction_id?: string;
  transaction_event_code?: string;
  transaction_status?: string;
  transaction_initiation_date?: string;
  transaction_amount?: { currency_code?: string; value?: string };
  fee_amount?: { currency_code?: string; value?: string };
}

export interface RevenueWindow {
  from: string;
  to: string;
  sales: number;
  grossUsd: string;
  refundsUsd: string;
  feesUsd: string;
  netUsd: string;
  refundCount: number;
}

const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

async function fetchTransactions(from: Date, to: Date): Promise<TxnInfo[]> {
  const out: TxnInfo[] = [];
  for (let page = 1; page <= 20; page++) {
    const qs = new URLSearchParams({
      start_date: iso(from),
      end_date: iso(to),
      fields: "transaction_info",
      page_size: "500",
      page: String(page),
    });
    const res = await paypalFetch<{ transaction_details?: { transaction_info?: TxnInfo }[]; total_pages?: number }>(
      `/v1/reporting/transactions?${qs}`,
    );
    for (const d of res.transaction_details ?? []) if (d.transaction_info) out.push(d.transaction_info);
    if (!res.total_pages || page >= res.total_pages) break;
  }
  return out;
}

export function summarise(txns: TxnInfo[], from: Date, to: Date): RevenueWindow {
  let gross = 0, refunds = 0, fees = 0, sales = 0, refundCount = 0;
  for (const t of txns) {
    const t0 = t.transaction_initiation_date ? Date.parse(t.transaction_initiation_date) : NaN;
    if (!Number.isNaN(t0) && (t0 < from.getTime() || t0 > to.getTime())) continue;
    if (t.transaction_amount?.currency_code && t.transaction_amount.currency_code !== "USD") continue;
    const amt = Math.round(Number(t.transaction_amount?.value ?? 0) * 100);
    const fee = Math.round(Number(t.fee_amount?.value ?? 0) * 100);
    const code = t.transaction_event_code ?? "";
    if (code === "T1107" || code === "T1106" || code === "T1201") {
      // refunds / reversals / chargebacks
      refunds += Math.abs(amt);
      fees += fee;
      refundCount++;
    } else if (code.startsWith("T00") && amt > 0 && t.transaction_status === "S") {
      gross += amt;
      fees += fee;
      sales++;
    }
  }
  const f = (c: number) => (c / 100).toFixed(2);
  return { from: iso(from), to: iso(to), sales, grossUsd: f(gross), refundsUsd: f(refunds), feesUsd: f(fees), netUsd: f(gross - refunds + fees), refundCount };
}

export async function revenueSummary(now = new Date()) {
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const txns = await fetchTransactions(weekAgo, now);
  return {
    env: paypalEnv(),
    generatedAt: iso(now),
    note: "PayPal Transaction Search data can lag by up to ~3 hours. Times are UTC.",
    today: summarise(txns, startOfToday, now),
    last7Days: summarise(txns, weekAgo, now),
  };
}
