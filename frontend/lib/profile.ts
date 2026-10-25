// Validation for profiles published to public /p/[slug] pages.
// Only known fields survive, every string is length-capped, and links must be safe.

import type { ProfileData } from "@/components/profile/ProfileView";

export interface PublishOptions {
  showEmail: boolean;
  allowCvDownload: boolean;
  openToWork: boolean;
}

export interface StoredProfile {
  profile: ProfileData;
  resume: string | null;
  openToWork: boolean;
  deleteToken: string;
  createdAt: string;
}

const str = (v: unknown, max: number): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const strList = (v: unknown, maxItems: number, maxLen: number): string[] =>
  Array.isArray(v)
    ? v.map((x) => str(x, maxLen)).filter(Boolean).slice(0, maxItems)
    : [];

function safeEmail(v: unknown): string | null {
  const s = str(v, 254);
  return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(s) ? s : null;
}

/** Only https links to linkedin.com are allowed — anything else is dropped. */
function safeLinkedIn(v: unknown): string | null {
  const s = str(v, 300);
  if (!s) return null;
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:") return null;
    if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Returns a clean profile, or null if the input is not a usable profile. */
export function sanitizeProfile(input: unknown, options: PublishOptions): ProfileData | null {
  if (!input || typeof input !== "object") return null;
  const p = input as Record<string, unknown>;

  const name = str(p.name, 100);
  if (!name) return null;

  const years = Number(p.years_experience);

  return {
    name,
    title: str(p.title, 120),
    location: str(p.location, 120) || null,
    email: options.showEmail ? safeEmail(p.email) : null,
    linkedin: safeLinkedIn(p.linkedin),
    summary: str(p.summary, 1200),
    story: str(p.story, 2000),
    years_experience: Number.isFinite(years) ? Math.min(Math.max(Math.round(years), 0), 60) : 0,
    industries: strList(p.industries, 5, 60),
    skills: strList(p.skills, 24, 60),
    experience: (Array.isArray(p.experience) ? p.experience : []).slice(0, 8).map((e) => {
      const r = (e ?? {}) as Record<string, unknown>;
      return {
        title: str(r.title, 120),
        company: str(r.company, 120),
        period: str(r.period, 60),
        bullets: strList(r.bullets, 6, 400),
      };
    }),
    education: (Array.isArray(p.education) ? p.education : []).slice(0, 6).map((e) => {
      const r = (e ?? {}) as Record<string, unknown>;
      return {
        degree: str(r.degree, 160),
        institution: str(r.institution, 160),
        year: str(r.year, 40),
      };
    }),
    certifications: strList(p.certifications, 12, 160),
    // ats_score is deliberately dropped: it is our model's opinion, not a credential.
  };
}
