// The pure analysis pipeline: pixels + landmarks in, AnalysisResult out. No DOM, no model,
// no randomness, no clocks — identical inputs always produce identical outputs.
import type { AnalysisResult, Lab, MetricScores, PixelImage, Point, QualityIssue } from './types';
import { labToHex } from './color';
import { type FaceGeometry, faceGeometry, polygon } from './geometry';
import { exposureStats, grayCrop, laplacianVariance } from './image';
import { computeScores, toMetric } from './metrics';
import { classify, type Classification } from './classify';
import { BLOCKING, QUALITY_CONSTANTS as Q, sortIssues } from './quality';
import { type EyeSample, type HairSample, type SkinSample, sampleBackground, sampleBackgroundLab, sampleEyes, sampleHair, sampleSclera, sampleSkin } from './sampling';
import { IDENTITY_WB, type WhiteBalance, WB_CONSTANTS, estimateWhiteBalance } from './whitebalance';
import { MIN_LANDMARKS } from './landmarks';
import { round } from './stats';

export const ENGINE_VERSION = '1.0.0';

/** Confidence multipliers for soft problems that do not block a result. */
export const CONFIDENCE_PENALTIES = {
  hairMissing: 0.8,
  eyesMissing: 0.85,
  colorCast: 0.85,
  sideLighting: 0.85, // cheeks differ by more than sideLightingDL in L*
  sideLightingDL: 15,
  foreheadDropped: 0.95,
} as const;

export interface AnalysisDetail {
  result: AnalysisResult;
  faceCount: number;
  geometry: FaceGeometry | null;
  whiteBalance: WhiteBalance;
  exposure: { medianLuma: number; p98Luma: number; clippedFraction: number; darkFraction: number } | null;
  blurVariance: number | null;
  skin: SkinSample | null;
  eyes: EyeSample | null;
  hair: HairSample | null;
  scores: MetricScores;
  classification: Classification;
  qualityFactor: number;
}

const NO_SAMPLE = '#000000';
const NEUTRAL: MetricScores = { undertone: 0.5, depth: 0.5, contrast: 0.5, chroma: 0.5 };

function boxArea(g: FaceGeometry): number {
  return (g.ovalBox.x1 - g.ovalBox.x0) * (g.ovalBox.y1 - g.ovalBox.y0);
}

function build(scores: MetricScores, cls: Classification, samples: { skin: Lab | null; eyes: Lab | null; hair: Lab | null }, issues: QualityIssue[], blocking: boolean): AnalysisResult {
  const ok = !blocking;
  return {
    season: cls.season,
    family: cls.family,
    runnerUp: cls.runnerUp,
    confidence: ok ? cls.confidence : 0,
    metrics: {
      undertone: toMetric('undertone', scores.undertone),
      depth: toMetric('depth', scores.depth),
      contrast: toMetric('contrast', scores.contrast),
      chroma: toMetric('chroma', scores.chroma),
    },
    samples: {
      skin: samples.skin ? labToHex(samples.skin) : NO_SAMPLE,
      eyes: samples.eyes ? labToHex(samples.eyes) : NO_SAMPLE,
      hair: samples.hair ? labToHex(samples.hair) : NO_SAMPLE,
    },
    quality: { ok, issues },
    version: ENGINE_VERSION,
  };
}

/**
 * Analyse one image given the landmarks of every detected face (pixel coordinates of `img`,
 * MediaPipe 478-point topology; 468 points also works with an iris fallback).
 */
