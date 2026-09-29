// Partner referral links: seasoncard.app/?ref=<partner>. Stored for 30 days in this browser only.
const KEY = "sc_ref";
const TTL = 30 * 24 * 60 * 60 * 1000;
const VALID = /^[a-z0-9-]{1,32}$/;

export function captureRef(search: string): void {
  try {
    const ref = new URLSearchParams(search).get("ref")?.toLowerCase().trim();
    if (ref && VALID.test(ref)) localStorage.setItem(KEY, JSON.stringify({ ref, ts: Date.now() }));
  } catch {
    /* storage blocked */
  }
}

export function readRef(): string | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return undefined;
    const { ref, ts } = JSON.parse(raw) as { ref?: string; ts?: number };
    if (!ref || !VALID.test(ref) || !ts || Date.now() - ts > TTL) return undefined;
    return ref;
  } catch {
    return undefined;
  }
}
