// Season Card engine — public entry point (CONTRACT.md §2).
// Browser-only at call time; safe to import during SSR (MediaPipe is loaded lazily).
import type { AnalysisResult, EngineOptions, EngineSource, PixelImage, Point } from './types';
import { analyzePixels } from './pipeline';
import { downscale } from './image';

export type {
  SeasonId, SeasonFamily, QualityIssue, Metric, AnalysisResult, EngineOptions, EngineSource,
  PixelImage, Point, MetricScores, Lab,
} from './types';
export { analyzePixels, analyzePixelsDetailed, ENGINE_VERSION, CONFIDENCE_PENALTIES } from './pipeline';
export type { AnalysisDetail } from './pipeline';
export { classify, rankSeasons, familyOf, SEASON_IDS, PROTOTYPES, AXIS_WEIGHTS } from './classify';
export { computeScores, METRIC_CONSTANTS, METRIC_LABELS } from './metrics';
export { WB_CONSTANTS } from './whitebalance';
export { SAMPLING_CONSTANTS } from './sampling';
export { QUALITY_CONSTANTS } from './quality';

/** MediaPipe version this engine is built and tested against (keep in sync with package.json). */
export const MEDIAPIPE_VERSION = '1.0.1';
// Self-hosted on our own domain (see public/mediapipe and app/mediapipe) so the scan never depends on
// third-party CDNs that some networks block.
export const DEFAULT_WASM_BASE = '/mediapipe/wasm';
export const DEFAULT_MODEL_URL = '/mediapipe/face_landmarker.task';

/** Working resolution (long side) for landmarks and sampling. */
export const WORK_MAX_SIDE = 800;
/** Sources larger than this are first reduced by the canvas (memory guard for 12+ MP photos). */
export const DECODE_MAX_SIDE = 2400;

interface Landmarker {
  detect(image: ImageData): { faceLandmarks: { x: number; y: number }[][] };
  close(): void;
}

let landmarker: Landmarker | null = null;
let initPromise: Promise<void> | null = null;
let initKey = '';

/**
 * Load the MediaPipe wasm runtime and the face landmarker model. Call it early (e.g. when the
 * scan screen mounts) so analyze() does not pay the download. Idempotent.
 */
export function initEngine(opts: EngineOptions = {}): Promise<void> {
  const wasmBase = opts.wasmBase ?? DEFAULT_WASM_BASE;
  const modelUrl = opts.modelUrl ?? DEFAULT_MODEL_URL;
  const key = `${wasmBase}|${modelUrl}`;
  if (initPromise && key === initKey) return initPromise;
  initKey = key;
  const p = (async () => {
    const vision = await import('@mediapipe/tasks-vision');
    const fileset = await vision.FilesetResolver.forVisionTasks(wasmBase);
    const next = await vision.FaceLandmarker.createFromOptions(fileset, {
      // CPU delegate: GPU inference is faster but not bit-reproducible across runs/drivers,
      // and determinism is a product requirement. CPU face mesh is ~20-60 ms on a mid-range phone.
      baseOptions: { modelAssetPath: modelUrl, delegate: 'CPU' },
      runningMode: 'IMAGE',
      numFaces: 2, // 2 so that a second face can be reported as 'multiple_faces'
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });
    if (landmarker) landmarker.close();
    landmarker = next as unknown as Landmarker;
  })();
  initPromise = p;
  p.catch(() => { if (initPromise === p) { initPromise = null; initKey = ''; } });
  return p;
}

function sourceSize(src: EngineSource): { w: number; h: number } {
  if (typeof HTMLVideoElement !== 'undefined' && src instanceof HTMLVideoElement) return { w: src.videoWidth, h: src.videoHeight };
  if (typeof HTMLImageElement !== 'undefined' && src instanceof HTMLImageElement) return { w: src.naturalWidth, h: src.naturalHeight };
  return { w: (src as HTMLCanvasElement | ImageBitmap).width, h: (src as HTMLCanvasElement | ImageBitmap).height };
}

/** Draw the source to a canvas and return its sRGB pixels at the working resolution. */
export function readPixels(src: EngineSource): PixelImage {
  const { w, h } = sourceSize(src);
  if (!w || !h) throw new Error('Season Card engine: source has no pixels (image not loaded yet?)');
  const s = Math.min(1, DECODE_MAX_SIDE / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * s)), ch = Math.max(1, Math.round(h * s));
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (typeof OffscreenCanvas !== 'undefined') {
    ctx = new OffscreenCanvas(cw, ch).getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' } as CanvasRenderingContext2DSettings);
  } else {
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    ctx = c.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' } as CanvasRenderingContext2DSettings);
  }
  if (!ctx) throw new Error('Season Card engine: 2D canvas unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src as CanvasImageSource, 0, 0, cw, ch);
  const data = ctx.getImageData(0, 0, cw, ch).data;
  return downscale({ width: cw, height: ch, data }, WORK_MAX_SIDE);
}

/** Quantise landmark coordinates to 1/4 px so float noise in the model cannot flip a pixel mask. */
function q(v: number): number {
  return Math.round(v * 4) / 4;
}

/** Run the face landmarker on a PixelImage and return every face's landmarks in pixel coordinates. */
export function detectFaces(img: PixelImage): Point[][] {
  if (!landmarker) throw new Error('Season Card engine: call initEngine() first');
  // Copy into a fresh ArrayBuffer-backed array (ImageData rejects SharedArrayBuffer views).
  const res = landmarker.detect(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height));
  return (res.faceLandmarks ?? []).map((face) => face.map((p) => ({ x: q(p.x * img.width), y: q(p.y * img.height) })));
}

/** Measure a selfie. Photo pixels never leave the device. */
export async function analyze(source: EngineSource): Promise<AnalysisResult> {
  await initEngine();
  const img = readPixels(source);
  return analyzePixels(img, detectFaces(img));
}
