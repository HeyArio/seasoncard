// Planar geometry: shapes, masks and the per-face geometry derived from landmarks.
import type { Point } from './types';
import * as LM from './landmarks';

export interface BBox { x0: number; y0: number; x1: number; y1: number }

export interface Shape { bbox: BBox; contains(x: number, y: number): boolean }

export function centroid(pts: readonly Point[]): Point {
  let x = 0, y = 0;
  for (const p of pts) { x += p.x; y += p.y; }
  return { x: x / pts.length, y: y / pts.length };
}

export function dist(p: Point, q: Point): number {
  return Math.hypot(p.x - q.x, p.y - q.y);
}

export function bboxOf(pts: readonly Point[]): BBox {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) {
    if (p.x < x0) x0 = p.x; if (p.y < y0) y0 = p.y;
    if (p.x > x1) x1 = p.x; if (p.y > y1) y1 = p.y;
  }
  return { x0, y0, x1, y1 };
}

/** Scale a point set about a centre (default: its centroid). */
export function scalePts(pts: readonly Point[], k: number, c: Point = centroid(pts)): Point[] {
  return pts.map((p) => ({ x: c.x + (p.x - c.x) * k, y: c.y + (p.y - c.y) * k }));
}

/** Polygon via even-odd ray casting. */
export function polygon(pts: readonly Point[]): Shape {
  const n = pts.length;
  const xs = Float64Array.from(pts, (p) => p.x);
  const ys = Float64Array.from(pts, (p) => p.y);
  return {
    bbox: bboxOf(pts),
    contains(x, y) {
      let inside = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const yi = ys[i], yj = ys[j];
        if ((yi > y) !== (yj > y) && x < ((xs[j] - xs[i]) * (y - yi)) / (yj - yi) + xs[i]) inside = !inside;
      }
      return inside;
    },
  };
}

export function ellipse(c: Point, rx: number, ry: number): Shape {
  return {
    bbox: { x0: c.x - rx, y0: c.y - ry, x1: c.x + rx, y1: c.y + ry },
    contains(x, y) {
      const dx = (x - c.x) / rx, dy = (y - c.y) / ry;
      return dx * dx + dy * dy <= 1;
    },
  };
}

export function annulus(c: Point, rIn: number, rOut: number): Shape {
  const a = rIn * rIn, b = rOut * rOut;
  return {
    bbox: { x0: c.x - rOut, y0: c.y - rOut, x1: c.x + rOut, y1: c.y + rOut },
    contains(x, y) {
      const d = (x - c.x) ** 2 + (y - c.y) ** 2;
      return d >= a && d <= b;
    },
  };
}

export function rect(b: BBox): Shape {
  return { bbox: b, contains: (x, y) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 };
}

/** Iterate integer pixels whose centres lie in `include` and in none of `exclude`. */
export function forEachPixel(
  width: number, height: number, include: Shape, exclude: readonly Shape[], stride: number,
  fn: (x: number, y: number) => void,
): void {
  const b = include.bbox;
  const x0 = Math.max(0, Math.floor(b.x0)), y0 = Math.max(0, Math.floor(b.y0));
  const x1 = Math.min(width - 1, Math.ceil(b.x1)), y1 = Math.min(height - 1, Math.ceil(b.y1));
  for (let y = y0; y <= y1; y += stride) {
    const cy = y + 0.5;
    for (let x = x0; x <= x1; x += stride) {
      const cx = x + 0.5;
      if (!include.contains(cx, cy)) continue;
      let skip = false;
      for (const e of exclude) {
        const eb = e.bbox;
        if (cx >= eb.x0 && cx <= eb.x1 && cy >= eb.y0 && cy <= eb.y1 && e.contains(cx, cy)) { skip = true; break; }
      }
      if (!skip) fn(x, y);
    }
  }
}

export interface Iris { center: Point; radius: number }

/** Everything the samplers need, derived once from a face's landmarks (pixel coordinates). */
export interface FaceGeometry {
  landmarks: readonly Point[];
  oval: Point[];
  ovalBox: BBox;
  center: Point;
  faceWidth: number;
  faceHeight: number;
  iod: number;
  rightEye: Point[];
  leftEye: Point[];
  rightIris: Iris;
  leftIris: Iris;
  rightBrow: Point[];
  leftBrow: Point[];
  lips: Point[];
}

function irisFrom(lm: readonly Point[], centerIdx: number, ring: readonly number[], eye: Point[]): Iris {
  if (lm.length >= LM.IRIS_LANDMARKS) {
    const c = lm[centerIdx];
    let r = 0;
    for (const i of ring) r += dist(c, lm[i]);
    return { center: c, radius: r / ring.length };
  }
  // Fallback without iris refinement: eye centroid, radius ~ 22% of the eye width.
  const b = bboxOf(eye);
  return { center: centroid(eye), radius: 0.22 * (b.x1 - b.x0) };
}

export function faceGeometry(lm: readonly Point[]): FaceGeometry {
  if (lm.length < LM.MIN_LANDMARKS) throw new Error(`expected >= ${LM.MIN_LANDMARKS} landmarks, got ${lm.length}`);
  const pick = (idx: readonly number[]) => idx.map((i) => lm[i]);
  const oval = pick(LM.FACE_OVAL);
  const ovalBox = bboxOf(oval);
  const rightEye = pick(LM.RIGHT_EYE);
  const leftEye = pick(LM.LEFT_EYE);
  const rightIris = irisFrom(lm, LM.RIGHT_IRIS_CENTER, LM.RIGHT_IRIS_RING, rightEye);
  const leftIris = irisFrom(lm, LM.LEFT_IRIS_CENTER, LM.LEFT_IRIS_RING, leftEye);
  let iod = dist(rightIris.center, leftIris.center);
  if (!(iod > 0)) iod = 0.9 * dist(lm[LM.RIGHT_EYE_OUTER], lm[LM.LEFT_EYE_OUTER]);
  return {
    landmarks: lm,
    oval,
    ovalBox,
    center: centroid(oval),
    faceWidth: ovalBox.x1 - ovalBox.x0,
    faceHeight: dist(lm[LM.FOREHEAD_TOP], lm[LM.CHIN]),
    iod,
    rightEye,
    leftEye,
    rightIris,
    leftIris,
    rightBrow: pick(LM.RIGHT_BROW),
    leftBrow: pick(LM.LEFT_BROW),
    lips: pick(LM.LIPS_OUTER),
  };
}
