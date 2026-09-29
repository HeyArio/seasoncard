import "server-only";

export type ServerEnvKey =
  | "PAYPAL_CLIENT_ID"
  | "PAYPAL_CLIENT_SECRET"
  | "PAYPAL_ENV"
  | "PAYPAL_WEBHOOK_ID"
  | "REPORT_TOKEN_SECRET"
  | "ADMIN_KEY"
  | "SITE_URL";

export class MissingEnvError extends Error {
  constructor(public key: string) {
    super(`Missing required environment variable ${key}`);
  }
}

export function requireEnv(key: ServerEnvKey): string {
  const v = process.env[key]?.trim();
  if (!v) throw new MissingEnvError(key);
  return v;
}

export function optionalEnv(key: ServerEnvKey): string | undefined {
  const v = process.env[key]?.trim();
  return v ? v : undefined;
}

export function paypalEnv(): "sandbox" | "live" {
  return process.env.PAYPAL_ENV?.trim() === "live" ? "live" : "sandbox";
}

export function siteUrl(): string {
  return (optionalEnv("SITE_URL") ?? "http://localhost:3000").replace(/\/+$/, "");
}
