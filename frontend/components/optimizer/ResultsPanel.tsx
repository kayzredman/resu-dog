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
      className="flex items-center gap-1.5 rounded-lg border border-[#1e1e2e] px-3 py-1.5 text-xs text-[#8888aa] hover:text-white hover:border-[#2e2e4e] transition-colors"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-[#00d4aa]" />
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
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm bg-[#0a0a0f]/70 gap-3">
      <Lock className="h-6 w-6 text-[#6c63ff]" />
      <p className="text-sm font-medium text-center px-4">{message}</p>
      <button className="rounded-xl bg-[#6c63ff] px-5 py-2 text-sm font-semibold text-white hover:bg-[#5a52e0] transition-colors shadow-lg shadow-[rgba(108,99,255,0.3)]">
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
}: ResultsPanelProps) {
  const [showChanges, setShowChanges] = useState(false);

  return (
    <div className="space-y-4">
      {/* Optimized Resume */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl border border-[#1e1e2e] bg-[#12121a] overflow-hidden"
      >
        {!isPaid && <LockedOverlay message="Sign up to download your optimized resume" />}
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#6c63ff]" />
              <h3 className="font-semibold">Optimized Resume</h3>
            </div>
            <div className="flex items-center gap-2">
              {isPaid && <CopyButton text={optimizedResume} />}
              <button
                disabled={!isPaid}
                className="flex items-center gap-1.5 rounded-lg bg-[#6c63ff] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#5a52e0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileDown className="h-3.5 w-3.5" />
                Download PDF
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-[#0a0a0f] p-4 max-h-[320px] overflow-y-auto">
            <pre className="text-xs text-[#c0c0d0] whitespace-pre-wrap font-mono leading-relaxed">
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
          className="rounded-2xl border border-[#1e1e2e] bg-[#12121a] overflow-hidden"
        >
          <button
            onClick={() => setShowChanges(!showChanges)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-[#ffffff05] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Changes Made</span>
              <span className="rounded-full bg-[#6c63ff]/15 px-2 py-0.5 text-xs text-[#6c63ff]">
                {changesMade.length}
              </span>
            </div>
            {showChanges ? (
              <ChevronUp className="h-4 w-4 text-[#8888aa]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[#8888aa]" />
            )}
          </button>

          {showChanges && (
            <div className="px-5 pb-5 space-y-2">
              {changesMade.map((change, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-[#8888aa]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6c63ff]" />
                  {change}
                </div>
              ))}
              {keywordsAdded.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#1e1e2e]">
                  <p className="text-xs text-[#8888aa] mb-2">Keywords added:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {keywordsAdded.map((kw) => (
                      <span
                        key={kw}
                        className="rounded-full border border-[#6c63ff]/25 bg-[#6c63ff]/10 px-2 py-0.5 text-xs text-[#6c63ff]"
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

      {/* Cover Letter */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative rounded-2xl border border-[#1e1e2e] bg-[#12121a] overflow-hidden"
      >
        {!isPaid && (
          <LockedOverlay message="Upgrade to access your personalized cover letter" />
        )}
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Cover Letter</h3>
            {isPaid && <CopyButton text={coverLetter} />}
          </div>
          <div className="rounded-xl bg-[#0a0a0f] p-4 max-h-[280px] overflow-y-auto">
            <p className="text-sm text-[#c0c0d0] whitespace-pre-wrap leading-relaxed">
              {coverLetter}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
