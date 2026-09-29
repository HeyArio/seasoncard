import { errorResponse, json } from "@/lib/http";
import { handlePayPalWebhook } from "@/lib/webhook";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const result = await handlePayPalWebhook(raw, req.headers);
    return json(result.body, result.status);
  } catch (err) {
    // Non-2xx makes PayPal retry later, which is what we want for transient failures.
    return errorResponse(err, "webhook");
  }
}
