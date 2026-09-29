import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isPayPalConfigured, optionalEnv, paypalEnv } from "@/lib/env";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

function version(): string {
  if (process.env.GIT_SHA) return process.env.GIT_SHA;
  try {
    return readFileSync(/*turbopackIgnore: true*/ join(process.cwd(), "VERSION"), "utf8").trim();
  } catch {
    return "dev";
  }
}

/** Public, secret-free status used to verify deploys remotely. */
export function GET() {
  return json({
    ok: true,
    version: version(),
    paypalConfigured: isPayPalConfigured(),
    paypalMode: paypalEnv(),
    webhookRegistered: Boolean(optionalEnv("PAYPAL_WEBHOOK_ID")),
    time: new Date().toISOString(),
  });
}
