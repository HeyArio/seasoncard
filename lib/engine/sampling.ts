// Region sampling from landmarks. Each sampler returns a robust Lab estimate (after white
// balance) plus diagnostic counts. Works on any PixelImage, so it is testable with a
// synthetic image and fake landmarks — no model required.
import type { Lab, PixelImage, Point } from './types';
import { SRGB_TO_LINEAR, chroma, deltaE76, hueDeg, luma8, linearRgbToLab } from './color';
import {
  type FaceGeometry, type Shape, annulus, centroid, dist, ellipse, forEachPixel, polygon, rect, scalePts,
} from './geometry';
import * as LM from './landmarks';
import { type LabSet, labAt, makeLabSet, median, pushLab, trimmedMedianLab, quantile } from './stats';
import { type RGB, type WhiteBalance, WB_CONSTANTS, correctedLab } from './whitebalance';

export const SAMPLING_CONSTANTS = {
  /** Cheek disc radius and forehead ellipse radii, as fractions of the inter-ocular distance. */
  cheekRadius: 0.17,
  foreheadRx: 0.32,
  foreheadRyOfSpan: 0.38, // fraction of the (landmark 10 -> landmark 9) distance
  /** Exclusion masks are the feature polygons scaled about their centroid by these factors. */
  eyeDilate: 1.6,
  browDilate: 1.35,
  lipsDilate: 1.25,
  /** Pixels with any channel >= this are clipped and never used for colour. */
  clipLevel: 250,
  darkLevel: 6,
  /** Skin gates relative to the region's median L*: highlights above, shadows below. */
  skinHighlightDL: 14,
  skinShadowDL: 18,
  skinMinChroma: 4,
  skinHueRange: [10, 100] as [number, number],
  skinTrim: 0.15,
  /** A forehead median further than this (dE76) from the cheeks is dropped (bangs, hat, shadow). */
  foreheadMaxDE: 12,
  /** Iris annulus, as fractions of the iris radius (inner excludes the pupil). */
  irisInner: 0.42,
  irisOuter: 0.92,
  irisSpecularDL: 18,
  irisSpecularMaxC: 10,
  irisTrimLow: 0.15,
  irisTrimHigh: 0.25,
  /** Hair band offsets outward from the upper face oval, as fractions of face height. */
  hairInner: 0.04,
  hairOuter: 0.2,
  /** Hair pixels closer than this (dE76) to the skin median are treated as skin and dropped. */
  hairSkinDE: 12,
  /** ...and closer than this to the background median are treated as background (bald, hair tied back). */
  hairBackgroundDE: 7,
  hairMinFraction: 0.12,
  hairMinPixels: 40,
  hairTrim: 0.2,
  minSkinPixels: 60,
  minIrisPixels: 12,
} as const;

const S = SAMPLING_CONSTANTS;

function px(img: PixelImage, x: number, y: number): [number, number, number] {
  const i = (y * img.width + x) * 4;
  const d = img.data;
  return [d[i], d[i + 1], d[i + 2]];
}

function isClipped(r: number, g: number, b: number): boolean {
  return r >= S.clipLevel || g >= S.clipLevel || b >= S.clipLevel;
}

export function stepFor(g: FaceGeometry): number {
  // Keep sample counts roughly constant: stride 1 for normal faces, 2 for very large ones.
  return g.faceWidth > 700 ? 2 : 1;
}

/** Feature masks that skin sampling must avoid. */
export function featureExclusions(g: FaceGeometry): Shape[] {
  return [
    polygon(scalePts(g.rightEye, S.eyeDilate)),
    polygon(scalePts(g.leftEye, S.eyeDilate)),
    polygon(scalePts(g.rightBrow, S.browDilate)),
    polygon(scalePts(g.leftBrow, S.browDilate)),
    polygon(scalePts(g.lips, S.lipsDilate)),
  ];
}

export interface SkinRegions { rightCheek: Shape; leftCheek: Shape; forehead: Shape }

