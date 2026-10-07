/**
 * Small in-memory failure throttle for authentication actions (defence in
 * depth against credential stuffing / OTP brute force). Single-process — pairs
 * well with Vercel's per-instance model for a demo; swap for KV/Upstash for
 * multi-region production.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_FAILURES = 5;

function get(key: string): Bucket | undefined {
  const bucket = buckets.get(key);
  if (!bucket) return undefined;
  if (bucket.resetAt < Date.now()) {
    buckets.delete(key);
    return undefined;
  }
  return bucket;
}

export function isBlocked(key: string): boolean {
  return (get(key)?.count ?? 0) >= MAX_FAILURES;
}

export function registerFailure(key: string): void {
  const bucket = get(key);
  if (bucket) {
    bucket.count += 1;
    return;
  }
  buckets.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
  // Opportunistic cleanup so the map can't grow unbounded.
  if (buckets.size > 500) {
    const now = Date.now();
    for (const [k, v] of buckets) {
      if (v.resetAt < now) buckets.delete(k);
    }
  }
}

export function clearFailures(key: string): void {
  buckets.delete(key);
}
