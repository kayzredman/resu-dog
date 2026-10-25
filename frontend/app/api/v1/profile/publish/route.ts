import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getRedis, profileKey } from "@/lib/redis";
import { sanitizeProfile, type StoredProfile } from "@/lib/profile";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/v1/profile/publish
// Body: { profile: ProfileData, resume?: string, options: PublishOptions }
// Returns: { slug, url, deleteToken }
//
// DELETE /api/v1/profile/publish
// Body: { slug, deleteToken }
// Removes a published profile. Only the publisher holds the delete token.

const MAX_PAYLOAD = 200_000; // 200 KB sanity limit
const MAX_RESUME_CHARS = 50_000;
const TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, "publish");
    if (limited) return limited;

    const body = await req.text();

    if (body.length > MAX_PAYLOAD) {
      return NextResponse.json(
        { detail: "Payload too large." },
        { status: 413 }
      );
    }

    const { profile: rawProfile, resume, options: rawOptions } = JSON.parse(body) as {
      profile: unknown;
      resume?: unknown;
      options?: Partial<Record<"showEmail" | "allowCvDownload" | "openToWork", unknown>>;
    };

    // Everything is opt-in except the profile itself
    const options = {
      showEmail: rawOptions?.showEmail === true,
      allowCvDownload: rawOptions?.allowCvDownload === true,
      openToWork: rawOptions?.openToWork === true,
    };

    const profile = sanitizeProfile(rawProfile, options);
    if (!profile) {
      return NextResponse.json(
        { detail: "Invalid profile data." },
        { status: 400 }
      );
    }

    const resumeText =
      options.allowCvDownload && typeof resume === "string"
        ? resume.slice(0, MAX_RESUME_CHARS)
        : null;

    const slug = nanoid(10); // short, URL-safe ID
    const deleteToken = nanoid(32);
    const redis = getRedis();

    const stored: StoredProfile = {
      profile,
      resume: resumeText,
      openToWork: options.openToWork,
      deleteToken,
      createdAt: new Date().toISOString(),
    };

    await redis.set(profileKey(slug), JSON.stringify(stored), { ex: TTL_SECONDS });

    const origin = req.nextUrl.origin;
    const url = `${origin}/p/${slug}`;

    return NextResponse.json({ slug, url, deleteToken });
  } catch (err) {
    console.error("[profile/publish]", err);

    const message = err instanceof Error ? err.message : "";

    // Surface missing env var errors clearly
    if (message.includes("Missing KV_REST_API")) {
      return NextResponse.json(
        { detail: "Profile sharing is not configured on this server." },
        { status: 503 }
      );
    }

    return NextResponse.json({ detail: "Failed to publish profile." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { slug, deleteToken } = (await req.json()) as { slug?: unknown; deleteToken?: unknown };

    if (typeof slug !== "string" || typeof deleteToken !== "string" || !/^[\w-]{10}$/.test(slug)) {
      return NextResponse.json({ detail: "Invalid request." }, { status: 400 });
    }

    const redis = getRedis();
    const raw = await redis.get<string | StoredProfile>(profileKey(slug));
    if (!raw) {
      // Already gone (expired or deleted) — treat as success
      return NextResponse.json({ deleted: true });
    }

    const stored = typeof raw === "string" ? (JSON.parse(raw) as StoredProfile) : raw;
    if (stored.deleteToken !== deleteToken) {
      return NextResponse.json({ detail: "Not allowed." }, { status: 403 });
    }

    await redis.del(profileKey(slug));
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("[profile/publish DELETE]", err);
    return NextResponse.json({ detail: "Failed to unpublish profile." }, { status: 500 });
  }
}
