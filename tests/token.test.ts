import { describe, expect, it, beforeEach } from "vitest";
import { signToken, verifyToken, isWithinRefundWindow, REFUND_WINDOW_MS, refundDeadline } from "@/lib/token";
import { signReportToken, verifyReportToken } from "@/lib/report-token";
import type { ReportPayload } from "@/lib/schemas";

const SECRET = "test-secret-0123456789abcdef";

const payload: ReportPayload = {
  orderId: "5O190127TN364715T",
  captureId: "3C679366HH908993F",
  season: "soft-autumn",
  metrics: {
    undertone: { score: 0.66, label: "Warm-neutral" },
    depth: { score: 0.5, label: "Medium" },
    contrast: { score: 0.14, label: "Low" },
    chroma: { score: 0.14, label: "Soft" },
  },
  samples: { skin: "#C9A084", eyes: "#6E583E", hair: "#5C4230" },
  capsule: true,
  amount: "14.98",
  paidAt: "2026-09-20T10:00:00Z",
  payerEmail: "buyer@example.com",
};

describe("signToken / verifyToken", () => {
  it("round-trips a payload", () => {
    const t = signToken(payload, SECRET);
    expect(t.split(".")).toHaveLength(2);
    expect(verifyToken(t, SECRET)).toEqual(payload);
  });

  it("uses base64url payload + HMAC-SHA256 signature", () => {
    const t = signToken({ a: 1 }, SECRET);
    const [p, s] = t.split(".");
    expect(JSON.parse(Buffer.from(p, "base64url").toString())).toEqual({ a: 1 });
    expect(Buffer.from(s, "base64url")).toHaveLength(32);
  });

  it("rejects a tampered payload", () => {
    const t = signToken(payload, SECRET);
    const [, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ ...payload, capsule: true, amount: "0.01" })).toString("base64url");
    expect(verifyToken(`${forged}.${sig}`, SECRET)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const t = signToken(payload, SECRET);
    const last = t.at(-1) === "A" ? "B" : "A";
    expect(verifyToken(t.slice(0, -1) + last, SECRET)).toBeNull();
    expect(verifyToken(t.split(".")[0] + ".", SECRET)).toBeNull();
  });

  it("rejects a token signed with another secret", () => {
    expect(verifyToken(signToken(payload, "another-secret-abcdefghijk"), SECRET)).toBeNull();
  });

  it("rejects malformed input", () => {
    for (const bad of ["", "abc", "a.b.c", "!!.??", "x".repeat(5000)]) expect(verifyToken(bad, SECRET)).toBeNull();
  });

  it("refuses short secrets when signing", () => {
    expect(() => signToken(payload, "short")).toThrow();
  });
});

describe("report tokens (schema-validated)", () => {
  beforeEach(() => {
    process.env.REPORT_TOKEN_SECRET = SECRET;
  });

  it("signs and verifies a report payload", () => {
    const t = signReportToken(payload);
    expect(verifyReportToken(t)).toEqual(payload);
  });

  it("rejects a validly signed token whose payload fails the schema", () => {
    const t = signToken({ ...payload, season: "neon-winter" }, SECRET);
    expect(verifyReportToken(t)).toBeNull();
  });

  it("rejects extra/unknown fields", () => {
    const t = signToken({ ...payload, admin: true }, SECRET);
    expect(verifyReportToken(t)).toBeNull();
  });
});

describe("refund window (7 days from paidAt)", () => {
  const paidAt = "2026-09-20T10:00:00.000Z";
  const at = (ms: number) => new Date(Date.parse(paidAt) + ms);

  it("is open right after payment", () => expect(isWithinRefundWindow(paidAt, at(1000))).toBe(true));
  it("is open at 6 days 23 hours", () => expect(isWithinRefundWindow(paidAt, at(REFUND_WINDOW_MS - 3600_000))).toBe(true));
  it("is open at exactly 7 days", () => expect(isWithinRefundWindow(paidAt, at(REFUND_WINDOW_MS))).toBe(true));
  it("is closed one second after 7 days", () => expect(isWithinRefundWindow(paidAt, at(REFUND_WINDOW_MS + 1000))).toBe(false));
  it("is closed for a paidAt far in the future", () => expect(isWithinRefundWindow(paidAt, at(-86_400_000))).toBe(false));
  it("is closed for an unparseable date", () => expect(isWithinRefundWindow("nope", at(0))).toBe(false));
  it("computes the deadline", () => expect(refundDeadline(paidAt).toISOString()).toBe("2026-09-27T10:00:00.000Z"));
});
