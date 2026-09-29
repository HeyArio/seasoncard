// Transparent 12-season classifier: weighted Euclidean distance to 12 prototypes in the
// (undertone, depth, contrast, chroma) metric space. Pure and deterministic.
import type { MetricScores, SeasonFamily, SeasonId } from './types';
import { clamp01, round } from './stats';

/** Canonical order; also the tie-break order. */
export const SEASON_IDS: readonly SeasonId[] = [
  'light-spring', 'true-spring', 'bright-spring',
  'light-summer', 'true-summer', 'soft-summer',
  'soft-autumn', 'true-autumn', 'deep-autumn',
  'deep-winter', 'true-winter', 'bright-winter',
];

export function familyOf(id: SeasonId): SeasonFamily {
  return id.split('-')[1] as SeasonFamily;
}

/**
 * Prototypes, following the standard dominant-trait logic of the 12-season system:
 *  - Light*  : depth is the dominant trait (lowest depth); undertone only leaning warm/cool.
 *  - Deep*   : depth dominant (highest depth).
 *  - Bright* : high chroma + high contrast.
 *  - Soft*   : lowest chroma + low contrast.
 *  - True*   : undertone dominant (clearly warm 0.88 / clearly cool 0.12); the other,
 *              "neutral-leaning" sub-seasons sit at 0.64 (warm side) / 0.36 (cool side).
 * Warm (u > 0.5) = Spring/Autumn, cool (u < 0.5) = Summer/Winter.
 *
 * Coordinates are expressed in the engine's OWN metric scale (metrics.ts), i.e. where an
 * archetypal colouring of each season lands after measurement — not an abstract 0..1 ideal.
 * Two consequences of how the metrics are measured:
 *  - Winter "clarity" is carried mostly by contrast: black hair and dark irises have almost no
 *    measurable chroma, so True/Deep Winter chroma is moderate and their contrast is high.
 *  - Deep skin intrinsically has less skin-hair lightness difference, so the Deep seasons'
 *    contrast is moderate; depth and undertone separate them.
 */
export const PROTOTYPES: Readonly<Record<SeasonId, Readonly<MetricScores>>> = {
  //                          undertone      depth         contrast       chroma
  'light-spring':  { undertone: 0.64, depth: 0.08, contrast: 0.18, chroma: 0.60 },
  'true-spring':   { undertone: 0.88, depth: 0.22, contrast: 0.28, chroma: 0.78 },
  'bright-spring': { undertone: 0.64, depth: 0.38, contrast: 0.70, chroma: 0.80 },
  'light-summer':  { undertone: 0.36, depth: 0.08, contrast: 0.18, chroma: 0.38 },
  'true-summer':   { undertone: 0.12, depth: 0.30, contrast: 0.28, chroma: 0.32 },
  'soft-summer':   { undertone: 0.36, depth: 0.38, contrast: 0.25, chroma: 0.15 },
  'soft-autumn':   { undertone: 0.64, depth: 0.38, contrast: 0.25, chroma: 0.25 },
  'true-autumn':   { undertone: 0.88, depth: 0.50, contrast: 0.38, chroma: 0.60 },
  'deep-autumn':   { undertone: 0.64, depth: 0.85, contrast: 0.38, chroma: 0.40 },
  'deep-winter':   { undertone: 0.36, depth: 0.85, contrast: 0.55, chroma: 0.30 },
  'true-winter':   { undertone: 0.12, depth: 0.45, contrast: 0.80, chroma: 0.35 },
  'bright-winter': { undertone: 0.36, depth: 0.38, contrast: 0.82, chroma: 0.70 },
};

/**
 * Axis weights. Undertone is the family-defining axis in every 12-season system, so it is
 * weighted highest; contrast partly duplicates depth + chroma and is the noisiest measurement
 * (it depends on hair, which can be dyed or hidden), so it is weighted a little lower.
 */
export const AXIS_WEIGHTS: Readonly<MetricScores> = { undertone: 1.3, depth: 1.0, contrast: 0.85, chroma: 1.0 };

export const CONFIDENCE_CONSTANTS = {
  /** Margin (d2 - d1) at which the margin term reaches 1 - 1/e (~0.63). */
  marginScale: 0.06,
  /** d1 below this is a clean prototype hit (fit = 1); fit falls linearly to fitFloor over fitSpan. */
  fitFree: 0.12,
  fitSpan: 0.5,
  fitFloor: 0.35,
} as const;

export function distance(m: MetricScores, p: MetricScores): number {
  const w = AXIS_WEIGHTS;
  return Math.sqrt(
    (w.undertone * (m.undertone - p.undertone)) ** 2 +
    (w.depth * (m.depth - p.depth)) ** 2 +
    (w.contrast * (m.contrast - p.contrast)) ** 2 +
    (w.chroma * (m.chroma - p.chroma)) ** 2,
  );
}

/**
 * All seasons ranked nearest-first. Distances are rounded to 1e-9 before comparing so that
 * float noise cannot reorder near-ties; exact ties are broken by canonical order, so the
 * ranking is total and platform-independent.
 */
export function rankSeasons(m: MetricScores): { season: SeasonId; distance: number }[] {
  return SEASON_IDS
    .map((season, i) => ({ season, i, distance: round(distance(m, PROTOTYPES[season]), 9) }))
    .sort((a, b) => a.distance - b.distance || a.i - b.i)
    .map(({ season, distance: d }) => ({ season, distance: d }));
}

export interface Classification { season: SeasonId; family: SeasonFamily; runnerUp: SeasonId; confidence: number; distances: { season: SeasonId; distance: number }[] }

/**
 * confidence = (1 - exp(-(d2 - d1) / marginScale)) * fit * qualityFactor
 *  - margin term: 0 when the two nearest prototypes tie, -> 1 for a clear winner
 *  - fit term: 1 while the nearest prototype is close, down to fitFloor when the face is far
 *    from every prototype (an unusual or unreliable reading)
 *  - qualityFactor (0..1) is supplied by the pipeline (missing hair, residual cast, ...)
 */
export function classify(m: MetricScores, qualityFactor = 1): Classification {
  const r = rankSeasons(m);
  const d1 = r[0].distance, d2 = r[1].distance;
  const C = CONFIDENCE_CONSTANTS;
  const marginTerm = 1 - Math.exp(-(d2 - d1) / C.marginScale);
  const fit = Math.max(C.fitFloor, 1 - Math.max(0, d1 - C.fitFree) / C.fitSpan);
  return {
    season: r[0].season,
    family: familyOf(r[0].season),
    runnerUp: r[1].season,
    confidence: round(clamp01(marginTerm * fit * qualityFactor), 2),
    distances: r,
  };
}
