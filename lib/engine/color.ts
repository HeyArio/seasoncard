// Colour science: sRGB (IEC 61966-2-1) <-> linear RGB <-> XYZ (D65) <-> CIELAB / LCh.
// Pure functions, no DOM.
import type { Lab } from './types';

/** 8-bit sRGB value -> linear [0,1]. Precomputed LUT (deterministic, fast). */
export const SRGB_TO_LINEAR: Float64Array = (() => {
  const t = new Float64Array(256);
  for (let i = 0; i < 256; i++) {
    const c = i / 255;
    t[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  return t;
})();

export function srgbToLinear(c8: number): number {
  const c = c8 / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** linear [0,1] -> 8-bit sRGB (rounded, clamped). */
export function linearToSrgb8(v: number): number {
  const x = v <= 0 ? 0 : v >= 1 ? 1 : v;
  const c = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  return Math.round(c * 255);
}

// D65 reference white (CIE 1931 2°), normalised Y = 1.
const XN = 0.95047;
const YN = 1.0;
const ZN = 1.08883;
const EPS = 216 / 24389; // (6/29)^3
const KAPPA = 24389 / 27; // (29/3)^3

function f(t: number): number {
  return t > EPS ? Math.cbrt(t) : (KAPPA * t + 16) / 116;
}
function finv(t: number): number {
  const t3 = t * t * t;
  return t3 > EPS ? t3 : (116 * t - 16) / KAPPA;
}

/** Linear sRGB [0,1] -> CIELAB (D65). */
export function linearRgbToLab(r: number, g: number, b: number): Lab {
  const X = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const Y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const Z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;
  const fx = f(X / XN);
  const fy = f(Y / YN);
  const fz = f(Z / ZN);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

/** CIELAB (D65) -> linear sRGB (may be out of [0,1] for out-of-gamut colours). */
export function labToLinearRgb(lab: Lab): [number, number, number] {
  const fy = (lab.L + 16) / 116;
  const fx = fy + lab.a / 500;
  const fz = fy - lab.b / 200;
  const X = XN * finv(fx);
  const Y = YN * finv(fy);
  const Z = ZN * finv(fz);
  return [
    3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z,
    -0.969266 * X + 1.8760108 * Y + 0.041556 * Z,
    0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z,
  ];
}

export function srgb8ToLab(r: number, g: number, b: number): Lab {
  return linearRgbToLab(SRGB_TO_LINEAR[r & 255], SRGB_TO_LINEAR[g & 255], SRGB_TO_LINEAR[b & 255]);
}

export function labToSrgb8(lab: Lab): [number, number, number] {
  const [r, g, b] = labToLinearRgb(lab);
  return [linearToSrgb8(r), linearToSrgb8(g), linearToSrgb8(b)];
}

export function labToHex(lab: Lab): string {
  const [r, g, b] = labToSrgb8(lab);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function hexToLab(hex: string): Lab {
  const h = hex.replace('#', '');
  return srgb8ToLab(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
}

/** Chroma C*ab. */
export function chroma(lab: Lab): number {
  return Math.sqrt(lab.a * lab.a + lab.b * lab.b);
}

/** Hue angle h_ab in degrees, [0, 360). */
export function hueDeg(lab: Lab): number {
  const h = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  return h < 0 ? h + 360 : h;
}

/** CIE76 colour difference. Adequate for the coarse gates used here. */
export function deltaE76(p: Lab, q: Lab): number {
  const dL = p.L - q.L;
  const da = p.a - q.a;
  const db = p.b - q.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

/** Rec.709 luma of an 8-bit sRGB pixel (gamma-encoded, 0..255) — used for exposure/blur checks. */
export function luma8(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
