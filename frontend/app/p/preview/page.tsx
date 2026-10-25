"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PawPrint } from "lucide-react";
import { toast } from "sonner";
import ProfileView from "@/components/profile/ProfileView";
import type { ProfileData, ShareOptions } from "@/components/profile/ProfileView";

const PUBLISHED_KEY = "resudog_published";

interface PublishedProfile {
  slug: string;
  url: string;
  deleteToken: string;
}

// ─── No data state ────────────────────────────────────────────────────────────

function NoProfile() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
        <PawPrint className="h-7 w-7 text-primary-ink" />
      </div>
      <h2 className="text-xl font-bold mb-2">No profile data found</h2>
      <p className="text-sm text-foreground-muted mb-6 max-w-sm">
        Generate your profile page by optimizing your resume first, then clicking &ldquo;Create Profile Page&rdquo;.
      </p>
      <Link
        href="/optimize"
        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
      >
        Optimize my Resume →
      </Link>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProfilePreviewPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [resumeText, setResumeText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [published, setPublished] = useState<PublishedProfile | null>(null);

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const raw = localStorage.getItem("resudog_profile");
        const parsed = raw ? (JSON.parse(raw) as ProfileData) : null;
        setProfile(parsed);
        setResumeText(localStorage.getItem("resudog_resume"));
        const pub = localStorage.getItem(PUBLISHED_KEY);
        setPublished(pub ? (JSON.parse(pub) as PublishedProfile) : null);
      } catch {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  const handleShare = async (options: ShareOptions): Promise<string | null> => {
    if (!profile) return null;

    try {
      const res = await fetch("/api/v1/profile/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          resume: options.allowCvDownload ? resumeText : undefined,
          options,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Failed to publish profile." }));
        toast.error(err.detail || "Failed to publish profile.");
        return null;
      }

      const pub = (await res.json()) as PublishedProfile;
      try {
        localStorage.setItem(PUBLISHED_KEY, JSON.stringify(pub));
      } catch {
        // Storage blocked — the link still works, but unpublish won't survive a reload
      }
      setPublished(pub);
      toast.success("Profile published! Link copied to clipboard.");
      return pub.url;
    } catch {
      toast.error("Network error — could not publish profile.");
      return null;
    }
  };

  const handleUnpublish = async () => {
    if (!published) return;
    try {
      const res = await fetch("/api/v1/profile/publish", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: published.slug, deleteToken: published.deleteToken }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Failed to unpublish." }));
        toast.error(err.detail || "Failed to unpublish.");
        return;
      }
      localStorage.removeItem(PUBLISHED_KEY);
      setPublished(null);
      toast.success("Profile unpublished. The link no longer works.");
    } catch {
      toast.error("Network error — could not unpublish.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) return <NoProfile />;

  return (
    <ProfileView
      profile={profile}
      resumeText={resumeText}
      onShare={handleShare}
      publishedUrl={published?.url ?? null}
      onUnpublish={handleUnpublish}
    />
  );
}
