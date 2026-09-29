import { describe, expect, it } from "vitest";
import { computeOrder, expectedTotal } from "@/lib/pricing";
import { buildOrderRequest } from "@/lib/checkout";
import { decodeOrderMeta, encodeOrderMeta } from "@/lib/order-meta";
import type { CreateOrderBody } from "@/lib/schemas";
import { createOrderBodySchema } from "@/lib/schemas";

const body: CreateOrderBody = {
  season: "soft-autumn",
  metrics: {
    undertone: { score: 0.66, label: "Warm-neutral" },
    depth: { score: 0.5, label: "Medium" },
    contrast: { score: 0.14, label: "Low" },
    chroma: { score: 0.14, label: "Soft" },
  },
  samples: { skin: "#C9A084", eyes: "#6E583E", hair: "#5C4230" },
  capsule: false,
};

describe("amount calculation", () => {
  it("report only is $9.99", () => {
    const o = computeOrder(false);
    expect(o.total).toBe("9.99");
    expect(o.items).toHaveLength(1);
  });
  it("report + capsule is $14.98", () => {
    const o = computeOrder(true);
    expect(o.total).toBe("14.98");
    expect(o.items.map((i) => i.sku)).toEqual(["SC-REPORT", "SC-CAPSULE"]);
    expect(expectedTotal(true)).toBe("14.98");
  });
});

describe("PayPal order request", () => {
  it("builds a CAPTURE order with item lines that sum to the total", () => {
    const req = buildOrderRequest({ ...body, capsule: true });
    const pu = req.purchase_units[0];
    expect(req.intent).toBe("CAPTURE");
    expect(pu.amount).toEqual({ currency_code: "USD", value: "14.98", breakdown: { item_total: { currency_code: "USD", value: "14.98" } } });
    const sum = pu.items.reduce((s, i) => s + Number(i.unit_amount.value) * Number(i.quantity), 0);
    expect(sum.toFixed(2)).toBe("14.98");
    expect(req.application_context).toEqual({ brand_name: "Season Card", shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW" });
  });

  it("ignores any client-supplied amount (schema rejects unknown keys)", () => {
    const r = createOrderBodySchema.safeParse({ ...body, amount: "0.01" });
    expect(r.success).toBe(false);
  });

  it("rejects bad metrics labels and hex samples", () => {
    expect(createOrderBodySchema.safeParse({ ...body, metrics: { ...body.metrics, depth: { score: 0.5, label: "Huge" } } }).success).toBe(false);
    expect(createOrderBodySchema.safeParse({ ...body, samples: { ...body.samples, skin: "red" } }).success).toBe(false);
    expect(createOrderBodySchema.safeParse({ ...body, season: "summer" }).success).toBe(false);
  });

  it("round-trips order metadata through custom_id (<=127 chars)", () => {
    const id = encodeOrderMeta({ ...body, capsule: true });
    expect(id.length).toBeLessThanOrEqual(127);
    expect(decodeOrderMeta(id)).toEqual({ ...body, capsule: true });
    expect(decodeOrderMeta("sc1|soft-autumn|1|66:3,50:2|C9A084")).toBeNull();
  });
});
