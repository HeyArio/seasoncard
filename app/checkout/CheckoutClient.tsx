"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadResult, rememberReport } from "@/lib/result-store";
import type { StoredResult } from "@/lib/schemas";
import { getSeason } from "@/lib/seasons";
import { computeOrder, cents, CAPSULE_PRICE_CENTS, REPORT_PRICE_CENTS } from "@/lib/pricing";
import { IconShield } from "@/components/Icons";
import { SUPPORT_EMAIL } from "@/lib/site";

/* Minimal typings for the parts of the PayPal JS SDK we use. */
interface PayPalButtonsInstance {
  isEligible(): boolean;
  render(el: HTMLElement): Promise<void>;
  close?(): Promise<void>;
}
interface PayPalNamespace {
  FUNDING: { PAYPAL: string; CARD: string };
  Buttons(opts: Record<string, unknown>): PayPalButtonsInstance;
}
declare global {
  interface Window { paypal?: PayPalNamespace }
}

let sdkPromise: Promise<PayPalNamespace> | null = null;
function loadPayPalSdk(clientId: string): Promise<PayPalNamespace> {
  if (window.paypal) return Promise.resolve(window.paypal);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      "client-id": clientId,
      currency: "USD",
      intent: "capture",
      components: "buttons,funding-eligibility",
      "disable-funding": "paylater,venmo",
    });
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?${params}`;
    s.async = true;
    s.dataset.pageType = "checkout";
    s.onload = () => (window.paypal ? resolve(window.paypal) : reject(new Error("PayPal SDK missing")));
    s.onerror = () => { sdkPromise = null; reject(new Error("PayPal SDK failed to load")); };
    document.head.appendChild(s);
  });
  return sdkPromise;
}

type Status =
  | { kind: "ready" }
  | { kind: "processing" }
  | { kind: "pending"; orderId: string }
  | { kind: "error"; message: string; orderId?: string }
  | { kind: "cancelled" };

export default function CheckoutClient({ paypalClientId }: { paypalClientId: string }) {
  const [result, setResult] = useState<StoredResult | null | undefined>(undefined);
  const [capsule, setCapsule] = useState(true);
  const [status, setStatus] = useState<Status>({ kind: "ready" });
  const [sdkState, setSdkState] = useState<"loading" | "ready" | "failed">("loading");
  const capsuleRef = useRef(capsule);
  const paypalRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => setResult(loadResult()), []);
  useEffect(() => { capsuleRef.current = capsule; }, [capsule]);

  async function capture(orderId: string, actions?: { restart?: () => Promise<void> }) {
    setStatus({ kind: "processing" });
    try {
      const res = await fetch("/api/paypal/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 402 && data.error === "INSTRUMENT_DECLINED" && actions?.restart) {
        setStatus({ kind: "ready" });
        return actions.restart();
      }
      if (res.status === 202) {
        setStatus({ kind: "pending", orderId });
        return;
      }
      if (!res.ok || !data.url) throw new Error(data.message || "Capture failed");
      rememberReport(data.url);
      window.location.assign(data.url);
    } catch {
      setStatus({
        kind: "error",
        orderId,
        message: `We couldn't confirm your payment yet. Tap "Try again" and we'll re-check with PayPal. You won't be charged twice. If it keeps failing, email ${SUPPORT_EMAIL} with your PayPal receipt.`,
      });
    }
  }

  useEffect(() => {
    if (!result || !paypalClientId) return;
    let cancelled = false;
    const instances: PayPalButtonsInstance[] = [];
    loadPayPalSdk(paypalClientId)
      .then((paypal) => {
        if (cancelled) return;
        const common = {
          style: { shape: "pill", height: 50, label: "pay" },
          createOrder: async () => {
            setStatus({ kind: "ready" });
            const res = await fetch("/api/paypal/create-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ season: result.season, metrics: result.metrics, samples: result.samples, capsule: capsuleRef.current }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.id) throw new Error(data.error || "create-order failed");
            return data.id as string;
          },
          onApprove: async (data: { orderID: string }, actions: { restart?: () => Promise<void> }) => capture(data.orderID, actions),
          onCancel: () => setStatus({ kind: "cancelled" }),
          onError: () => setStatus({ kind: "error", message: "PayPal couldn't start the payment. Please try again in a moment." }),
        };
        const sources: [string, HTMLDivElement | null][] = [
          [paypal.FUNDING.PAYPAL, paypalRef.current],
          [paypal.FUNDING.CARD, cardRef.current],
        ];
        for (const [fundingSource, el] of sources) {
          if (!el) continue;
          const btn = paypal.Buttons({ ...common, fundingSource });
          if (btn.isEligible()) {
            instances.push(btn);
            void btn.render(el);
          }
        }
        setSdkState("ready");
      })
      .catch(() => !cancelled && setSdkState("failed"));
    return () => {
      cancelled = true;
      instances.forEach((b) => b.close?.().catch(() => undefined));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, paypalClientId]);

  if (result === undefined) return <div style={{ minHeight: "60vh" }} aria-busy="true" />;
  if (result === null) {
    return (
      <div className="card card-lg center" style={{ marginTop: 24 }}>
        <h1 style={{ fontSize: "1.9rem" }}>Scan first</h1>
        <p className="muted" style={{ marginTop: 10 }}>Your report is built from your scan. It takes ten seconds and it&apos;s free.</p>
        <Link href="/scan" className="btn btn-primary btn-block" style={{ marginTop: 20 }}>Take the free scan</Link>
      </div>
    );
  }

  const { season } = getSeason(result.season);
  const order = computeOrder(capsule);

  return (
    <div>
      <h1 style={{ fontSize: "2.1rem", marginTop: 12 }}>Unlock your report</h1>
      <p className="muted" style={{ marginTop: 8 }}>Instant access. No account needed.</p>

      <section className="card" style={{ marginTop: 20 }} aria-label="Order summary">
        <div className="summary-row">
          <div>
            <strong>Full Season Report</strong>
            <div className="muted small">{season.name} · palette, makeup, metals, styling</div>
          </div>
          <span>${cents(REPORT_PRICE_CENTS)}</span>
        </div>
        {capsule ? (
          <div className="summary-row">
            <div>
              <strong>Capsule Wardrobe</strong>
              <div className="muted small">30 pieces in your colours</div>
            </div>
            <span>${cents(CAPSULE_PRICE_CENTS)}</span>
          </div>
        ) : null}
        <div className="summary-row summary-total">
          <span>Total</span>
          <span>${order.total} USD</span>
        </div>
      </section>

      <label className="addon" style={{ marginTop: 14 }}>
        <input type="checkbox" checked={capsule} onChange={(e) => setCapsule(e.target.checked)} />
        <span>
          <strong>Add the Capsule Wardrobe +$4.99</strong>
          <span className="muted small" style={{ display: "block", marginTop: 2 }}>
            30 wardrobe pieces matched to your palette, each with a shopping search link.
          </span>
        </span>
      </label>

      <div className="guarantee" style={{ marginTop: 14 }}>
        <IconShield width={24} height={24} />
        <div>
          <strong>7-day guarantee</strong>
          <p className="small" style={{ marginTop: 2 }}>
            Doesn&apos;t feel like you? Refund in one click from your report page within 7 days. No forms, no questions.
          </p>
        </div>
      </div>

      <section style={{ marginTop: 20 }} aria-label="Payment">
        {status.kind === "processing" ? (
          <div className="card center" role="status" aria-live="polite">
            <div className="spinner" />
            <p style={{ marginTop: 12, fontWeight: 700 }}>Confirming your payment…</p>
            <p className="muted small">Please keep this page open.</p>
          </div>
        ) : null}
        {status.kind === "pending" ? (
          <div className="alert alert-info" role="status">
            PayPal is still processing this payment. This usually takes under a minute.
            <button type="button" className="btn btn-secondary btn-sm btn-block" style={{ marginTop: 10 }} onClick={() => capture(status.orderId)}>
              Check again
            </button>
          </div>
        ) : null}
        {status.kind === "error" ? (
          <div className="alert" role="alert" style={{ marginBottom: 12 }}>
            {status.message}
            {status.orderId ? (
              <button type="button" className="btn btn-secondary btn-sm btn-block" style={{ marginTop: 10 }} onClick={() => capture(status.orderId!)}>
                Try again
              </button>
            ) : null}
          </div>
        ) : null}
        {status.kind === "cancelled" ? <div className="alert alert-info" role="status" style={{ marginBottom: 12 }}>Payment cancelled. You haven&apos;t been charged.</div> : null}

        {!paypalClientId ? (
          <div className="alert" role="alert">Payments aren&apos;t configured yet. Please check back soon.</div>
        ) : (
          <div style={{ display: status.kind === "processing" ? "none" : "block" }}>
            {sdkState === "loading" ? <p className="muted small center">Loading secure checkout…</p> : null}
            {sdkState === "failed" ? (
              <div className="alert" role="alert">PayPal checkout couldn&apos;t load. Check your connection or disable content blockers, then refresh.</div>
            ) : null}
            <div ref={paypalRef} className="paypal-slot-part" />
            <div ref={cardRef} className="paypal-slot-part" style={{ marginTop: 4 }} />
          </div>
        )}
        <p className="fineprint">
          Sold by Nazarban Analytics FZCO. By paying you agree to the <Link href="/terms">Terms</Link> and{" "}
          <Link href="/refund">Refund policy</Link>.
        </p>
      </section>
    </div>
  );
}
