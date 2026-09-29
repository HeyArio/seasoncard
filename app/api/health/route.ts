import { isPayPalConfigured, optionalEnv, paypalEnv } from "@/lib/env";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Public, secret-free status used to verify deploys remotely. */
export function GET() {
  return json({
    ok: true,
    version: process.env.GIT_SHA || "dev",
    paypalConfigured: isPayPalConfigured(),
    paypalMode: paypalEnv(),
    webhookRegistered: Boolean(optionalEnv("PAYPAL_WEBHOOK_ID")),
    time: new Date().toISOString(),
  });
}
