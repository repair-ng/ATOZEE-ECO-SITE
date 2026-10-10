// Tiny in-memory fixed-window limiter, used on login to blunt brute force.
// Per-process: fine for a single Node container (this app's docker setup).
// If you ever scale to several instances, move this to Redis/Postgres.
interface Entry { count: number; resetAt: number }
const store = new Map<string, Entry>();

function prune(now: number) {
  if (store.size < 5000) return;
  store.forEach((v, k) => { if (v.resetAt <= now) store.delete(k); });
}

export function isLimited(key: string, max: number): boolean {
  const e = store.get(key);
  return !!e && e.resetAt > Date.now() && e.count >= max;
}

export function recordHit(key: string, windowMs: number) {
  const now = Date.now();
  prune(now);
  const e = store.get(key);
  if (!e || e.resetAt <= now) store.set(key, { count: 1, resetAt: now + windowMs });
  else e.count += 1;
}

export function clearKey(key: string) {
  store.delete(key);
}
