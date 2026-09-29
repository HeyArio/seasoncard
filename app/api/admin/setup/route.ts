import { ensureWebhook } from "@/lib/admin";
import { assertAdmin, errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertAdmin(req);
    return json(await ensureWebhook());
  } catch (err) {
    return errorResponse(err, "admin-setup");
  }
}
