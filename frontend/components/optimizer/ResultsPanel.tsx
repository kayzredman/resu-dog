"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileDown, Copy, Check, Lock, Sparkles, ChevronDown, ChevronUp, ShieldCheck, User, Globe, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface ResultsPanelProps {
  optimizedResume: string;
  coverLetter: string;
  changesMade: string[];
  keywordsAdded: string[];
  isPaid: boolean;
  mode?: "targeted" | "general";
  hideCoverLetter?: boolean;
  atsScore?: number;
}

// Known section headers for detection
const RESUME_SECTIONS = new Set([
  "CONTACT", "SUMMARY", "PROFESSIONAL SUMMARY", "OBJECTIVE",
  "EXPERIENCE", "WORK EXPERIENCE", "PROFESSIONAL EXPERIENCE",
  "EDUCATION", "SKILLS", "CORE COMPETENCIES",
  "ACHIEVEMENTS", "CERTIFICATIONS", "PROJECTS", "LANGUAGES", "REFERENCES",
]);

function isSectionHeader(line: string): boolean {
  const t = line.trim();
  if (RESUME_SECTIONS.has(t)) return true;
  // Fallback: all-caps, reasonable length, no bullets or digits at start
  return (
    t === t.toUpperCase() &&
    t.length >= 2 &&
    t.length <= 35 &&
    /^[A-Z]/.test(t) &&
    !/^[-•\d@+]/.test(t)
  );
}

function isRoleLine(line: string): boolean {
  const t = line.trim();
  return (
    !isSectionHeader(t) &&
    !/^[-•]/.test(t) &&
    (t.includes("–") || t.includes("—") || /\d{4}\s*[-–]\s*(\d{4}|Till|Present|Current)/i.test(t))
  );
}

async function downloadPDF(filename: string, content: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const ML = 20, MR = 20, MT = 22, MB = 20;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const textW = pageW - ML - MR;
  let y = MT;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - MB) { doc.addPage(); y = MT; }
  };

  // Strip any leaked keywords_used / raw JSON metadata from AI output
  const cleaned = content
    .replace(/\nkeywords_used\s*:[\s\S]*$/i, "")
    .replace(/\n\{[\s\S]*\}$/, "")
    .trim();

  let firstNameDone = false; // bold the first non-empty line after CONTACT as the candidate name

  for (const raw of cleaned.split("\n")) {
    const trimmed = raw.trim();

    if (!trimmed) {
      y += 2;
      continue;
    }

    if (isSectionHeader(trimmed)) {
      if (y > MT + 5) y += 5;
      ensureSpace(12);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text(trimmed, ML, y);
      y += 1.5;

      // Primary-colored rule under header
      doc.setDrawColor(108, 99, 255);
      doc.setLineWidth(0.5);
      doc.line(ML, y, pageW - MR, y);
      y += 5;

      if (trimmed === "CONTACT") firstNameDone = false;
    } else if (!firstNameDone && !trimmed.includes("@") && !trimmed.startsWith("+") && !trimmed.startsWith("http") && trimmed.length < 50) {
      // First real line after CONTACT = candidate name → large bold
      ensureSpace(8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(20, 20, 20);
      doc.text(trimmed, ML, y);
      y += 7;
      firstNameDone = true;
    } else if (/^[-•]/.test(trimmed)) {
      // Bullet point
      const bulletContent = trimmed.replace(/^[-•]\s*/, "");
      ensureSpace(6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(55, 55, 55);
      doc.text("•", ML + 1, y);
      const wrapped = doc.splitTextToSize(bulletContent, textW - 7) as string[];
      for (const wl of wrapped) {
        ensureSpace(5);
        doc.text(wl, ML + 6, y);
        y += 4.8;
      }
    } else if (isRoleLine(trimmed)) {
      // Job title / role with date range → bold
      if (y > MT + 5) y += 3;
      ensureSpace(8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(40, 40, 40);
      const wrapped = doc.splitTextToSize(trimmed, textW) as string[];
      for (const wl of wrapped) { ensureSpace(5); doc.text(wl, ML, y); y += 5; }
    } else {
      // Regular body text
      ensureSpace(5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(65, 65, 65);
      const wrapped = doc.splitTextToSize(trimmed, textW) as string[];
      for (const wl of wrapped) { ensureSpace(5); doc.text(wl, ML, y); y += 4.8; }
    }
  }

  doc.save(filename);
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-foreground-muted hover:text-foreground hover:border-line-hover transition-colors"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-accent" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Copy
        </>
      )}
    </button>
  );
}

function LockedOverlay({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm bg-background/70 gap-3">
      <Lock className="h-6 w-6 text-primary" />
      <p className="text-sm font-medium text-center px-4">{message}</p>
      <button className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors shadow-lg shadow-[rgba(108,99,255,0.3)]">
        Upgrade to Pro — $12/mo
      </button>
    </div>
  );
}

