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
