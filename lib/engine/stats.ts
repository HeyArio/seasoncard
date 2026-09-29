// Robust statistics. All functions are deterministic (numeric typed-array sorts only).
import type { Lab } from './types';

/** Median of a numeric array (copy is sorted; input untouched). NaN for empty input. */
export function median(values: ArrayLike<number>): number {
  const n = values.length;
  if (n === 0) return NaN;
  const s = Float64Array.from(values).sort();
  const m = n >> 1;
  return n % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** p-th quantile (0..1) with linear interpolation. */
export function quantile(values: ArrayLike<number>, p: number): number {
  const n = values.length;
  if (n === 0) return NaN;
  const s = Float64Array.from(values).sort();
  const pos = Math.min(Math.max(p, 0), 1) * (n - 1);
  const lo = Math.floor(pos);
  const hi = Math.min(lo + 1, n - 1);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

/** A set of Lab samples stored column-wise. */
export interface LabSet { L: Float64Array; a: Float64Array; b: Float64Array; n: number }

export function makeLabSet(capacity: number): LabSet {
  return { L: new Float64Array(capacity), a: new Float64Array(capacity), b: new Float64Array(capacity), n: 0 };
}

export function pushLab(set: LabSet, lab: Lab): void {
  if (set.n === set.L.length) {
    const cap = Math.max(16, set.L.length * 2);
    const grow = (x: Float64Array) => { const y = new Float64Array(cap); y.set(x); return y; };
    set.L = grow(set.L); set.a = grow(set.a); set.b = grow(set.b);
  }
  set.L[set.n] = lab.L; set.a[set.n] = lab.a; set.b[set.n] = lab.b; set.n++;
}

export function labAt(set: LabSet, i: number): Lab {
  return { L: set.L[i], a: set.a[i], b: set.b[i] };
}

/**
 * Trimmed median in Lab: rank the samples by L*, drop the lowest `trimLow` and highest
 * `trimHigh` fraction (shadows / highlights that survived gating), then take the
 * per-channel median of what remains.
 */
export function trimmedMedianLab(set: LabSet, trimLow = 0.2, trimHigh = 0.2): Lab | null {
  const n = set.n;
  if (n === 0) return null;
  // Deterministic ordering: sort indices by (L, a, b, index).
  const idx = Array.from({ length: n }, (_, i) => i);
  idx.sort((i, j) => set.L[i] - set.L[j] || set.a[i] - set.a[j] || set.b[i] - set.b[j] || i - j);
  const lo = Math.floor(n * trimLow);
  const hi = Math.max(lo + 1, n - Math.floor(n * trimHigh));
  const m = hi - lo;
  const L = new Float64Array(m), a = new Float64Array(m), b = new Float64Array(m);
  for (let k = 0; k < m; k++) { const i = idx[lo + k]; L[k] = set.L[i]; a[k] = set.a[i]; b[k] = set.b[i]; }
  return { L: median(L), a: median(a), b: median(b) };
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Linear map of v from [lo, hi] onto [0, 1], clamped. Works for lo > hi (inverted scale). */
export function ramp(v: number, lo: number, hi: number): number {
  return clamp01((v - lo) / (hi - lo));
}

export function logistic(v: number, center: number, scale: number): number {
  return 1 / (1 + Math.exp(-(v - center) / scale));
}

/** Round to a fixed number of decimals (used to make outputs stable and comparable). */
export function round(v: number, decimals: number): number {
  const k = Math.pow(10, decimals);
  return Math.round(v * k) / k;
}
