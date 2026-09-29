import { createOrder } from "@/lib/checkout";
import { errorResponse, json, readBody } from "@/lib/http";
import { createOrderBodySchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await readBody(req, createOrderBodySchema);
    const order = await createOrder(body);
    return json({ id: order.id, total: order.total, currency: "USD" });
  } catch (err) {
    return errorResponse(err, "create-order");
  }
}
