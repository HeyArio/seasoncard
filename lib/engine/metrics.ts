// Map measured colours (CIELAB / LCh, after white balance) to the four 0..1 metrics.
// Every constant is documented here and in README.md. They are hand-set heuristics based on
// published skin/hair/iris colour ranges, NOT fitted to a labelled dataset.
import type { Lab, Metric, MetricScores } from './types';
import { chroma, hueDeg } from './color';
import { clamp01, logistic, ramp, round } from './stats';

export const METRIC_CONSTANTS = {
  undertone: {
    /**
     * Skin hue angle h_ab (degrees) at which undertone = 0.5. Photographed skin sits roughly in
     * 45..68 deg: pink/rosy (cool) skin toward the low end, golden/olive-yellow (warm) toward the
     * high end.
     */
    hueCenter: 55,
    /** Logistic scale (deg): h = centre +/- 10 deg maps to ~0.10 / ~0.90. */
    hueScale: 4.5,
    /**
     * Deeper skin has a naturally higher hue angle (melanin is yellow-brown), which would read as
     * "warm" for everyone with deep skin. The centre moves up by `depthShift` deg per L* unit below
     * `depthRefL` (and down above it), clamped to [depthShiftMin, depthShiftMax].
     */
    depthRefL: 65,
    depthShift: 0.08,
    depthShiftMin: -1.5,
    depthShiftMax: 3,
    /** Hair warmth (golden / red vs ash) contributes up to this weight, scaled by hair chroma. */
    hairWeightMax: 0.2,
    hairChromaFull: 14,
    /** Hair b* mapped 0..1 over this range (ash ~2-8, golden / copper 18+). */
    hairB: [2, 22] as [number, number],
  },
  depth: {
    /**
     * L* -> 0..1 (inverted: higher L* = lighter = lower depth). Ranges are for well-exposed
     * phone photos. Skin: L* 84 (very fair) -> 0, L* 36 (deep) -> 1, so typical medium skin
     * (L* ~60-66) lands near the middle; all very deep skin saturates at 1 ("Deep"). Hair: L* 70
     * (platinum) -> 0, L* 10 (black) -> 1. Irises: L* 60 (light blue/grey) -> 0, L* 15 -> 1.
     */
    skinL: [84, 36] as [number, number],
    hairL: [70, 10] as [number, number],
    eyeL: [60, 15] as [number, number],
    weights: { skin: 0.5, hair: 0.3, eyes: 0.2 },
  },
  contrast: {
    /** Weighted |dL*| between skin and hair / skin and eyes, mapped 0..1 over this range. */
    deltaL: [10, 60] as [number, number],
    weights: { hair: 0.65, eyes: 0.35 },
  },
  chroma: {
    /**
     * Skin chroma is judged RELATIVE to the chroma typical for its lightness, because C* of skin
     * rises from fair to medium and falls again for very deep skin. Expected C*(L) =
     * skinPeakC - skinCurve * (L - skinPeakL)^2; the ratio C / expected is mapped over skinRatio.
     */
    skinPeakC: 26,
    skinPeakL: 55,
    skinCurve: 0.012,
    skinRatio: [0.55, 1.35] as [number, number],
    eyeC: [4, 26] as [number, number],
    hairC: [2, 26] as [number, number],
    weights: { skin: 0.4, eyes: 0.35, hair: 0.25 },
    /**
     * C* is geometrically squeezed near black, so very dark hair/irises say little about
     * clarity. Their weight is scaled by ramp(L*, darkL[0], darkL[1]) (0 at L* <= 15).
     */
    darkL: [15, 35] as [number, number],
  },
} as const;

export const METRIC_LABELS = {
  undertone: ['Cool', 'Cool-neutral', 'Neutral', 'Warm-neutral', 'Warm'],
  depth: ['Light', 'Light-medium', 'Medium', 'Medium-deep', 'Deep'],
  contrast: ['Low', 'Medium-low', 'Medium', 'Medium-high', 'High'],
  chroma: ['Soft', 'Soft-medium', 'Medium', 'Clear', 'Bright'],
} as const;

