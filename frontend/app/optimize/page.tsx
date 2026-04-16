"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Loader2, AlertCircle, Target, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import DropZone from "@/components/optimizer/DropZone";
import ScoreCard from "@/components/optimizer/ScoreCard";
import ResultsPanel from "@/components/optimizer/ResultsPanel";
import ShortlistAssessment from "@/components/optimizer/ShortlistAssessment";
import GapAnalysis from "@/components/optimizer/GapAnalysis";
import type { AssessmentData } from "@/components/optimizer/ShortlistAssessment";

interface ScoreData {
  overall_score: number;
  summary: string;
  // Targeted mode
  keyword_coverage?: number;
  skills_alignment?: number;
  formatting_compliance?: number;
  matched_keywords?: string[];
  missing_keywords?: string[];
  // General mode
  clarity?: number;
  action_language?: number;
  structure?: number;
  completeness?: number;
}

interface OptimizeResult {
  mode: "targeted" | "general";
  score_before: ScoreData;
  score_after: ScoreData;
  optimized_resume: string;
  changes_made: string[];
  keywords_added: string[];
  cover_letter: string;
  assessment?: AssessmentData;
}

type Step = "idle" | "loading" | "done" | "error";

export default function OptimizePage() {
  const [uploadedFile, setUploadedFile] = useState<{
    file: File;
    name: string;
    size: string;
  } | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [mode, setMode] = useState<"targeted" | "general">("targeted");
  const [step, setStep] = useState<Step>("idle");
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit =
    uploadedFile !== null &&
    (mode === "general" || jobDescription.trim().length >= 50) &&
    step !== "loading";

  const handleSubmit = async () => {
    if (!canSubmit || !uploadedFile) return;

    setStep("loading");
    setResult(null);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", uploadedFile.file);
    formData.append("mode", mode);
    if (mode === "targeted") {
      formData.append("job_description", jobDescription);
    }

    try {
      // If no external API URL is set, route through Next.js mock API (dev mode)
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${apiBase}/api/v1/optimize/`, {
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

  const hasDone = step === "done" && result !== null;

  return (
    <div className={cn(
      "mx-auto px-4 py-10 sm:px-6 lg:px-8 transition-all duration-500",
      hasDone ? "max-w-7xl" : "max-w-6xl"
    )}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Optimize your resume
        </h1>
        <p className="mt-1.5 text-foreground-muted">
          {mode === "targeted"
            ? "Upload your resume and paste the job description. We\u2019ll tailor it for the role."
            : "Upload your resume and we\u2019ll improve clarity, structure, and impact."}
        </p>
      </div>

      <div className={cn(
        "grid grid-cols-1 gap-6",
        hasDone ? "lg:grid-cols-[360px_1fr]" : "lg:grid-cols-2"
      )}>
        {/* Left — inputs */}
        <div className={cn(
          "space-y-5",
          hasDone && "lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto"
        )}>
          {/* Mode toggle */}
          <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
            <button
              onClick={() => setMode("targeted")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all",
                mode === "targeted"
                  ? "bg-primary text-white shadow-sm"
                  : "text-foreground-muted hover:text-foreground"
              )}
            >
              <Target className="h-3.5 w-3.5" />
              Optimize for a Job
            </button>
            <button
              onClick={() => setMode("general")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all",
                mode === "general"
                  ? "bg-primary text-white shadow-sm"
                  : "text-foreground-muted hover:text-foreground"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              General Improvement
            </button>
          </div>

          {/* Step 1: Upload */}
          <div className="rounded-2xl border border-line bg-surface p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
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

          {/* Step 2: Job Description (targeted mode only) */}
          <AnimatePresence>
            {mode === "targeted" && (
              <motion.div
                key="jd-section"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl border border-line bg-surface p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                      2
                    </span>
                    <h2 className="font-semibold">Paste the job description</h2>
                  </div>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the full job description here — include requirements, responsibilities, and preferred qualifications for best results..."
                    rows={10}
                    className="w-full resize-none rounded-xl border border-line-strong bg-background px-4 py-3 text-sm text-foreground placeholder-foreground-dim focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  />
                  <div className="mt-1.5 flex justify-between text-xs text-foreground-muted">
                    <span>Minimum 50 characters</span>
                    <span>{jobDescription.length} chars</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white shadow-lg shadow-[rgba(108,99,255,0.3)] hover:bg-primary-dark hover:shadow-[rgba(108,99,255,0.45)] active:scale-[0.98] active:bg-[#5a52e0] active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {step === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {mode === "targeted" ? "Optimizing your resume…" : "Improving your resume…"}
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                {mode === "targeted" ? "Optimize for this job" : "Improve my resume"}
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
                className="flex flex-col items-center justify-center h-full min-h-100 rounded-2xl border border-dashed border-line text-center p-8"
              >
                <div className="h-16 w-16 rounded-2xl bg-[#6c63ff]/10 border border-[#6c63ff]/20 flex items-center justify-center mb-4">
                  <Zap className="h-7 w-7 text-[#6c63ff]" />
                </div>
                <p className="text-sm font-medium text-foreground-muted">
                  Your score and optimized resume will appear here
                </p>
                <p className="text-xs text-foreground-dim mt-1">
                  {mode === "targeted"
                    ? "Upload a resume and paste a job description to get started"
                    : "Upload your resume and we\u2019ll handle the rest"}
                </p>
              </motion.div>
            )}

            {step === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full min-h-100 rounded-2xl border border-line bg-surface text-center p-8"
              >
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                <p className="text-sm font-medium">Optimizing your resume…</p>
                <p className="text-xs text-foreground-muted mt-1">
                  {mode === "targeted"
                    ? "Scoring, rewriting, and generating cover letter in parallel"
                    : "Analyzing and improving your resume with AI"}
                </p>
                <div className="mt-5 space-y-2 w-full max-w-xs">
                  {(mode === "targeted"
                    ? ["Parsing resume", "Scoring against job description", "Rewriting with AI", "Generating cover letter"]
                    : ["Parsing resume", "Scoring resume quality", "Rewriting with AI", "Finalizing improvements"]
                  ).map(
                    (task, i) => (
                      <motion.div
                        key={task}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.4 }}
                        className="flex items-center gap-2 text-xs text-foreground-muted"
                      >
                        <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />
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
                  mode={result.mode}
                  isLocked={false}
                />
                {result.assessment && (
                  <ShortlistAssessment assessment={result.assessment} />
                )}
                {result.mode === "targeted" && result.assessment?.skills_heatmap?.length ? (
                  <GapAnalysis
                    skillsHeatmap={result.assessment.skills_heatmap}
                    transferableBridges={result.assessment.transferable_bridges ?? []}
                    gapRoadmap={result.assessment.gap_roadmap ?? []}
                  />
                ) : null}
                <ResultsPanel
                  optimizedResume={result.optimized_resume}
                  coverLetter={result.cover_letter}
                  changesMade={result.changes_made}
                  keywordsAdded={result.keywords_added}
                  mode={result.mode}
                  isPaid={true}
                  atsScore={result.score_after?.overall_score}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
