// White balance: estimate the scene illuminant colour and a von Kries (diagonal) correction
// in linear sRGB. Pure math; the pixel collection lives in sampling.ts.
import { SRGB_TO_LINEAR, linearRgbToLab, chroma } from './color';
import type { Lab } from './types';

export type RGB = [number, number, number];

export const WB_CONSTANTS = {
  /**
   * Fraction of the estimated correction that is applied, in the log-gain domain. Grey-world
   * over-corrects when the background is genuinely coloured (a beige wall would make skin
   * look cooler), so we apply 80% of it.
   */
  strength: 0.8,
  /** Per-channel gain limits. Casts beyond this cannot be fully removed (see castBlock). */
  gainMin: 0.75,
  gainMax: 1.33,
  /** Blend of the two illuminant estimates when both are available. */
  backgroundWeight: 0.65,
  scleraWeight: 0.35,
  /** Background pixels with raw C* above this are treated as coloured objects and ignored. */
  backgroundMaxChroma: 35,
  minBackgroundPixels: 400,
  minScleraPixels: 15,
  /** C* of a mid-grey lit by the estimated illuminant. >= castFlag -> 'color_cast' issue. */
  castFlag: 10,
  /** >= castBlock -> the cast is too strong to trust the correction; quality.ok = false. */
  castBlock: 22,
} as const;

export interface WhiteBalance {
  gains: RGB;
  /** Estimated illuminant, normalised so its channel mean is 1. */
  illuminant: RGB;
  /** C*ab of a mid-grey (L* ~ 50) under the estimated illuminant — the size of the cast. */
  castChroma: number;
  source: 'background+sclera' | 'background' | 'sclera' | 'none';
}

export const IDENTITY_WB: WhiteBalance = { gains: [1, 1, 1], illuminant: [1, 1, 1], castChroma: 0, source: 'none' };

function normMean(v: RGB): RGB {
  const m = (v[0] + v[1] + v[2]) / 3;
  return m > 0 ? [v[0] / m, v[1] / m, v[2] / m] : [1, 1, 1];
}

/** Size of a cast: chroma of a mid-grey surface lit by `illuminant` (channel-mean 1). */
export function castChromaOf(illuminant: RGB): number {
  const e = normMean(illuminant);
  return chroma(linearRgbToLab(0.18 * e[0], 0.18 * e[1], 0.18 * e[2]));
}

/**
 * Combine the illuminant estimates (linear RGB, any scale) into a diagonal correction.
 * `background` = grey-world mean of low-chroma background pixels; `sclera` = median sclera
 * colour. Either may be null.
 */
export function estimateWhiteBalance(background: RGB | null, sclera: RGB | null): WhiteBalance {
  const C = WB_CONSTANTS;
  let e: RGB;
  let source: WhiteBalance['source'];
  if (background && sclera) {
    const b = normMean(background), s = normMean(sclera);
    e = [0, 1, 2].map((i) => C.backgroundWeight * b[i] + C.scleraWeight * s[i]) as RGB;
    source = 'background+sclera';
  } else if (background) { e = normMean(background); source = 'background'; }
  else if (sclera) { e = normMean(sclera); source = 'sclera'; }
  else return IDENTITY_WB;

  e = normMean(e);
  // Full correction would be 1/e; apply `strength` of it in log space, then clamp.
  const raw = e.map((v) => Math.exp(-C.strength * Math.log(v))) as RGB;
  const cl = raw.map((g) => Math.min(C.gainMax, Math.max(C.gainMin, g))) as RGB;
  // Preserve the luminance of neutral surfaces so the correction does not change L* of greys.
  const y = 0.2126729 * cl[0] + 0.7151522 * cl[1] + 0.072175 * cl[2];
  const gains = cl.map((g) => g / y) as RGB;
  return { gains, illuminant: e, castChroma: castChromaOf(e), source };
}

/** Convert one 8-bit sRGB pixel to Lab after applying the white-balance gains. */
export function correctedLab(r8: number, g8: number, b8: number, wb: WhiteBalance): Lab {
  const g = wb.gains;
  const r = Math.min(1, SRGB_TO_LINEAR[r8] * g[0]);
  const gg = Math.min(1, SRGB_TO_LINEAR[g8] * g[1]);
  const b = Math.min(1, SRGB_TO_LINEAR[b8] * g[2]);
  return linearRgbToLab(r, gg, b);
}
