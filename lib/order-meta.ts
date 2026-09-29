/**
 * Compact encoding of what was bought, stored in PayPal's purchase_units[0].custom_id (max 127 chars).
 * This lets /api/paypal/capture rebuild the report from PayPal's own record of the order, so the
 * capture step trusts nothing from the browser except the order id.
 *   sc1|soft-autumn|1|66:3,50:2,14:0,14:0|C9A084,6E583E,5C4230
 */
import { METRIC_KEYS, METRIC_LABELS, seasonIdSchema, type Metrics, type Samples, type SeasonIdT } from "./schemas";

export interface OrderMeta {
  season: SeasonIdT;
  capsule: boolean;
  metrics: Metrics;
  samples: Samples;
}

export function encodeOrderMeta(m: OrderMeta): string {
  const metrics = METRIC_KEYS.map((k) => {
    const idx = (METRIC_LABELS[k] as readonly string[]).indexOf(m.metrics[k].label);
    return `${Math.round(m.metrics[k].score * 100)}:${idx}`;
  }).join(",");
  const samples = [m.samples.skin, m.samples.eyes, m.samples.hair].map((h) => h.slice(1).toUpperCase()).join(",");
  const out = `sc1|${m.season}|${m.capsule ? 1 : 0}|${metrics}|${samples}`;
  if (out.length > 127) throw new Error("custom_id too long");
  return out;
}

export function decodeOrderMeta(s: string | undefined | null): OrderMeta | null {
  if (!s) return null;
  const parts = s.split("|");
  if (parts.length !== 5 || parts[0] !== "sc1") return null;
  const season = seasonIdSchema.safeParse(parts[1]);
  if (!season.success || (parts[2] !== "0" && parts[2] !== "1")) return null;
  const ms = parts[3].split(",");
  const ss = parts[4].split(",");
  if (ms.length !== 4 || ss.length !== 3) return null;
  const metrics: Record<string, { score: number; label: string }> = {};
  for (let i = 0; i < 4; i++) {
    const m = /^(\d{1,3}):([0-4])$/.exec(ms[i]);
    if (!m) return null;
    const score = Number(m[1]);
    if (score > 100) return null;
    const k = METRIC_KEYS[i];
    metrics[k] = { score: score / 100, label: METRIC_LABELS[k][Number(m[2])] };
  }
  if (!ss.every((h) => /^[0-9A-F]{6}$/.test(h))) return null;
  return {
    season: season.data,
    capsule: parts[2] === "1",
    metrics: metrics as Metrics,
    samples: { skin: `#${ss[0]}`, eyes: `#${ss[1]}`, hair: `#${ss[2]}` },
  };
}
