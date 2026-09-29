// Renders scripts/og.html to app/opengraph-image.png (static OG image). Run: node scripts/make-og.mjs
import { chromium } from "playwright-core";
import path from "node:path";
import { chromePath } from "./chrome-path.mjs";

const root = path.resolve(import.meta.dirname, "..");
const browser = await chromium.launch({ executablePath: chromePath() });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(`file://${path.join(root, "scripts/og.html")}`);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: path.join(root, "app/opengraph-image.png") });
await browser.close();
console.log("wrote app/opengraph-image.png");
