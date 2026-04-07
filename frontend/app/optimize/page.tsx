"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Loader2, AlertCircle } from "lucide-react";
import DropZone from "@/components/optimizer/DropZone";
import ScoreCard from "@/components/optimizer/ScoreCard";
import ResultsPanel from "@/components/optimizer/ResultsPanel";

interface OptimizeResult {
  score_before: {
    overall_score: number;
    keyword_coverage: number;
    skills_alignment: number;
    formatting_compliance: number;
    matched_keywords: string[];
    missing_keywords: string[];
    summary: string;
  };
  score_after: {
    overall_score: number;
    keyword_coverage: number;
    skills_alignment: number;
    formatting_compliance: number;
    matched_keywords: string[];
    missing_keywords: string[];
    summary: string;
  };
  optimized_resume: string;
  changes_made: string[];
  keywords_added: string[];
  cover_letter: string;
}

type Step = "idle" | "loading" | "done" | "error";

export default function OptimizePage() {
  const [uploadedFile, setUploadedFile] = useState<{
    file: File;
    name: string;
    size: string;
  } | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit =
    uploadedFile !== null &&
    jobDescription.trim().length >= 50 &&
    step !== "loading";

  const handleSubmit = async () => {
    if (!canSubmit || !uploadedFile) return;

    setStep("loading");
    setResult(null);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", uploadedFile.file);
    formData.append("job_description", jobDescription);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${apiUrl}/api/v1/optimize/`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? `Server error: ${res.status}`);
      }

      const data: OptimizeResult = await res.json();
      setResult(data);
      setStep("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStep("error");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Optimize your resume
        </h1>
        <p className="mt-1.5 text-[#8888aa]">
          Upload your resume and paste the job description. We&apos;ll do the rest.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — inputs */}
        <div className="space-y-5">
          {/* Step 1: Upload */}
          <div className="rounded-2xl border border-[#1e1e2e] bg-[#12121a] p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6c63ff] text-xs font-bold text-white">
                1
              </span>
              <h2 className="font-semibold">Upload your resume</h2>
            </div>
            <DropZone
              onFileAccepted={(file) =>
                setUploadedFile({
                  file,
                  name: file.name,
                  size: `${(file.size / 1024).toFixed(1)} KB`,
                })
              }
              uploadedFile={uploadedFile}
              onRemove={() => setUploadedFile(null)}
            />
          </div>

          {/* Step 2: Job Description */}
          <div className="rounded-2xl border border-[#1e1e2e] bg-[#12121a] p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6c63ff] text-xs font-bold text-white">
                2
              </span>
              <h2 className="font-semibold">Paste the job description</h2>
            </div>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here — include requirements, responsibilities, and preferred qualifications for best results..."
              rows={10}
              className="w-full resize-none rounded-xl border border-[#2a2a3a] bg-[#0a0a0f] px-4 py-3 text-sm text-[#f0f0f5] placeholder-[#4a4a6a] focus:border-[#6c63ff] focus:outline-none focus:ring-1 focus:ring-[#6c63ff] transition-colors"
            />
            <div className="mt-1.5 flex justify-between text-xs text-[#8888aa]">
              <span>Minimum 50 characters</span>
              <span>{jobDescription.length} chars</span>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#6c63ff] py-3.5 text-sm font-semibold text-white shadow-lg shadow-[rgba(108,99,255,0.3)] hover:bg-[#5a52e0] hover:shadow-[rgba(108,99,255,0.45)] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {step === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Optimizing your resume…
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Optimize my resume
              </>
            )}
          </button>

          {/* Error */}
          {step === "error" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/10 p-4"
            >
              <AlertCircle className="h-4 w-4 text-[#ef4444] mt-0.5 shrink-0" />
              <p className="text-sm text-[#ef4444]">{errorMsg}</p>
            </motion.div>
          )}
        </div>

        {/* Right — results */}
        <div>
          <AnimatePresence mode="wait">
            {step === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full min-h-[400px] rounded-2xl border border-dashed border-[#1e1e2e] text-center p-8"
              >
                <div className="h-16 w-16 rounded-2xl bg-[#6c63ff]/10 border border-[#6c63ff]/20 flex items-center justify-center mb-4">
                  <Zap className="h-7 w-7 text-[#6c63ff]" />
                </div>
                <p className="text-sm font-medium text-[#8888aa]">
                  Your score and optimized resume will appear here
                </p>
                <p className="text-xs text-[#4a4a6a] mt-1">
                  Upload a resume and paste a job description to get started
                </p>
              </motion.div>
            )}

            {step === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full min-h-[400px] rounded-2xl border border-[#1e1e2e] bg-[#12121a] text-center p-8"
              >
                <Loader2 className="h-10 w-10 text-[#6c63ff] animate-spin mb-4" />
                <p className="text-sm font-medium">Optimizing your resume…</p>
                <p className="text-xs text-[#8888aa] mt-1">
                  Scoring, rewriting, and generating cover letter in parallel
                </p>
                <div className="mt-5 space-y-2 w-full max-w-xs">
                  {["Parsing resume", "Scoring against job description", "Rewriting with AI", "Generating cover letter"].map(
                    (task, i) => (
                      <motion.div
                        key={task}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.4 }}
                        className="flex items-center gap-2 text-xs text-[#8888aa]"
                      >
                        <span className="h-1 w-1 rounded-full bg-[#6c63ff] animate-pulse" />
                        {task}
                      </motion.div>
                    )
                  )}
                </div>
              </motion.div>
            )}

            {step === "done" && result && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                <ScoreCard
                  before={result.score_before}
                  after={result.score_after}
                  isLocked={false}
                />
                <ResultsPanel
                  optimizedResume={result.optimized_resume}
                  coverLetter={result.cover_letter}
                  changesMade={result.changes_made}
                  keywordsAdded={result.keywords_added}
                  isPaid={false}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