export function analyzePixelsDetailed(img: PixelImage, faces: readonly (readonly Point[])[]): AnalysisDetail {
  const issues = new Set<QualityIssue>();
  const geos = faces.filter((f) => f.length >= MIN_LANDMARKS).map((f) => faceGeometry(f));
  if (geos.length === 0) {
    const cls = classify(NEUTRAL, 0);
    return {
      result: build(NEUTRAL, cls, { skin: null, eyes: null, hair: null }, ['face_not_found'], true),
      faceCount: 0, geometry: null, whiteBalance: IDENTITY_WB, exposure: null, blurVariance: null,
      skin: null, eyes: null, hair: null, scores: NEUTRAL, classification: cls, qualityFactor: 0,
    };
  }
  // Primary face = largest box; ties broken by position so the choice is deterministic.
  const order = geos.map((g, i) => ({ g, i })).sort((p, q) =>
    boxArea(q.g) - boxArea(p.g) || p.g.ovalBox.x0 - q.g.ovalBox.x0 || p.g.ovalBox.y0 - q.g.ovalBox.y0 || p.i - q.i);
  const g = order[0].g;
  if (order.length > 1 && boxArea(order[1].g) >= Q.secondFaceAreaRatio * boxArea(g)) issues.add('multiple_faces');

  const shortSide = Math.min(img.width, img.height);
  if (g.faceWidth < Q.minFaceWidthRatio * shortSide || g.faceWidth < Q.minFaceWidthPx) issues.add('face_too_small');

  const faceShape = polygon(g.oval);
  const exp = exposureStats(img, faceShape);
  if ((exp.medianLuma < Q.lowLightLuma && exp.p98Luma < Q.lowLightP98) || exp.medianLuma < Q.lowLightHardLuma) issues.add('low_light');
  if (exp.clippedFraction > Q.overClippedFraction || exp.medianLuma > Q.overLuma) issues.add('overexposed');

  const b = g.ovalBox;
  const mx = 0.1 * (b.x1 - b.x0), my = 0.1 * (b.y1 - b.y0);
  const blurVariance = laplacianVariance(grayCrop(img, { x0: b.x0 + mx, y0: b.y0 + my, x1: b.x1 - mx, y1: b.y1 - my }, Q.blurSize), Q.blurSize, Q.blurSize);
  if (blurVariance < Q.blurMinVariance) issues.add('blurry');

  const wb = estimateWhiteBalance(sampleBackground(img, g), sampleSclera(img, g));
  let castBlocking = false;
  if (wb.castChroma >= WB_CONSTANTS.castFlag) issues.add('color_cast');
  if (wb.castChroma >= WB_CONSTANTS.castBlock) castBlocking = true;

  const skin = sampleSkin(img, g, wb);
  const eyes = sampleEyes(img, g, wb);
  const hair = sampleHair(img, g, wb, skin.lab, sampleBackgroundLab(img, g, wb));

  let blocking = castBlocking || [...issues].some((i) => BLOCKING.has(i));
  if (!skin.lab) {
    // Not enough usable skin (occlusion, extreme lighting). Report it as an unusable face.
    if (!blocking) issues.add('face_too_small');
    blocking = true;
  }

  const P = CONFIDENCE_PENALTIES;
  let qf = 1;
  if (!hair.lab) qf *= P.hairMissing;
  if (!eyes.lab) qf *= P.eyesMissing;
  if (issues.has('color_cast')) qf *= P.colorCast;
  if (skin.cheekDeltaL > P.sideLightingDL) qf *= P.sideLighting;
  if (skin.lab && !skin.foreheadUsed) qf *= P.foreheadDropped;
  qf = round(qf, 4);

  const scores = skin.lab ? computeScores({ skin: skin.lab, eyes: eyes.lab, hair: hair.lab }) : NEUTRAL;
  const cls = classify(scores, skin.lab ? qf : 0);
  const result = build(scores, cls, { skin: skin.lab, eyes: eyes.lab, hair: hair.lab }, sortIssues(issues), blocking);
  return {
    result, faceCount: geos.length, geometry: g, whiteBalance: wb,
    exposure: { medianLuma: exp.medianLuma, p98Luma: exp.p98Luma, clippedFraction: exp.clippedFraction, darkFraction: exp.darkFraction },
    blurVariance, skin, eyes, hair, scores, classification: cls, qualityFactor: qf,
  };
}

export function analyzePixels(img: PixelImage, faces: readonly (readonly Point[])[]): AnalysisResult {
  return analyzePixelsDetailed(img, faces).result;
}