export function skinRegions(g: FaceGeometry): SkinRegions {
  const lm = g.landmarks;
  const rc = centroid(LM.RIGHT_CHEEK.map((i) => lm[i]));
  const lc = centroid(LM.LEFT_CHEEK.map((i) => lm[i]));
  const r = S.cheekRadius * g.iod;
  const fc = lm[LM.FOREHEAD_CENTER];
  const span = dist(lm[LM.FOREHEAD_TOP], lm[LM.GLABELLA]);
  return {
    rightCheek: ellipse(rc, r, r),
    leftCheek: ellipse(lc, r, r),
    forehead: ellipse(fc, S.foreheadRx * g.iod, Math.max(2, S.foreheadRyOfSpan * span)),
  };
}

/** Collect gated skin pixels (Lab after WB) from one region. */
export function collectSkin(img: PixelImage, region: Shape, g: FaceGeometry, wb: WhiteBalance): LabSet {
  const inside = polygon(scalePts(g.oval, 0.97));
  const excl = featureExclusions(g);
  const raw = makeLabSet(1024);
  forEachPixel(img.width, img.height, region, excl, stepFor(g), (x, y) => {
    if (!inside.contains(x + 0.5, y + 0.5)) return;
    const [r, gg, b] = px(img, x, y);
    if (isClipped(r, gg, b) || Math.max(r, gg, b) <= S.darkLevel) return;
    pushLab(raw, correctedLab(r, gg, b, wb));
  });
  if (raw.n === 0) return raw;
  const medL = median(raw.L.subarray(0, raw.n));
  const out = makeLabSet(raw.n);
  for (let i = 0; i < raw.n; i++) {
    const lab = labAt(raw, i);
    if (lab.L > medL + S.skinHighlightDL || lab.L < medL - S.skinShadowDL) continue; // specular / shadow
    const c = chroma(lab);
    if (c < S.skinMinChroma) continue;
    const h = hueDeg(lab);
    if (h < S.skinHueRange[0] || h > S.skinHueRange[1]) continue;
    pushLab(out, lab);
  }
  return out;
}

export interface SkinSample {
  lab: Lab | null;
  regions: { rightCheek: Lab | null; leftCheek: Lab | null; forehead: Lab | null };
  foreheadUsed: boolean;
  pixels: number;
  /** |L*(right cheek) - L*(left cheek)| — large values mean strong side lighting. */
  cheekDeltaL: number;
}

function meanLab(labs: Lab[]): Lab {
  const n = labs.length;
  return {
    L: labs.reduce((s, v) => s + v.L, 0) / n,
    a: labs.reduce((s, v) => s + v.a, 0) / n,
    b: labs.reduce((s, v) => s + v.b, 0) / n,
  };
}

export function sampleSkin(img: PixelImage, g: FaceGeometry, wb: WhiteBalance): SkinSample {
  const reg = skinRegions(g);
  const sets = {
    rightCheek: collectSkin(img, reg.rightCheek, g, wb),
    leftCheek: collectSkin(img, reg.leftCheek, g, wb),
    forehead: collectSkin(img, reg.forehead, g, wb),
  };
  const med = (s: LabSet) => (s.n >= S.minSkinPixels / 3 ? trimmedMedianLab(s, S.skinTrim, S.skinTrim) : null);
  const regions = { rightCheek: med(sets.rightCheek), leftCheek: med(sets.leftCheek), forehead: med(sets.forehead) };
  const cheeks = [regions.rightCheek, regions.leftCheek].filter((v): v is Lab => v !== null);
  const used: Lab[] = [...cheeks];
  let pixels = (regions.rightCheek ? sets.rightCheek.n : 0) + (regions.leftCheek ? sets.leftCheek.n : 0);
  let foreheadUsed = false;
  if (regions.forehead && (cheeks.length === 0 || deltaE76(regions.forehead, meanLab(cheeks)) <= S.foreheadMaxDE)) {
    used.push(regions.forehead);
    pixels += sets.forehead.n;
    foreheadUsed = true;
  }
  const cheekDeltaL = regions.rightCheek && regions.leftCheek ? Math.abs(regions.rightCheek.L - regions.leftCheek.L) : 0;
  const lab = used.length && pixels >= S.minSkinPixels ? meanLab(used) : null;
  return { lab, regions, foreheadUsed, pixels, cheekDeltaL };
}

