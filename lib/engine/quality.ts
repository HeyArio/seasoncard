// Photo quality checks. Thresholds apply to the engine's working image (long side <= 800 px).
import type { QualityIssue } from './types';

export const QUALITY_CONSTANTS = {
  /** A second face at least this fraction of the primary face's box area -> multiple_faces. */
  secondFaceAreaRatio: 0.2,
  /** Face oval width relative to the image's short side, and absolute (working-image px). */
  minFaceWidthRatio: 0.22,
  minFaceWidthPx: 110,
  /**
   * low_light: median face luma (0..255, gamma-encoded) below lowLightLuma AND the brightest 2% of
   * the face (sclera, catchlights) below lowLightP98 — or median below lowLightHardLuma.
   * The p98 condition keeps very deep skin photographed in good light (bright sclera and
   * highlights) from being mistaken for a dark photo.
   */
  lowLightLuma: 40,
  lowLightP98: 100,
  lowLightHardLuma: 22,
  /** More than this fraction of face pixels clipped, or median luma above overLuma. */
  overClippedFraction: 0.12,
  overLuma: 235,
  /** Laplacian variance of the face box resampled to blurSize x blurSize luma. */
  blurSize: 128,
  blurMinVariance: 12,
} as const;

/** Issues that make the result untrustworthy (quality.ok = false). color_cast is only blocking above WB castBlock. */
export const BLOCKING: ReadonlySet<QualityIssue> = new Set<QualityIssue>([
  'face_not_found', 'multiple_faces', 'face_too_small', 'low_light', 'overexposed', 'blurry',
]);

/** Canonical order for the issues array (deterministic output). */
export const ISSUE_ORDER: readonly QualityIssue[] = [
  'face_not_found', 'multiple_faces', 'face_too_small', 'low_light', 'overexposed', 'color_cast', 'blurry',
];

export function sortIssues(issues: Iterable<QualityIssue>): QualityIssue[] {
  const set = new Set(issues);
  return ISSUE_ORDER.filter((i) => set.has(i));
}
