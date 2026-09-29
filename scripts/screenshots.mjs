// Visual check: `next start` must be running with the same REPORT_TOKEN_SECRET.
//   REPORT_TOKEN_SECRET=local-screenshot-secret-123 npx next start -p 3100 &
//   BASE_URL=http://localhost:3100 REPORT_TOKEN_SECRET=local-screenshot-secret-123 node scripts/screenshots.mjs
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { chromePath } from "./chrome-path.mjs";
import { signToken } from "../lib/token.ts";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "screenshots");
fs.mkdirSync(out, { recursive: true });
const BASE = process.env.BASE_URL || "http://localhost:3100";
const SECRET = process.env.REPORT_TOKEN_SECRET;
if (!SECRET) throw new Error("REPORT_TOKEN_SECRET required");

const mockResult = {
  season: "soft-autumn",
  family: "autumn",
  runnerUp: "true-autumn",
  confidence: 0.74,
  metrics: {
    undertone: { score: 0.66, label: "Warm-neutral" },
    depth: { score: 0.52, label: "Medium" },
    contrast: { score: 0.15, label: "Low" },
    chroma: { score: 0.13, label: "Soft" },
  },
  samples: { skin: "#C9A084", eyes: "#6E583E", hair: "#5C4230" },
  quality: { ok: true, issues: [] },
  version: "0.0.0-mock",
};
const token = signToken(
  {
    orderId: "5O190127TN364715T",
    captureId: "3C679366HH908993F",
    season: "soft-autumn",
    metrics: mockResult.metrics,
    samples: mockResult.samples,
    capsule: true,
    amount: "14.98",
    paidAt: new Date(Date.now() - 3600_000).toISOString(),
    payerEmail: "buyer@example.com",
  },
  SECRET,
);

const browser = await chromium.launch({ executablePath: chromePath() });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true });
await ctx.addInitScript((r) => {
  if (location.pathname === "/result" || location.pathname === "/checkout") sessionStorage.setItem("sc:result", JSON.stringify(r));
}, mockResult);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`${page.url()}: console: ${m.text()}`));

async function shot(url, name, prep) {
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  if (prep) await prep();
  await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
  console.log(`saved screenshots/${name}.png`);
}

await shot("/", "01-landing");
await shot("/scan", "02-scan");
await shot("/result", "03-result");
await shot("/checkout", "04-checkout");
await shot(`/r/${token}`, "05-report");
await shot("/r/not-a-valid-token", "06-report-invalid");

// Generated images (client-side canvas) via their download buttons.
async function grab(url, buttonName, file) {
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: buttonName }).click()]);
  await dl.saveAs(path.join(out, file));
  console.log(`saved screenshots/${file}`);
}
await grab("/result", "Save image", "07-story-card-1080x1920.png");
await grab(`/r/${token}`, "Phone wallpaper", "08-wallpaper-1170x2532.png");

// Scan: upload a very dark image to exercise the retake guidance.
await page.goto(`${BASE}/scan`, { waitUntil: "networkidle" });
const dark = Buffer.from(
  await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 200; c.height = 260;
    const x = c.getContext("2d"); x.fillStyle = "#0b0908"; x.fillRect(0, 0, 200, 260);
    const b = await new Promise((r) => c.toBlob(r, "image/png"));
    return Array.from(new Uint8Array(await b.arrayBuffer()));
  }),
);
await page.setInputFiles("#photo-upload", { name: "dark.png", mimeType: "image/png", buffer: dark });
await page.getByText("It's a bit dark").waitFor();
await page.screenshot({ path: path.join(out, "09-scan-retake.png"), fullPage: true });
console.log("saved screenshots/09-scan-retake.png");

// Print stylesheet check (Save as PDF).
await page.goto(`${BASE}/r/${token}`, { waitUntil: "networkidle" });
await page.pdf({ path: path.join(out, "10-report-print.pdf"), format: "A4", printBackground: true });
console.log("saved screenshots/10-report-print.pdf");

await browser.close();
if (errors.length) {
  console.log("PAGE ERRORS:\n" + errors.join("\n"));
  process.exitCode = 1;
}