export interface EyeSample { lab: Lab | null; pixels: number; perEye: [Lab | null, Lab | null] }

function sampleOneIris(img: PixelImage, eye: Point[], iris: { center: Point; radius: number }, wb: WhiteBalance): { lab: Lab | null; n: number } {
  const ring = annulus(iris.center, S.irisInner * iris.radius, S.irisOuter * iris.radius);
  const lid = polygon(eye);
  const set = makeLabSet(256);
  forEachPixel(img.width, img.height, ring, [], 1, (x, y) => {
    if (!lid.contains(x + 0.5, y + 0.5)) return; // eyelid occlusion
    const [r, g, b] = px(img, x, y);
    if (isClipped(r, g, b)) return;
    pushLab(set, correctedLab(r, g, b, wb));
  });
  if (set.n === 0) return { lab: null, n: 0 };
  const medL = median(set.L.subarray(0, set.n));
  const kept = makeLabSet(set.n);
  for (let i = 0; i < set.n; i++) {
    const lab = labAt(set, i);
    if (lab.L > medL + S.irisSpecularDL && chroma(lab) < S.irisSpecularMaxC) continue; // catchlight
    pushLab(kept, lab);
  }
  if (kept.n < S.minIrisPixels) return { lab: null, n: kept.n };
  return { lab: trimmedMedianLab(kept, S.irisTrimLow, S.irisTrimHigh), n: kept.n };
}

export function sampleEyes(img: PixelImage, g: FaceGeometry, wb: WhiteBalance): EyeSample {
  const r = sampleOneIris(img, g.rightEye, g.rightIris, wb);
  const l = sampleOneIris(img, g.leftEye, g.leftIris, wb);
  const both = [r.lab, l.lab].filter((v): v is Lab => v !== null);
  return { lab: both.length ? meanLab(both) : null, pixels: r.n + l.n, perEye: [r.lab, l.lab] };
}

/** Polygon of the hair band: the upper face oval offset outward from the face centre. */
export function hairBand(g: FaceGeometry): Shape {
  const arc = LM.UPPER_OVAL.map((i) => g.landmarks[i]);
  const c = g.center;
  const H = g.faceHeight;
  const off = (p: Point, k: number): Point => {
    const dx = p.x - c.x, dy = p.y - c.y;
    const n = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / n) * k * H, y: p.y + (dy / n) * k * H };
  };
  const inner = arc.map((p) => off(p, S.hairInner));
  const outer = arc.map((p) => off(p, S.hairOuter)).reverse();
  return polygon([...inner, ...outer]);
}

export interface HairSample { lab: Lab | null; pixels: number; candidates: number }

export function sampleHair(img: PixelImage, g: FaceGeometry, wb: WhiteBalance, skin: Lab | null, background: Lab | null = null): HairSample {
  const band = hairBand(g);
  const face = polygon(scalePts(g.oval, 1.03));
  const set = makeLabSet(2048);
  let candidates = 0;
  forEachPixel(img.width, img.height, band, [face], stepFor(g), (x, y) => {
    candidates++;
    const [r, gg, b] = px(img, x, y);
    if (isClipped(r, gg, b)) return;
    const lab = correctedLab(r, gg, b, wb);
    if (skin && deltaE76(lab, skin) < S.hairSkinDE) return; // forehead skin above the mesh top
    if (background && deltaE76(lab, background) < S.hairBackgroundDE) return; // wall behind the head
    pushLab(set, lab);
  });
  if (set.n < S.hairMinPixels || set.n < S.hairMinFraction * candidates) return { lab: null, pixels: set.n, candidates };
  return { lab: trimmedMedianLab(set, S.hairTrim, S.hairTrim), pixels: set.n, candidates };
}