export default function ResultsPanel({
  optimizedResume,
  coverLetter,
  changesMade,
  keywordsAdded,
  isPaid,
  mode = "targeted",
  hideCoverLetter = false,
  atsScore,
}: ResultsPanelProps) {
  const router = useRouter();
  const [showChanges, setShowChanges] = useState(false);
  const [downloadingResume, setDownloadingResume] = useState(false);
  const [downloadingCover, setDownloadingCover] = useState(false);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [exportFormat, setExportFormat] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const handleCreateProfile = async () => {
    if (!optimizedResume) return;
    setCreatingProfile(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${apiBase}/api/v1/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: optimizedResume }),
      });
      if (!res.ok) return;
      const profile = await res.json();
      if (atsScore) profile.ats_score = atsScore;
      localStorage.setItem("resudog_profile", JSON.stringify(profile));
      localStorage.setItem("resudog_resume", optimizedResume);
      router.push("/p/preview");
    } finally {
      setCreatingProfile(false);
    }
  };

  const EXPORT_FORMATS = [
    { key: "linkedin", label: "LinkedIn Profile Format", flag: "🔗" },
    { key: "wes", label: "WES / Immigration CV", flag: "🍁" },
    { key: "uk", label: "UK / EU CV Format", flag: "🇬🇧" },
  ];

  const handleExport = async (format: string) => {
    setShowExportMenu(false);
    setExportFormat(format);
    setExportResult(null);
    setExportLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${apiBase}/api/v1/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: optimizedResume, format }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setExportResult(data.formatted ?? data.about ?? JSON.stringify(data, null, 2));
    } finally {
      setExportLoading(false);
    }
  };

  const handleResumeDownload = async () => {
    setDownloadingResume(true);
    await downloadPDF("optimized-resume.pdf", optimizedResume);
    setDownloadingResume(false);
  };

  const handleCoverDownload = async () => {
    setDownloadingCover(true);
    await downloadPDF("cover-letter.pdf", coverLetter);
    setDownloadingCover(false);
  };

  return (
    <div className="space-y-4">
      {/* Optimized Resume */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl border border-line bg-surface overflow-hidden"
      >
        {!isPaid && <LockedOverlay message="Sign up to download your optimized resume" />}
        <div className="p-5">
          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Optimized Resume</h3>
              <span className="flex items-center gap-1 rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-2 py-0.5 text-[10px] font-semibold text-[#22c55e]">
                <ShieldCheck className="h-3 w-3" />
                Assessment refined
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Create Profile */}
              <button
                onClick={handleCreateProfile}
                disabled={creatingProfile}
                className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <User className="h-3.5 w-3.5" />}
                {creatingProfile ? "Building…" : "Create Profile Page"}
              </button>

              {/* Export As dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-foreground-muted hover:text-foreground hover:border-line-hover active:scale-95 transition-all"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Export As
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 z-20 w-52 rounded-xl border border-line bg-surface shadow-lg overflow-hidden">
                    {EXPORT_FORMATS.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => handleExport(f.key)}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground-muted hover:bg-foreground/[0.05] hover:text-foreground transition-colors text-left"
                      >
                        <span>{f.flag}</span>
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {isPaid && <CopyButton text={optimizedResume} />}
              <button
                disabled={!isPaid || downloadingResume}
                onClick={handleResumeDownload}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark active:scale-95 active:bg-[#5a52e0] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileDown className="h-3.5 w-3.5" />
                {downloadingResume ? "Generating…" : "Download PDF"}
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-background p-4 max-h-[320px] overflow-y-auto">
            <pre className="text-xs text-foreground-soft whitespace-pre-wrap font-mono leading-relaxed">
              {optimizedResume}
            </pre>
          </div>
        </div>
      </motion.div>

      {/* Export Result panel */}
      {(exportLoading || exportResult) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-line bg-surface overflow-hidden"
        >
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">
                  {EXPORT_FORMATS.find((f) => f.key === exportFormat)?.label ?? "Export"}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {exportResult && <CopyButton text={exportResult} />}
                <button
                  onClick={() => { setExportResult(null); setExportFormat(null); }}
                  className="text-xs text-foreground-muted hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            {exportLoading ? (
              <div className="flex items-center gap-2 text-sm text-foreground-muted py-4">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Reformatting for {EXPORT_FORMATS.find((f) => f.key === exportFormat)?.label}…
              </div>
            ) : (
              <div className="rounded-xl bg-background p-4 max-h-[360px] overflow-y-auto">
                <pre className="text-xs text-foreground-soft whitespace-pre-wrap font-mono leading-relaxed">
                  {exportResult}
                </pre>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Changes Made */}
      {changesMade.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-line bg-surface overflow-hidden"
        >
          <button
            onClick={() => setShowChanges(!showChanges)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-foreground/[0.03] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Changes Made</span>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                {changesMade.length}
              </span>
            </div>
            {showChanges ? (
              <ChevronUp className="h-4 w-4 text-foreground-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-foreground-muted" />
            )}
          </button>

          {showChanges && (
            <div className="px-5 pb-5 space-y-2">
              {changesMade.map((change, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-foreground-muted">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {change}
                </div>
              ))}
              {keywordsAdded.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-line">
                  <p className="text-xs text-foreground-muted mb-2">Keywords added:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {keywordsAdded.map((kw) => (
                      <span
                        key={kw}
                        className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs text-primary"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Cover Letter (targeted mode only, unless explicitly hidden) */}
      {mode === "targeted" && !hideCoverLetter && (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative rounded-2xl border border-line bg-surface overflow-hidden"
      >
        {!isPaid && (
          <LockedOverlay message="Upgrade to access your personalized cover letter" />
        )}
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Cover Letter</h3>
            <div className="flex items-center gap-2">
              {isPaid && <CopyButton text={coverLetter} />}
              {isPaid && (
                <button
                  onClick={handleCoverDownload}
                  disabled={downloadingCover}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  {downloadingCover ? "Generating…" : "Download PDF"}
                </button>
              )}
            </div>
          </div>
            <div className="rounded-xl bg-background p-4 max-h-[280px] overflow-y-auto">
            <p className="text-sm text-foreground-soft whitespace-pre-wrap leading-relaxed">
              {coverLetter}
            </p>
          </div>
        </div>
      </motion.div>
      )}
    </div>
  );
}
