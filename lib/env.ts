import "server-only";
import { chmodSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type ServerEnvKey =
  | "PAYPAL_CLIENT_ID"
  | "PAYPAL_CLIENT_SECRET"
  | "PAYPAL_ENV"
  | "PAYPAL_WEBHOOK_ID"
  | "REPORT_TOKEN_SECRET"
  | "ADMIN_KEY"
  | "SITE_URL"
  | "SETUP_CODE";

/** Keys the owner can set from the browser on /setup (stored in the settings file, never in git). */
export const SETTINGS_KEYS = ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_ENV", "PAYPAL_WEBHOOK_ID"] as const;
export type SettingsKey = (typeof SETTINGS_KEYS)[number];
type Settings = Partial<Record<SettingsKey, string>>;

export class MissingEnvError extends Error {
  constructor(public key: string) {
    super(`Missing required environment variable ${key}`);
  }
}

export function settingsFile(): string {
  return process.env.SETTINGS_FILE?.trim() || "/data/settings.json";
}

let cache: { mtimeMs: number; data: Settings } | null = null;

/** Settings saved from /setup. Cached; re-read only when the file changes. */
export function readSettings(): Settings {
  const file = settingsFile();
  try {
    const st = statSync(/*turbopackIgnore: true*/ file);
    if (cache && cache.mtimeMs === st.mtimeMs) return cache.data;
    const raw = JSON.parse(readFileSync(/*turbopackIgnore: true*/ file, "utf8")) as Record<string, unknown>;
    const data: Settings = {};
    for (const k of SETTINGS_KEYS) if (typeof raw[k] === "string" && raw[k]) data[k] = (raw[k] as string).trim();
    cache = { mtimeMs: st.mtimeMs, data };
    return data;
  } catch {
    return {};
  }
}

export function writeSettings(patch: Settings): void {
  const file = settingsFile();
  const next = { ...readSettings(), ...patch };
  mkdirSync(/*turbopackIgnore: true*/ dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(/*turbopackIgnore: true*/ tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
  renameSync(/*turbopackIgnore: true*/ tmp, file);
  try {
    chmodSync(/*turbopackIgnore: true*/ file, 0o600);
  } catch {
    /* best effort */
  }
  cache = null;
}

function lookup(key: ServerEnvKey): string | undefined {
  const fromEnv = process.env[key]?.trim();
  if (fromEnv) return fromEnv;
  if ((SETTINGS_KEYS as readonly string[]).includes(key)) return readSettings()[key as SettingsKey];
  return undefined;
}

export function requireEnv(key: ServerEnvKey): string {
  const v = lookup(key);
  if (!v) throw new MissingEnvError(key);
  return v;
}

export function optionalEnv(key: ServerEnvKey): string | undefined {
  const v = lookup(key);
  return v ? v : undefined;
}

export function paypalEnv(): "sandbox" | "live" {
  return lookup("PAYPAL_ENV") === "live" ? "live" : "sandbox";
}

export function isPayPalConfigured(): boolean {
  return Boolean(lookup("PAYPAL_CLIENT_ID") && lookup("PAYPAL_CLIENT_SECRET"));
}

export function siteUrl(): string {
  return (optionalEnv("SITE_URL") ?? "http://localhost:3000").replace(/\/+$/, "");
}