/** Median linear RGB of the visible sclera (eye white), pre-white-balance, or null. */
export function sampleSclera(img: PixelImage, g: FaceGeometry): RGB | null {
  const rs: number[] = [], gs: number[] = [], bs: number[] = [], ls: number[] = [];
  const eyes: [Point[], { center: Point; radius: number }][] = [[g.rightEye, g.rightIris], [g.leftEye, g.leftIris]];
  for (const [eye, iris] of eyes) {
    const lid = polygon(scalePts(eye, 0.9));
    const irisDisc = ellipse(iris.center, 1.15 * iris.radius, 1.15 * iris.radius);
    forEachPixel(img.width, img.height, lid, [irisDisc], 1, (x, y) => {
      const [r, gg, b] = px(img, x, y);
      if (isClipped(r, gg, b)) return;
      const lr = SRGB_TO_LINEAR[r], lg = SRGB_TO_LINEAR[gg], lb = SRGB_TO_LINEAR[b];
      const lab = linearRgbToLab(lr, lg, lb);
      if (chroma(lab) > 25) return;
      rs.push(lr); gs.push(lg); bs.push(lb); ls.push(lab.L);
    });
  }
  if (rs.length < WB_CONSTANTS.minScleraPixels) return null;
  // Keep the brighter half: the sclera, not lashes or lid shadow.
  const cut = quantile(ls, 0.5);
  const R: number[] = [], G: number[] = [], B: number[] = [];
  for (let i = 0; i < rs.length; i++) if (ls[i] >= cut) { R.push(rs[i]); G.push(gs[i]); B.push(bs[i]); }
  if (R.length < WB_CONSTANTS.minScleraPixels / 2 || median(ls) < 35) return null;
  return [median(R), median(G), median(B)];
}

function backgroundShapes(img: PixelImage, g: FaceGeometry): { all: Shape; exclude: Shape[]; stride: number } {
  const H = g.faceHeight;
  const head = ellipse({ x: g.center.x, y: g.center.y - 0.1 * H }, 1.0 * g.faceWidth, 0.95 * H);
  const chinY = g.landmarks[LM.CHIN].y;
  const neck = rect({ x0: g.center.x - 0.75 * g.faceWidth, y0: chinY - 0.05 * H, x1: g.center.x + 0.75 * g.faceWidth, y1: img.height });
  const all = rect({ x0: 0, y0: 0, x1: img.width, y1: img.height });
  const stride = Math.max(1, Math.round(Math.max(img.width, img.height) / 320));
  return { all, exclude: [head, neck], stride };
}

/** Per-channel median Lab (after WB) of the background region, or null if too little of it is visible. */
export function sampleBackgroundLab(img: PixelImage, g: FaceGeometry, wb: WhiteBalance): Lab | null {
  const { all, exclude, stride } = backgroundShapes(img, g);
  const set = makeLabSet(4096);
  forEachPixel(img.width, img.height, all, exclude, stride * 2, (x, y) => {
    const [r, gg, b] = px(img, x, y);
    pushLab(set, correctedLab(r, gg, b, wb));
  });
  if (set.n < 50) return null;
  return { L: median(set.L.subarray(0, set.n)), a: median(set.a.subarray(0, set.n)), b: median(set.b.subarray(0, set.n)) };
}

/**
 * Grey-world mean (linear RGB) of low-chroma background pixels: everything outside a generous
 * head ellipse and outside a neck/chest box below the chin. Null if too few pixels.
 */
export function sampleBackground(img: PixelImage, g: FaceGeometry): RGB | null {
  const { all, exclude, stride } = backgroundShapes(img, g);
  let sr = 0, sg = 0, sb = 0, n = 0;
  const maxC = WB_CONSTANTS.backgroundMaxChroma;
  forEachPixel(img.width, img.height, all, exclude, stride, (x, y) => {
    const [r, gg, b] = px(img, x, y);
    if (isClipped(r, gg, b) || luma8(r, gg, b) < 25) return;
    const lr = SRGB_TO_LINEAR[r], lg = SRGB_TO_LINEAR[gg], lb = SRGB_TO_LINEAR[b];
    if (chroma(linearRgbToLab(lr, lg, lb)) > maxC) return;
    sr += lr; sg += lg; sb += lb; n++;
  });
  const needed = WB_CONSTANTS.minBackgroundPixels / (stride * stride);
  if (n < Math.max(50, needed)) return null;
  return [sr / n, sg / n, sb / n];
}
