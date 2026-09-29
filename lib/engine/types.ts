// Engine API types — CONTRACT.md §2. Do not change these shapes without the lead.

export type SeasonId =
  | 'light-spring' | 'true-spring' | 'bright-spring'
  | 'light-summer' | 'true-summer' | 'soft-summer'
  | 'soft-autumn' | 'true-autumn' | 'deep-autumn'
  | 'deep-winter' | 'true-winter' | 'bright-winter';

export type SeasonFamily = 'spring' | 'summer' | 'autumn' | 'winter';

export type QualityIssue =
  | 'face_not_found' | 'multiple_faces' | 'face_too_small'
  | 'low_light' | 'overexposed' | 'color_cast' | 'blurry';

export interface Metric { score: number; label: string } // score 0..1

export interface AnalysisResult {
  season: SeasonId;
  family: SeasonFamily;
  runnerUp: SeasonId;
  confidence: number; // 0..1
  metrics: {
    undertone: Metric; // 0 = cool, 1 = warm
    depth: Metric; // 0 = light, 1 = deep
    contrast: Metric; // 0 = low, 1 = high
    chroma: Metric; // 0 = soft/muted, 1 = bright/clear
  };
  samples: { skin: string; eyes: string; hair: string }; // hex, after white balance
  quality: { ok: boolean; issues: QualityIssue[] };
  version: string;
}

export type EngineSource = HTMLImageElement | HTMLCanvasElement | ImageBitmap | HTMLVideoElement;

export interface EngineOptions { wasmBase?: string; modelUrl?: string }

// ---------------------------------------------------------------------------
// Internal (non-contract) types, exported for tests and advanced callers.

/** RGBA8 pixel buffer, same layout as the DOM ImageData. */
export interface PixelImage { width: number; height: number; data: Uint8ClampedArray | Uint8Array }

/** A landmark in PIXEL coordinates of the PixelImage it belongs to. */
export interface Point { x: number; y: number }

/** Four raw metric scores, each 0..1. */
export interface MetricScores { undertone: number; depth: number; contrast: number; chroma: number }

/** CIELAB triple (D65). */
export interface Lab { L: number; a: number; b: number }
