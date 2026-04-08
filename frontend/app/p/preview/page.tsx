"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  MapPin, Mail, Download, Send, Briefcase,
  GraduationCap, Star, Award, CheckCircle2, PawPrint, ExternalLink,
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProfileData {
  name: string;
  title: string;
  location: string | null;
  email: string | null;
  linkedin: string | null;
  summary: string;
  years_experience: number;
  industries: string[];
  skills: string[];
  experience: {
    title: string;
    company: string;
    period: string;
    bullets: string[];
  }[];
  education: {
    degree: string;
    institution: string;
    year: string;
  }[];
  certifications: string[];
  // injected from result page
  ats_score?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

function avatarColor(name: string) {
  const colors = [
    "#6c63ff", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444",
  ];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % colors.length;
  return colors[Math.abs(hash)];
}

// ─── Animated counter ─────────────────────────────────────────────────────────

function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = Math.ceil(value / 40);
    const id = setInterval(() => {
      start = Math.min(start + step, value);
      setDisplay(start);
      if (start >= value) clearInterval(id);
    }, 28);
    return () => clearInterval(id);
  }, [inView, value]);

  return <span ref={ref}>{display}{suffix}</span>;
}

// ─── Skill pill ───────────────────────────────────────────────────────────────

function SkillPill({ skill, index }: { skill: string; index: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
    >
      {skill}
    </motion.span>
  );
}

// ─── Timeline entry ───────────────────────────────────────────────────────────

