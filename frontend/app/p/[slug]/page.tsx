import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProfileStore, profileKey } from "@/lib/redis";
import type { StoredProfile } from "@/lib/profile";
import PublicProfileClient from "./client";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ slug: string }>;
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function getStoredProfile(slug: string): Promise<StoredProfile | null> {
  try {
    const redis = getProfileStore();
    const raw = await redis.get<string | StoredProfile>(profileKey(slug));
    if (!raw) return null;
    // Upstash may return parsed object or string depending on how it was stored
    return typeof raw === "string" ? (JSON.parse(raw) as StoredProfile) : raw;
  } catch {
    return null;
  }
}

// ─── Dynamic metadata (OG tags) ───────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getStoredProfile(slug);

  if (!data) {
    return { title: "Profile Not Found", robots: { index: false, follow: false } };
  }

  const { name, title, summary } = data.profile;
  const desc = summary
    ? `${summary.slice(0, 155)}…`
    : `${name} — ${title}. View their professional profile on Resu-Dog.`;

  return {
    title: `${name} — ${title}`,
    description: desc,
    // Shared profiles contain personal details: keep them out of search engines
    robots: { index: false, follow: false, nocache: true },
    openGraph: {
      title: `${name} — ${title}`,
      description: desc,
      type: "profile",
      siteName: "Resu-Dog",
    },
    twitter: {
      card: "summary",
      title: `${name} — ${title}`,
      description: desc,
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PublicProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getStoredProfile(slug);

  if (!data) notFound();

  return (
    // Never pass deleteToken to the client
    <PublicProfileClient
      profile={data.profile}
      resumeText={data.resume}
      openToWork={data.openToWork === true}
    />
  );
}
