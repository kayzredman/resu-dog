"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileDown, Copy, Check, Lock, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

interface ResultsPanelProps {
  optimizedResume: string;
  coverLetter: string;
  changesMade: string[];
  keywordsAdded: string[];
  isPaid: boolean;
  mode?: "targeted" | "general";
  hideCoverLetter?: boolean;
}

async function downloadPDF(filename: string, content: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const margin = 15;
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = pageW - margin * 2;
  const lineH = 5.5;
  const fontSize = 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);

  let y = margin;
  const lines = doc.splitTextToSize(content, maxW) as string[];

  for (const line of lines) {
    if (y + lineH > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineH;
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
}: ResultsPanelProps) {
  const [showChanges, setShowChanges] = useState(false);
  const [downloadingResume, setDownloadingResume] = useState(false);
  const [downloadingCover, setDownloadingCover] = useState(false);

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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Optimized Resume</h3>
            </div>
            <div className="flex items-center gap-2">
              {isPaid && <CopyButton text={optimizedResume} />}
              <button
                disabled={!isPaid || downloadingResume}
                onClick={handleResumeDownload}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
