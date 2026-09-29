export const CURRENCY = "USD" as const;
export const REPORT_PRICE_CENTS = 999;
export const CAPSULE_PRICE_CENTS = 499;

export interface LineItem {
  name: string;
  description: string;
  sku: string;
  unitCents: number;
  quantity: 1;
}

export const cents = (c: number) => (c / 100).toFixed(2);

/** Server-authoritative price computation. The client never sends an amount. */
export function computeOrder(capsule: boolean): { items: LineItem[]; totalCents: number; total: string } {
  const items: LineItem[] = [
    { name: "Full Season Report", description: "36-colour palette, makeup, metals, styling", sku: "SC-REPORT", unitCents: REPORT_PRICE_CENTS, quantity: 1 },
  ];
  if (capsule) {
    items.push({ name: "Capsule Wardrobe add-on", description: "30 pieces in your colours", sku: "SC-CAPSULE", unitCents: CAPSULE_PRICE_CENTS, quantity: 1 });
  }
  const totalCents = items.reduce((s, i) => s + i.unitCents * i.quantity, 0);
  return { items, totalCents, total: cents(totalCents) };
}

export function expectedTotal(capsule: boolean): string {
  return computeOrder(capsule).total;
}
