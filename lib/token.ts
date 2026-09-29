/**
 * Stateless signed tokens: base64url(JSON payload) + "." + base64url(HMAC-SHA256(secret, payloadPart)).
 * Self-contained (node:crypto only) so scripts can import it directly.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const b64url = (buf: Buffer) => buf.toString("base64url");

function mac(payloadPart: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payloadPart, "utf8").digest();
}

export function signToken(payload: unknown, secret: string): string {
  if (!secret || secret.length < 16) throw new Error("REPORT_TOKEN_SECRET must be at least 16 characters");
  const payloadPart = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  return `${payloadPart}.${b64url(mac(payloadPart, secret))}`;
}

/** Returns the decoded JSON payload if (and only if) the signature is valid; otherwise null. */
export function verifyToken(token: string, secret: string): unknown | null {
  if (!secret || typeof token !== "string" || token.length > 4096) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadPart, sigPart] = parts;
  if (!/^[A-Za-z0-9_-]+$/.test(payloadPart) || !/^[A-Za-z0-9_-]+$/.test(sigPart)) return null;
  const expected = mac(payloadPart, secret);
  const given = Buffer.from(sigPart, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    return JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export const REFUND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** True while `now` is within 7 days after `paidAt` (inclusive of the exact 7-day mark). */
export function isWithinRefundWindow(paidAt: string, now: Date = new Date()): boolean {
  const paid = Date.parse(paidAt);
  if (Number.isNaN(paid)) return false;
  const age = now.getTime() - paid;
  return age >= -5 * 60 * 1000 && age <= REFUND_WINDOW_MS; // tolerate small clock skew
}

export function refundDeadline(paidAt: string): Date {
  return new Date(Date.parse(paidAt) + REFUND_WINDOW_MS);
}
