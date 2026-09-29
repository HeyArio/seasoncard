// Pixel-buffer utilities: deterministic resampling and sharpness / exposure statistics.
import type { PixelImage } from './types';
import type { BBox, Shape } from './geometry';
import { forEachPixel } from './geometry';
import { luma8 } from './color';

/**
 * Area-average downscale so the long side is at most `maxSide`. Pure JS (no canvas
 * resampling), so the result depends only on the input pixels. Returns the input unchanged if
 * it is already small enough.
 */
export function downscale(img: PixelImage, maxSide: number): PixelImage {
  const { width: w, height: h, data } = img;
  const s = Math.max(w, h) / maxSide;
  if (s <= 1) return img;
  const W = Math.max(1, Math.round(w / s));
  const H = Math.max(1, Math.round(h / s));
  const out = new Uint8ClampedArray(W * H * 4);
  const sx = w / W, sy = h / H;
  for (let Y = 0; Y < H; Y++) {
    const y0 = Math.floor(Y * sy), y1 = Math.max(y0 + 1, Math.floor((Y + 1) * sy));
    for (let X = 0; X < W; X++) {
      const x0 = Math.floor(X * sx), x1 = Math.max(x0 + 1, Math.floor((X + 1) * sx));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let y = y0; y < y1; y++) {
        let i = (y * w + x0) * 4;
        for (let x = x0; x < x1; x++, i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; a += data[i + 3]; n++; }
      }
      const o = (Y * W + X) * 4;
      out[o] = Math.round(r / n); out[o + 1] = Math.round(g / n); out[o + 2] = Math.round(b / n); out[o + 3] = Math.round(a / n);
    }
  }
  return { width: W, height: H, data: out };
}

/** Luma of a box, area-resampled to size x size (nearest when upsampling). */
export function grayCrop(img: PixelImage, box: BBox, size: number): Float64Array {
  const out = new Float64Array(size * size);
  const bx0 = Math.max(0, Math.floor(box.x0)), by0 = Math.max(0, Math.floor(box.y0));
  const bx1 = Math.min(img.width, Math.ceil(box.x1)), by1 = Math.min(img.height, Math.ceil(box.y1));
  const bw = Math.max(1, bx1 - bx0), bh = Math.max(1, by1 - by0);
  const sx = bw / size, sy = bh / size;
  const d = img.data;
  for (let Y = 0; Y < size; Y++) {
    const y0 = by0 + Math.floor(Y * sy), y1 = Math.max(y0 + 1, by0 + Math.floor((Y + 1) * sy));
    for (let X = 0; X < size; X++) {
      const x0 = bx0 + Math.floor(X * sx), x1 = Math.max(x0 + 1, bx0 + Math.floor((X + 1) * sx));
      let s = 0, n = 0;
      for (let y = y0; y < y1 && y < img.height; y++) {
        for (let x = x0; x < x1 && x < img.width; x++) {
          const i = (y * img.width + x) * 4;
          s += luma8(d[i], d[i + 1], d[i + 2]); n++;
        }
      }
      out[Y * size + X] = n ? s / n : 0;
    }
  }
  return out;
}

/** Variance of the 4-neighbour Laplacian — the standard focus measure (low = blurry). */
export function laplacianVariance(gray: Float64Array, w: number, h: number): number {
  let s = 0, s2 = 0, n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v = gray[i - w] + gray[i + w] + gray[i - 1] + gray[i + 1] - 4 * gray[i];
      s += v; s2 += v * v; n++;
    }
  }
  if (n === 0) return 0;
  const m = s / n;
  return s2 / n - m * m;
}

export interface ExposureStats { medianLuma: number; p98Luma: number; clippedFraction: number; darkFraction: number; pixels: number }

/** Exposure statistics over a region (luma histogram, so the median is exact and fast). */
export function exposureStats(img: PixelImage, region: Shape, exclude: Shape[] = []): ExposureStats {
  const hist = new Uint32Array(256);
  let n = 0, clipped = 0, dark = 0;
  const d = img.data;
  forEachPixel(img.width, img.height, region, exclude, 2, (x, y) => {
    const i = (y * img.width + x) * 4;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const l = Math.round(luma8(r, g, b));
    hist[l]++; n++;
    if (r >= 250 || g >= 250 || b >= 250) clipped++;
    if (l < 20) dark++;
  });
  const pct = (p: number) => {
    let acc = 0;
    for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= p * n) return i; }
    return 255;
  };
  return {
    medianLuma: n ? pct(0.5) : 0, p98Luma: n ? pct(0.98) : 0,
    clippedFraction: n ? clipped / n : 0, darkFraction: n ? dark / n : 0, pixels: n,
  };
}
