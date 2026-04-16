import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRedis, profileKey } from "@/lib/redis";
import PublicProfileClient from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoredProfile {
  profile: {
    name: string;
    title: string;
    summary?: string;
    [key: string]: unknown;
  };
  resume: string | null;
  createdAt: string;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function getStoredProfile(slug: string): Promise<StoredProfile | null> {
  try {
    const redis = getRedis();
    const raw = await redis.get<string>(profileKey(slug));
    if (!raw) return null;
    // Upstash may return parsed object or string depending on how it was stored
    return typeof raw === "string" ? JSON.parse(raw) : raw as unknown as StoredProfile;
  } catch {
    return null;
  }
}

// ─── Dynamic metadata (OG tags) ───────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getStoredProfile(slug);

  if (!data) {
    return { title: "Profile Not Found — Resu-Dog" };
  }

  const { name, title, summary } = data.profile;
  const desc = summary
    ? `${summary.slice(0, 155)}…`
    : `${name} — ${title}. View their professional profile on Resu-Dog.`;

  return {
    title: `${name} — ${title} | Resu-Dog`,
    description: desc,
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
    <PublicProfileClient
      profile={data.profile}
      resumeText={data.resume}
    />
  );
}
