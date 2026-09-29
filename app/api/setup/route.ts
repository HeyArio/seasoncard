import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ensureWebhook } from "@/lib/admin";
import { isPayPalConfigured, optionalEnv, writeSettings } from "@/lib/env";
import { HttpError, errorResponse, json, log, readBody } from "@/lib/http";
import { _resetPayPalTokenCache, getAccessToken } from "@/lib/paypal";

export const dynamic = "force-dynamic";

const Body = z.object({
  code: z.string().trim().min(4).max(64),
  clientId: z.string().trim().min(10).max(200),
  secret: z.string().trim().min(10).max(200),
  mode: z.enum(["live", "sandbox"]),
});

// Simple brute-force guard: 8 wrong codes locks setup until the container restarts.
let failures = 0;
const MAX_FAILURES = 8;

const h = (s: string) => createHash("sha256").update(s.replace(/[\s-]/g, "").toUpperCase(), "utf8").digest();

export async function POST(req: Request) {
  try {
    if (isPayPalConfigured()) throw new HttpError(409, "ALREADY_CONFIGURED", "PayPal is already set up.");
    if (failures >= MAX_FAILURES) throw new HttpError(429, "LOCKED", "Too many wrong codes. Restart the app on the server to try again.");
    const expected = optionalEnv("SETUP_CODE");
    if (!expected) throw new HttpError(503, "SETUP_DISABLED", "No setup code on this server.");
    const body = await readBody(req, Body);
    if (!timingSafeEqual(h(body.code), h(expected))) {
      failures++;
      log("warn", "setup.bad_code", { failures });
      throw new HttpError(401, "WRONG_CODE", "That setup code is not right.");
    }

    // Verify the keys with PayPal before saving anything.
    writeSettings({ PAYPAL_CLIENT_ID: body.clientId, PAYPAL_CLIENT_SECRET: body.secret, PAYPAL_ENV: body.mode });
    _resetPayPalTokenCache();
    try {
      await getAccessToken();
    } catch (e) {
      writeSettings({ PAYPAL_CLIENT_ID: "", PAYPAL_CLIENT_SECRET: "" });
      _resetPayPalTokenCache();
      log("warn", "setup.paypal_rejected", {});
      throw new HttpError(400, "PAYPAL_REJECTED", `PayPal did not accept these ${body.mode} keys. Check the Live/Sandbox toggle and copy them again.`);
    }

    const hook = await ensureWebhook();
    writeSettings({ PAYPAL_WEBHOOK_ID: hook.webhookId });
    log("info", "setup.done", { env: body.mode, webhookId: hook.webhookId, created: hook.created });
    return json({ ok: true, mode: body.mode, webhookId: hook.webhookId });
  } catch (err) {
    return errorResponse(err, "setup");
  }
}
