import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (redis) return redis;

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Missing KV_REST_API_URL or KV_REST_API_TOKEN environment variables. " +
      "Create an Upstash Redis store and add these to .env.local."
    );
  }

  redis = new Redis({ url, token });
  return redis;
}

/** Key helpers */
export const profileKey = (slug: string) => `profile:${slug}`;

/** The few calls the public-profile routes need. */
export interface ProfileStore {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: string, opts: { ex: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

// Kept on globalThis so route handlers and pages share one copy in dev
const memory = ((globalThis as { __resudogProfiles?: Map<string, { value: string; expires: number }> })
  .__resudogProfiles ??= new Map());

const memoryStore: ProfileStore = {
  async get<T>(key: string) {
    const hit = memory.get(key);
    if (!hit || hit.expires < Date.now()) return null;
    return hit.value as T;
  },
  async set(key, value, { ex }) {
    memory.set(key, { value, expires: Date.now() + ex * 1000 });
  },
  async del(key) {
    memory.delete(key);
  },
};

/**
 * Upstash in production. In local development without KV vars, an in-memory store so
 * publishing can be tried end to end (profiles vanish when the dev server restarts).
 */
export function getProfileStore(): ProfileStore {
  try {
    return getRedis();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") return memoryStore;
    throw err;
  }
}
