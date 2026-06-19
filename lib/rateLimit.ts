interface RateLimitWindow {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitWindow>();

// Purge expired entries every 5 minutes to prevent unbounded memory growth
setInterval(
  () => {
    const now = Date.now();
    for (const [key, win] of store) {
      if (now > win.resetAt) store.delete(key);
    }
  },
  5 * 60 * 1000,
).unref?.();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // epoch ms
}

/**
 * Fixed-window in-memory rate limiter keyed by an arbitrary string (typically IP + route).
 * State resets on server restart — fine for single-instance / prototype deployments.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  let win = store.get(key);

  if (!win || now > win.resetAt) {
    win = { count: 0, resetAt: now + windowMs };
    store.set(key, win);
  }

  win.count += 1;
  const allowed = win.count <= limit;

  return {
    allowed,
    remaining: Math.max(0, limit - win.count),
    resetAt: win.resetAt,
  };
}

/** Extract the client IP from a Next.js request, falling back to 'unknown'. */
export function getClientIp(request: Request): string {
  const headers = request.headers as Headers;
  return (
    headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    headers.get('x-real-ip') ??
    'unknown'
  );
}

/** Build standard rate-limit response headers. */
export function rateLimitHeaders(result: RateLimitResult, limit: number): Headers {
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', String(limit));
  headers.set('X-RateLimit-Remaining', String(result.remaining));
  headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));
  if (!result.allowed) {
    headers.set('Retry-After', String(Math.ceil((result.resetAt - Date.now()) / 1000)));
  }
  return headers;
}