function TimelineEntry({
  role,
  index,
}: {
  role: ProfileData["experience"][0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -18 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ delay: index * 0.12, duration: 0.35 }}
      className="relative pl-6"
    >
      {/* Timeline dot + line */}
      <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
      {index < 99 && (
        <span className="absolute left-[5px] top-4 h-full w-0.5 bg-line" />
      )}

      <div className="pb-8">
        <p className="text-xs text-foreground-muted mb-0.5">{role.period}</p>
        <h4 className="font-semibold text-sm">{role.title}</h4>
        <p className="text-xs text-primary font-medium mb-2">{role.company}</p>
        <ul className="space-y-1.5">
          {role.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground-soft leading-relaxed">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              {b}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

// ─── Section wrapper with scroll animation ────────────────────────────────────

function Section({ title, icon: Icon, children, delay = 0 }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.4 }}
      className="rounded-2xl border border-line bg-surface p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm uppercase tracking-widest text-foreground-muted">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

// ─── No data state ────────────────────────────────────────────────────────────

function NoProfile() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
        <PawPrint className="h-7 w-7 text-primary" />
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const raw = localStorage.getItem("resudog_profile");
        const parsed = raw ? (JSON.parse(raw) as ProfileData) : null;
        setProfile(parsed);
      } catch {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) return <NoProfile />;

  const color = avatarColor(profile.name);
  const initStr = initials(profile.name);
  const hasExperience = profile.experience?.length > 0;
  const hasEducation = profile.education?.length > 0;
  const hasCerts = profile.certifications?.length > 0;

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 lg:px-8">

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="rounded-2xl border border-line bg-surface p-8 mb-6"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          <div
            className="h-20 w-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-lg"
            style={{ backgroundColor: color }}
          >
            {initStr}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-extrabold tracking-tight">{profile.name}</h1>
              <span className="rounded-full bg-[#22c55e]/10 border border-[#22c55e]/25 px-2.5 py-0.5 text-[11px] font-bold text-[#22c55e]">
                ● Open to Work
              </span>
              {profile.ats_score && (
                <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                  ATS {profile.ats_score}/100
                </span>
              )}
            </div>

            <p className="text-foreground-muted text-sm font-medium mb-2">{profile.title}</p>

            <div className="flex flex-wrap gap-4 text-xs text-foreground-muted">
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {profile.location}
                </span>
              )}
              {profile.email && (
                <a href={`mailto:${profile.email}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                  <Mail className="h-3.5 w-3.5" />
                  {profile.email}
                </a>
              )}
              {profile.linkedin && (
                <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                  {/* LinkedIn inline SVG — lucide-react has no brand icons */}
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                    <rect x="2" y="9" width="4" height="12" />
                    <circle cx="4" cy="4" r="2" />
                  </svg>
                  LinkedIn
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {profile.summary && (
          <p className="mt-5 text-sm text-foreground-soft leading-relaxed border-t border-line pt-5">
            {profile.summary}
          </p>
        )}
      </motion.div>

      {/* ── Two-column layout ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">

        {/* ── Main (scrolls) ─────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* What I bring */}
          {profile.skills?.length > 0 && (
            <Section title="What I bring" icon={Star}>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s, i) => (
                  <SkillPill key={s} skill={s} index={i} />
                ))}
              </div>
            </Section>
          )}

          {/* Experience */}
          {hasExperience && (
            <Section title="Experience" icon={Briefcase} delay={0.05}>
              <div className="relative">
                {profile.experience.map((role, i) => (
                  <TimelineEntry key={i} role={role} index={i} />
                ))}
              </div>
            </Section>
          )}

          {/* Education */}
          {hasEducation && (
            <Section title="Education" icon={GraduationCap} delay={0.1}>
              <div className="space-y-4">
                {profile.education.map((edu, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <GraduationCap className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{edu.degree}</p>
                      <p className="text-xs text-primary font-medium">{edu.institution}</p>
                      <p className="text-xs text-foreground-muted">{edu.year}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Certifications */}
          {hasCerts && (
            <Section title="Certifications" icon={Award} delay={0.15}>
              <div className="space-y-2">
                {profile.certifications.map((cert, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-foreground-soft">
                    <Award className="h-3.5 w-3.5 text-[#f59e0b] shrink-0" />
                    {cert}
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* ── Sidebar (sticky) ───────────────────────────────────────── */}
        <div className="lg:sticky lg:top-6 space-y-4">

          {/* Stats card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="rounded-2xl border border-line bg-surface p-5"
          >
            <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground-muted mb-4">At a glance</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-extrabold text-primary">
                  <Counter value={profile.years_experience} suffix="+" />
                </p>
                <p className="text-[11px] text-foreground-muted mt-0.5">Years exp.</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold text-primary">
                  <Counter value={profile.industries?.length ?? 0} />
                </p>
                <p className="text-[11px] text-foreground-muted mt-0.5">Industries</p>
              </div>
              {profile.ats_score && (
                <div className="col-span-2 text-center pt-2 border-t border-line">
                  <p className="text-2xl font-extrabold text-primary">
                    <Counter value={profile.ats_score} />
                    <span className="text-base">/100</span>
                  </p>
                  <p className="text-[11px] text-foreground-muted mt-0.5">ATS Score</p>
                </div>
              )}
            </div>

            {profile.industries?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-line space-y-1">
                {profile.industries.map((ind) => (
                  <p key={ind} className="text-xs text-foreground-muted flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {ind}
                  </p>
                ))}
              </div>
            )}
          </motion.div>

          {/* CTA card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="rounded-2xl border border-line bg-surface p-5 space-y-3"
          >
            {profile.email && (
              <a
                href={`mailto:${profile.email}?subject=I'd love to connect&body=Hi ${profile.name.split(" ")[0]},`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark active:scale-95 active:bg-[#5a52e0] transition-all"
              >
                <Send className="h-4 w-4" />
                Hire Me
              </a>
            )}
            <button
              onClick={() => {
                const raw = localStorage.getItem("resudog_resume");
                if (!raw) return;
                // Trigger PDF download using the existing downloadPDF flow via blob
                const link = document.createElement("a");
                const blob = new Blob([raw], { type: "text/plain" });
                link.href = URL.createObjectURL(blob);
                link.download = `${profile.name.replace(/\s+/g, "-")}-CV.txt`;
                link.click();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-foreground-muted hover:text-foreground hover:border-line-hover active:scale-95 transition-all"
            >
              <Download className="h-4 w-4" />
              Download CV
            </button>
            {profile.linkedin && (
              <a
                href={profile.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-foreground-muted hover:text-foreground hover:border-line-hover active:scale-95 transition-all"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect x="2" y="9" width="4" height="12" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
                LinkedIn
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </motion.div>

          {/* Viral footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl border border-line bg-surface p-4"
          >
            <Link
              href="/"
              className="flex items-center justify-center gap-2 group"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 group-hover:bg-primary transition-colors">
                <PawPrint className="h-3.5 w-3.5 text-primary group-hover:text-white transition-colors" />
              </div>
              <span className="text-xs text-foreground-muted group-hover:text-foreground transition-colors">
                Built with <span className="font-semibold text-primary">resu-dog.com</span>
              </span>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
