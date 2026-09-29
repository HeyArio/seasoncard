import "server-only";
import { signToken, verifyToken } from "./token";
import { reportPayloadSchema, type ReportPayload } from "./schemas";
import { requireEnv } from "./env";

export function signReportToken(payload: ReportPayload, secret = requireEnv("REPORT_TOKEN_SECRET")): string {
  return signToken(reportPayloadSchema.parse(payload), secret);
}

export function verifyReportToken(token: string, secret = requireEnv("REPORT_TOKEN_SECRET")): ReportPayload | null {
  const raw = verifyToken(token, secret);
  if (raw === null) return null;
  const parsed = reportPayloadSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
