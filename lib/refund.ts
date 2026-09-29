import "server-only";
import { paypalFetch, PayPalError } from "./paypal";
import { verifyReportToken } from "./report-token";
import { isWithinRefundWindow, refundDeadline } from "./token";
import { HttpError, log } from "./http";

export async function refundByToken(token: string, now = new Date()) {
  const payload = verifyReportToken(token);
  if (!payload) throw new HttpError(400, "INVALID_TOKEN", "This report link is not valid.");
  if (!isWithinRefundWindow(payload.paidAt, now)) {
    throw new HttpError(403, "REFUND_WINDOW_CLOSED", "The 7-day refund window has closed.", {
      deadline: refundDeadline(payload.paidAt).toISOString(),
    });
  }
  try {
    const refund = await paypalFetch<{ id: string; status: string }>(
      `/v2/payments/captures/${encodeURIComponent(payload.captureId)}/refund`,
      { method: "POST", requestId: payload.captureId, body: { note_to_payer: "Season Card 7-day refund" } },
    );
    log("info", "refund.requested", { orderId: payload.orderId, captureId: payload.captureId, refundId: refund.id, status: refund.status });
    return { status: refund.status, refundId: refund.id };
  } catch (e) {
    if (e instanceof PayPalError && e.issue === "CAPTURE_FULLY_REFUNDED") {
      log("info", "refund.already_refunded", { orderId: payload.orderId, captureId: payload.captureId });
      return { status: "COMPLETED", alreadyRefunded: true };
    }
    throw e;
  }
}

/** Fresh capture status (e.g. REFUNDED) for the report page. Returns null if it cannot be checked. */
export async function getCaptureStatus(captureId: string): Promise<string | null> {
  try {
    const c = await paypalFetch<{ status?: string }>(`/v2/payments/captures/${encodeURIComponent(captureId)}`, { timeoutMs: 3_000 });
    return c.status ?? null;
  } catch {
    return null;
  }
}