/** Five equal bins: [0,.2) [.2,.4) [.4,.6) [.6,.8) [.8,1]. */
export function labelFor(kind: keyof typeof METRIC_LABELS, score: number): string {
  const i = Math.min(4, Math.max(0, Math.floor(score * 5)));
  return METRIC_LABELS[kind][i];
}

export function toMetric(kind: keyof typeof METRIC_LABELS, score: number): Metric {
  return { score, label: labelFor(kind, score) };
}

export interface ColourSamples { skin: Lab; eyes: Lab | null; hair: Lab | null }

/** Weighted mean over the available terms, renormalising the weights. */
function wmean(terms: [number | null, number][], fallback: number): number {
  let s = 0, w = 0;
  for (const [v, k] of terms) if (v !== null && Number.isFinite(v)) { s += v * k; w += k; }
  return w > 0 ? s / w : fallback;
}

export function undertoneScore(skin: Lab, hair: Lab | null): number {
  const U = METRIC_CONSTANTS.undertone;
  const shift = Math.min(U.depthShiftMax, Math.max(U.depthShiftMin, U.depthShift * (U.depthRefL - skin.L)));
  const skinU = logistic(hueDeg(skin), U.hueCenter + shift, U.hueScale);
  if (!hair) return skinU;
  const w = U.hairWeightMax * clamp01(chroma(hair) / U.hairChromaFull);
  const hairU = ramp(hair.b, U.hairB[0], U.hairB[1]);
  return (1 - w) * skinU + w * hairU;
}

export function depthScore(s: ColourSamples): number {
  const D = METRIC_CONSTANTS.depth;
  return wmean([
    [ramp(s.skin.L, D.skinL[0], D.skinL[1]), D.weights.skin],
    [s.hair ? ramp(s.hair.L, D.hairL[0], D.hairL[1]) : null, D.weights.hair],
    [s.eyes ? ramp(s.eyes.L, D.eyeL[0], D.eyeL[1]) : null, D.weights.eyes],
  ], 0.5);
}

export function contrastScore(s: ColourSamples): number {
  const K = METRIC_CONSTANTS.contrast;
  const dl = wmean([
    [s.hair ? Math.abs(s.skin.L - s.hair.L) : null, K.weights.hair],
    [s.eyes ? Math.abs(s.skin.L - s.eyes.L) : null, K.weights.eyes],
  ], NaN);
  return Number.isFinite(dl) ? ramp(dl, K.deltaL[0], K.deltaL[1]) : 0.5;
}

/** Typical skin C* at a given L* (see METRIC_CONSTANTS.chroma). */
export function expectedSkinChroma(L: number): number {
  const C = METRIC_CONSTANTS.chroma;
  return Math.max(8, C.skinPeakC - C.skinCurve * (L - C.skinPeakL) ** 2);
}

export function chromaScore(s: ColourSamples): number {
  const C = METRIC_CONSTANTS.chroma;
  const darkW = (lab: Lab) => ramp(lab.L, C.darkL[0], C.darkL[1]);
  return wmean([
    [ramp(chroma(s.skin) / expectedSkinChroma(s.skin.L), C.skinRatio[0], C.skinRatio[1]), C.weights.skin],
    [s.eyes ? ramp(chroma(s.eyes), C.eyeC[0], C.eyeC[1]) : null, s.eyes ? C.weights.eyes * darkW(s.eyes) : 0],
    [s.hair ? ramp(chroma(s.hair), C.hairC[0], C.hairC[1]) : null, s.hair ? C.weights.hair * darkW(s.hair) : 0],
  ], 0.5);
}

/** All four scores, rounded to 3 decimals (the rounded values are what gets classified). */
export function computeScores(s: ColourSamples): MetricScores {
  return {
    undertone: round(undertoneScore(s.skin, s.hair), 3),
    depth: round(depthScore(s), 3),
    contrast: round(contrastScore(s), 3),
    chroma: round(chromaScore(s), 3),
  };
}
