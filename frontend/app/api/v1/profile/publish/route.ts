import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getRedis, profileKey } from "@/lib/redis";

// POST /api/v1/profile/publish
// Body: { profile: ProfileData, resume?: string }
// Returns: { slug: string, url: string }

const MAX_PAYLOAD = 512_000; // 500 KB sanity limit
const TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    if (body.length > MAX_PAYLOAD) {
      return NextResponse.json(
        { detail: "Payload too large. Maximum 500 KB." },
        { status: 413 }
      );
    }

    const { profile, resume } = JSON.parse(body) as {
      profile: Record<string, unknown>;
      resume?: string;
    };

    if (!profile || typeof profile !== "object" || !profile.name) {
      return NextResponse.json(
        { detail: "Invalid profile data." },
        { status: 400 }
      );
    }

    const slug = nanoid(10); // short, URL-safe ID
    const redis = getRedis();

    await redis.set(
      profileKey(slug),
      JSON.stringify({
        profile,
        resume: resume ?? null,
        createdAt: new Date().toISOString(),
      }),
      { ex: TTL_SECONDS }
    );

    const origin = req.nextUrl.origin;
    const url = `${origin}/p/${slug}`;

    return NextResponse.json({ slug, url });
  } catch (err) {
    console.error("[profile/publish]", err);

    const message =
      err instanceof Error ? err.message : "Failed to publish profile.";

    // Surface missing env var errors clearly
    if (message.includes("Missing KV_REST_API")) {
      return NextResponse.json({ detail: message }, { status: 503 });
    }

    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
