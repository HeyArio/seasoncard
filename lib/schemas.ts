import { z } from "zod";

export const SEASON_IDS = [
  "light-spring", "true-spring", "bright-spring",
  "light-summer", "true-summer", "soft-summer",
  "soft-autumn", "true-autumn", "deep-autumn",
  "deep-winter", "true-winter", "bright-winter",
] as const;
export type SeasonIdT = (typeof SEASON_IDS)[number];

/** Metric label vocabularies from CONTRACT §2 (index 0..4). */
export const METRIC_LABELS = {
  undertone: ["Cool", "Cool-neutral", "Neutral", "Warm-neutral", "Warm"],
  depth: ["Light", "Light-medium", "Medium", "Medium-deep", "Deep"],
  contrast: ["Low", "Medium-low", "Medium", "Medium-high", "High"],
  chroma: ["Soft", "Soft-medium", "Medium", "Clear", "Bright"],
} as const;
export const METRIC_KEYS = ["undertone", "depth", "contrast", "chroma"] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

export const seasonIdSchema = z.enum(SEASON_IDS);
export const hexSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "hex colour");

const metricOf = <K extends MetricKey>(k: K) =>
  z.object({ score: z.number().finite().min(0).max(1), label: z.enum(METRIC_LABELS[k]) }).strict();

export const metricsSchema = z
  .object({
    undertone: metricOf("undertone"),
    depth: metricOf("depth"),
    contrast: metricOf("contrast"),
    chroma: metricOf("chroma"),
  })
  .strict();
export type Metrics = z.infer<typeof metricsSchema>;

export const samplesSchema = z.object({ skin: hexSchema, eyes: hexSchema, hair: hexSchema }).strict();
export type Samples = z.infer<typeof samplesSchema>;

export const createOrderBodySchema = z
  .object({
    season: seasonIdSchema,
    metrics: metricsSchema,
    samples: samplesSchema,
    capsule: z.boolean(),
  })
  .strict();
export type CreateOrderBody = z.infer<typeof createOrderBodySchema>;

export const captureBodySchema = z
  .object({ orderId: z.string().regex(/^[A-Z0-9]{5,40}$/, "PayPal order id") })
  .strict();

export const refundBodySchema = z.object({ token: z.string().min(20).max(4096) }).strict();

export const reportPayloadSchema = z
  .object({
    orderId: z.string().min(1).max(64),
    captureId: z.string().min(1).max(64),
    season: seasonIdSchema,
    metrics: metricsSchema,
    samples: samplesSchema,
    capsule: z.boolean(),
    amount: z.string().regex(/^\d+\.\d{2}$/),
    paidAt: z.string().datetime({ offset: true }),
    payerEmail: z.string().max(320).nullable(),
  })
  .strict();
export type ReportPayload = z.infer<typeof reportPayloadSchema>;

/** Shape of the client-side AnalysisResult we keep in sessionStorage (validated on read). */
export const storedResultSchema = z.object({
  season: seasonIdSchema,
  family: z.enum(["spring", "summer", "autumn", "winter"]),
  runnerUp: seasonIdSchema,
  confidence: z.number().min(0).max(1),
  metrics: metricsSchema,
  samples: samplesSchema,
  quality: z.object({ ok: z.boolean(), issues: z.array(z.string()) }),
  version: z.string(),
});
export type StoredResult = z.infer<typeof storedResultSchema>;
