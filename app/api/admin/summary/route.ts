import { revenueSummary } from "@/lib/admin";
import { assertAdmin, errorResponse, json } from "@/lib/http";
import { PayPalError } from "@/lib/paypal";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    assertAdmin(req);
    return json(await revenueSummary());
  } catch (err) {
    if (err instanceof PayPalError && (err.status === 403 || err.name_ === "NOT_AUTHORIZED")) {
      return json(
        {
          error: "TRANSACTION_SEARCH_NOT_AUTHORIZED",
          message: "PayPal refused the Transaction Search API for this app.",
          hint: "The REST app needs the Transaction Search feature enabled; new permissions can take a few hours to apply.",
          debugId: err.debugId,
        },
        502,
      );
    }
    return errorResponse(err, "admin-summary");
  }
}
