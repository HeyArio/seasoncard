import fs from "node:fs";
import path from "node:path";

/** Uses the preinstalled Playwright Chromium (PLAYWRIGHT_BROWSERS_PATH, default /opt/pw-browsers). */
export function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers";
  const dir = fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort().at(-1);
  if (!dir) throw new Error(`No chromium-* in ${base}`);
  return path.join(base, dir, "chrome-linux", "chrome");
}
