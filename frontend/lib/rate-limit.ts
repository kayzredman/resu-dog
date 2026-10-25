import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "@/lib/redis";

// Per-IP rate limits for routes that cost money (OpenAI) or write data (publish).
// IPs are stored only as a salted one-way hash, and counters expire with their window.

type Bucket = "ai" | "ai-light" | "publish";

const LIMITS: Record<Bucket, { tokens: number; window: `${number} ${"m" | "h"}` }> = {
  ai: { tokens: 6, window: "1 h" },          // full optimize / build-write pipelines
  "ai-light": { tokens: 40, window: "1 h" },  // single cheap calls: analyze, assist, export, profile
  publish: { tokens: 10, window: "1 h" },
};

const limiters = new Map<Bucket, Ratelimit>();
let warnedMissingRedis = false;

function getLimiter(bucket: Bucket): Ratelimit | null {
  const existing = limiters.get(bucket);
  if (existing) return existing;
  try {
    const { tokens, window } = LIMITS[bucket];
    const limiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(tokens, window),
      prefix: `rl:${bucket}`,
    });
    limiters.set(bucket, limiter);
    return limiter;
  } catch {
    // No Redis configured (e.g. local dev without KV vars) — run without limits
    if (!warnedMissingRedis) {
      console.warn("[rate-limit] Redis not configured; rate limiting is disabled.");
      warnedMissingRedis = true;
    }
    return null;
  }
}

function clientId(req: NextRequest): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const salt = process.env.RATE_LIMIT_SALT ?? "resu-dog";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Returns a 429 response if the caller is over the limit for this bucket, otherwise null.
 * Usage: `const limited = await rateLimit(req, "ai"); if (limited) return limited;`
 */
export async function rateLimit(req: NextRequest, bucket: Bucket): Promise<NextResponse | null> {
  const limiter = getLimiter(bucket);
  if (!limiter) return null;

  try {
    const { success, reset } = await limiter.limit(clientId(req));
    if (success) return null;

    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    const minutes = Math.ceil(retryAfter / 60);
    return NextResponse.json(
      { detail: `You've hit the hourly limit. Please try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  } catch (err) {
    // Never block real users because the limiter itself failed
    console.error("[rate-limit]", err);
    return null;
  }
}
