"use client";
import { storedResultSchema, type StoredResult } from "./schemas";

const KEY = "sc:result";
const LAST_REPORT = "sc:lastReport";

export function saveResult(r: unknown) {
  try { sessionStorage.setItem(KEY, JSON.stringify(r)); } catch { /* storage blocked */ }
}

export function loadResult(): StoredResult | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const p = storedResultSchema.safeParse(JSON.parse(raw));
    return p.success ? p.data : null;
  } catch {
    return null;
  }
}

export function rememberReport(url: string) {
  try { localStorage.setItem(LAST_REPORT, url); } catch { /* ignore */ }
}
export function lastReport(): string | null {
  try { return localStorage.getItem(LAST_REPORT); } catch { return null; }
}
