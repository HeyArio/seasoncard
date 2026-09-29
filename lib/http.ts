import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import type { z } from "zod";
import { MissingEnvError, optionalEnv } from "./env";
import { PayPalError } from "./paypal";

export const json = (body: unknown, status = 200, headers?: Record<string, string>) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

export class HttpError extends Error {
  constructor(public status: number, public code: string, message?: string, public extra?: Record<string, unknown>) {
    super(message ?? code);
  }
}

/** Read a JSON body with a size cap and validate it with a zod schema. */
export async function readBody<T extends z.ZodType>(req: Request, schema: T, maxBytes = 8_192): Promise<z.infer<T>> {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, "BODY_TOO_LARGE");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new HttpError(400, "INVALID_JSON");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new HttpError(400, "INVALID_INPUT", "Invalid request body", {
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  return parsed.data;
}

function sha256(s: string) {
  return createHash("sha256").update(s, "utf8").digest();
}

/** Constant-time check of the x-admin-key header against ADMIN_KEY. */
export function assertAdmin(req: Request) {
  const expected = optionalEnv("ADMIN_KEY");
  if (!expected) throw new HttpError(503, "ADMIN_KEY_NOT_CONFIGURED");
  const given = req.headers.get("x-admin-key") ?? "";
  if (!timingSafeEqual(sha256(given), sha256(expected))) throw new HttpError(401, "UNAUTHORIZED");
}

export function log(level: "info" | "warn" | "error", event: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ level, event, ts: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/** Map any thrown error to a safe JSON response (no stack traces or secrets). */
export function errorResponse(err: unknown, route: string): Response {
  if (err instanceof HttpError) return json({ error: err.code, message: err.message, ...err.extra }, err.status);
  if (err instanceof MissingEnvError) {
    log("error", "config.missing_env", { route, key: err.key });
    return json({ error: "SERVER_NOT_CONFIGURED", message: "The server is missing configuration." }, 503);
  }
  if (err instanceof PayPalError) {
    log("error", "paypal.error", { route, status: err.status, name: err.name_, issue: err.issue, debugId: err.debugId });
    return json({ error: "PAYPAL_ERROR", name: err.name_, issue: err.issue, debugId: err.debugId, message: err.message }, 502);
  }
  log("error", "server.unhandled", { route, message: err instanceof Error ? err.message : String(err) });
  return json({ error: "INTERNAL_ERROR" }, 500);
}
