"use client";
/**
 * Client-side image generation (no uploads): the 1080×1920 Season Card story image and the
 * 1170×2532 phone wallpaper. Uses the self-hosted Fraunces + Manrope faces from globals.css.
 */
import type { Metrics } from "./schemas";

const C = {
  ground: "#F5EFE6",
  card: "#FFFDF9",
  ink: "#211C18",
  muted: "#5E544B",
  line: "#E3D8CA",
  accent: "#9A4A24",
  chip: "#F5EFE6",
};
const DISPLAY = "Fraunces, Georgia, serif";
const BODY = "Manrope, system-ui, sans-serif";

async function fontsReady() {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load(`600 120px ${DISPLAY}`),
      document.fonts.load(`italic 400 84px ${DISPLAY}`),
      document.fonts.load(`700 48px ${BODY}`),
      document.fonts.load(`500 40px ${BODY}`),
    ]);
  } catch {
    /* fall back to system fonts */
  }
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: string, family: string, start: number, maxW: number) {
  let size = start;
  do {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxW) break;
    size -= 4;
  } while (size > 24);
  return size;
}

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  // Letter-spaced, centred text.
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let cx = x - total / 2;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  chars.forEach((c, i) => {
    ctx.fillText(c, cx, y);
    cx += widths[i] + spacing;
  });
  ctx.textAlign = prev;
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encode failed"))), "image/png"));
}

export interface CardInput {
  seasonName: string;
  tagline: string;
  swatches: string[];
  metrics: Metrics;
}

const METRIC_TITLES: [keyof Metrics, string][] = [
  ["undertone", "Undertone"],
  ["depth", "Depth"],
  ["contrast", "Contrast"],
  ["chroma", "Chroma"],
];

/** 1080×1920 story image. Includes "What's yours?" and "seasoncard.app". */
export async function renderSeasonCardPng(input: CardInput): Promise<Blob> {
  await fontsReady();
  const W = 1080, H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = C.ground;
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = C.muted;
  ctx.font = `700 34px ${BODY}`;
  spaced(ctx, "MY SEASON CARD", W / 2, 180, 8);

  // Card
  const cx = 80, cy = 240, cw = W - 160, ch = 1290;
  ctx.save();
  ctx.shadowColor = "rgba(33,28,24,0.08)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  rr(ctx, cx, cy, cw, ch, 64);
  ctx.fillStyle = C.card;
  ctx.fill();
  ctx.restore();
  rr(ctx, cx, cy, cw, ch, 64);
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = C.muted;
  ctx.font = `500 44px ${BODY}`;
  ctx.fillText("I'm a", W / 2, cy + 130);

  ctx.fillStyle = C.ink;
  fitFont(ctx, input.seasonName, "600", DISPLAY, 128, cw - 120);
  ctx.fillText(input.seasonName, W / 2, cy + 275);

  if (input.tagline) {
    ctx.fillStyle = C.muted;
    fitFont(ctx, input.tagline, "500", BODY, 42, cw - 140);
    ctx.fillText(input.tagline, W / 2, cy + 355);
  }

  // Swatches
  const sw = 186, sh = 360, gap = 22;
  const sx = W / 2 - (4 * sw + 3 * gap) / 2;
  const sy = cy + 430;
  input.swatches.slice(0, 4).forEach((hex, i) => {
    rr(ctx, sx + i * (sw + gap), sy, sw, sh, 40);
    ctx.fillStyle = hex;
    ctx.fill();
  });

  // Metric chips (2×2)
  const mw = (cw - 120 - 24) / 2, mh = 150;
  const mx = cx + 60, my = sy + sh + 64;
  METRIC_TITLES.forEach(([key, title], i) => {
    const x = mx + (i % 2) * (mw + 24);
    const y = my + Math.floor(i / 2) * (mh + 24);
    rr(ctx, x, y, mw, mh, 75);
    ctx.fillStyle = C.chip;
    ctx.fill();
    ctx.fillStyle = C.muted;
    ctx.font = `600 30px ${BODY}`;
    ctx.fillText(title.toUpperCase(), x + mw / 2, y + 60);
    ctx.fillStyle = C.ink;
    fitFont(ctx, input.metrics[key].label, "700", BODY, 44, mw - 40);
    ctx.fillText(input.metrics[key].label, x + mw / 2, y + 115);
  });

  // Footer
  ctx.fillStyle = C.ink;
  ctx.font = `italic 400 96px ${DISPLAY}`;
  ctx.fillText("What's yours?", W / 2, 1700);
  ctx.fillStyle = C.accent;
  ctx.font = `700 50px ${BODY}`;
  ctx.fillText("seasoncard.app", W / 2, 1800);

  return toBlob(canvas);
}

/** 1170×2532 phone wallpaper: the 36-colour palette as a grid. */
export async function renderWallpaperPng(input: { seasonName: string; palette: string[]; swatches: string[] }): Promise<Blob> {
  await fontsReady();
  const W = 1170, H = 2532;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = C.ground;
  ctx.fillRect(0, 0, W, H);

  // Three soft overlapping circles below the lock-screen clock.
  const circles = input.swatches.slice(0, 3);
  ctx.globalAlpha = 0.9;
  circles.forEach((hex, i) => {
    ctx.beginPath();
    ctx.arc(W / 2 + (i - 1) * 120, 900, 130, 0, Math.PI * 2);
    ctx.fillStyle = hex;
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  ctx.textAlign = "center";
  ctx.fillStyle = C.ink;
  fitFont(ctx, input.seasonName, "600", DISPLAY, 104, W - 200);
  ctx.fillText(input.seasonName, W / 2, 1200);

  const cols = 6, gap = 20, margin = 100;
  const cell = (W - margin * 2 - gap * (cols - 1)) / cols;
  const gy = 1290;
  input.palette.slice(0, 36).forEach((hex, i) => {
    const x = margin + (i % cols) * (cell + gap);
    const y = gy + Math.floor(i / cols) * (cell + gap);
    rr(ctx, x, y, cell, cell, 30);
    ctx.fillStyle = hex;
    ctx.fill();
  });

  ctx.fillStyle = C.muted;
  ctx.font = `700 38px ${BODY}`;
  ctx.fillText("seasoncard.app", W / 2, H - 120);
  return toBlob(canvas);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Web Share with the PNG where supported; otherwise falls back to a download. */
export async function shareImage(blob: Blob, filename: string, text: string): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    }
  }
  downloadBlob(blob, filename);
  return "downloaded";
}
