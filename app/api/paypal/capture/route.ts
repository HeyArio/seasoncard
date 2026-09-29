import { captureOrder } from "@/lib/checkout";
import { errorResponse, json, readBody } from "@/lib/http";
import { captureBodySchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { orderId } = await readBody(req, captureBodySchema, 1_024);
    const outcome = await captureOrder(orderId);
    if (outcome.kind === "declined") {
      return json({ error: "INSTRUMENT_DECLINED", message: "Your payment method was declined. Please try another one." }, 402);
    }
    if (outcome.kind === "pending") {
      return json({ status: "PENDING", paypalStatus: outcome.status, message: "PayPal is still processing this payment." }, 202);
    }
    const url = `/r/${outcome.token}`;
    return json({ status: "COMPLETED", token: outcome.token, url }, 200, { Location: url });
  } catch (err) {
    return errorResponse(err, "capture");
  }
}
