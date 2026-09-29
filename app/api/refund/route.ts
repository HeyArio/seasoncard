import { errorResponse, json, readBody } from "@/lib/http";
import { refundByToken } from "@/lib/refund";
import { refundBodySchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { token } = await readBody(req, refundBodySchema);
    return json(await refundByToken(token));
  } catch (err) {
    return errorResponse(err, "refund");
  }
}
