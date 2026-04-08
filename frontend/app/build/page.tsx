"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Zap,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Check,
  FileText,
  HelpCircle,
  PenLine,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ScoreCard from "@/components/optimizer/ScoreCard";
import ResultsPanel from "@/components/optimizer/ResultsPanel";
import ShortlistAssessment from "@/components/optimizer/ShortlistAssessment";
import GapAnalysis from "@/components/optimizer/GapAnalysis";
import type { AssessmentData } from "@/components/optimizer/ShortlistAssessment";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  id: string;
  section: string;
  question: string;
  placeholder: string;
  required: boolean;
}

interface AnalyzeResult {
  role_title: string;
  seniority: string;
  industry: string;
  key_skills: string[];
  questions: Question[];
}

interface ScoreData {
  overall_score: number;
  keyword_coverage: number;
  skills_alignment: number;
  formatting_compliance: number;
  matched_keywords: string[];
  missing_keywords: string[];
  summary: string;
}

interface BuildResult {
  resume: string;
  keywords_used: string[];
  score: ScoreData;
  assessment?: AssessmentData;
}

// ─── Step constants ───────────────────────────────────────────────────────────

const WIZARD_STEPS = [
  { id: "jd", label: "Job Description", icon: FileText },
  { id: "questions", label: "Your Details", icon: HelpCircle },
  { id: "review", label: "Review & Build", icon: PenLine },
  { id: "result", label: "Your CV", icon: Sparkles },
];

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      {WIZARD_STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = i < current;
        const active = i === current;
        return (
          <div key={step.id} className="flex items-center gap-3 flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                  done
                    ? "border-primary bg-primary text-white"
                    : active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-line bg-surface text-foreground-dim"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium hidden sm:block",
                  active ? "text-primary" : done ? "text-foreground-muted" : "text-foreground-dim"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < WIZARD_STEPS.length - 1 && (
              <div className="h-0.5 flex-1 rounded-full bg-line overflow-hidden -mt-5">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: i < current ? "100%" : "0%" }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            )}
          </div>
        );
      })}
      <span className="text-xs text-foreground-muted shrink-0 -mt-5">
        {current + 1}/{total}
      </span>
    </div>
  );
}

// ─── Factual fields — AI Assist not useful here ───────────────────────────────

const FACTUAL_PATTERNS = [
  /\bname\b/i,
  /\baddress\b/i,
  /\blocation\b/i,
  /\bcity\b/i,
  /\bcountry\b/i,
  /\bphone\b/i,
  /\bmobile\b/i,
  /\bemail\b/i,
  /\blinkedin\b/i,
  /\bgraduat(ion|ed)\s*year\b/i,
  /\byear\s*(of\s*)?graduation\b/i,
  /\bwhen\s*did\s*you\s*graduate\b/i,
  /\bdate\s*of\s*birth\b/i,
  /\bnationality\b/i,
];

function isFactualField(q: Question): boolean {
  return FACTUAL_PATTERNS.some((re) => re.test(q.question) || re.test(q.placeholder));
}

// ─── Section grouping ─────────────────────────────────────────────────────────

function groupBySection(questions: Question[]) {
  const order = ["Personal Info", "Work Experience", "Education", "Skills", "Achievements"];
  const map = new Map<string, Question[]>();
  for (const q of questions) {
    if (!map.has(q.section)) map.set(q.section, []);
    map.get(q.section)!.push(q);
  }
  // Sort by predefined order, then append unknowns
  const sorted: [string, Question[]][] = [];
  for (const sec of order) {
    if (map.has(sec)) sorted.push([sec, map.get(sec)!]);
  }
  for (const [sec, qs] of map.entries()) {
    if (!order.includes(sec)) sorted.push([sec, qs]);
  }
  return sorted;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BuildPage() {
  const [wizardStep, setWizardStep] = useState(0); // 0=JD, 1=questions, 2=review, 3=result
  const [jobDescription, setJobDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState("");
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);
  const [assistingQId, setAssistingQId] = useState<string | null>(null);

  // ── AI Assist: pre-fill a draft answer for a single question ───────────────
  const handleAssist = async (q: Question) => {
    if (!analysis || assistingQId !== null) return;
    setAssistingQId(q.id);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${apiBase}/api/v1/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assist",
          role_title: analysis.role_title,
          seniority: analysis.seniority,
          industry: analysis.industry,
          section: q.section,
          question: q.question,
          existing_answers: answers,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.suggestion) {
        setAnswers((prev) => ({ ...prev, [q.id]: data.suggestion }));
      }
    } finally {
      setAssistingQId(null);
    }
  };

  // ── Step 0: Analyze JD ──────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (jobDescription.trim().length < 50) return;
    setAnalyzing(true);
    setAnalyzeError("");
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${apiBase}/api/v1/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze", job_description: jobDescription }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? `Server error: ${res.status}`);
      }
      const data: AnalyzeResult = await res.json();
      setAnalysis(data);
      setWizardStep(1);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Step 2 → 3: Write CV ────────────────────────────────────────────────────
  const handleBuild = async () => {
    if (!analysis) return;
    setBuilding(true);
    setBuildError("");
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${apiBase}/api/v1/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "write", job_description: jobDescription, answers }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? `Server error: ${res.status}`);
      }
      const data: BuildResult = await res.json();
      setBuildResult(data);
      setWizardStep(3);
    } catch (err) {
      setBuildError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBuilding(false);
    }
  };

  const requiredAnswered = analysis
    ? analysis.questions
        .filter((q) => q.required)
        .every((q) => (answers[q.id] ?? "").trim().length > 0)
    : false;

  return (
    <div className={cn(
      "mx-auto px-4 py-10 sm:px-6 lg:px-8 transition-all duration-500",
      wizardStep === 3 && buildResult ? "max-w-screen-xl" : "max-w-3xl"
    )}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">CV Builder</h1>
        <p className="mt-1.5 text-foreground-muted">
          No resume? No problem. Paste the job description and we&apos;ll ask the right questions
          to build a tailored CV from scratch.
        </p>
      </div>

      <ProgressBar current={wizardStep} total={WIZARD_STEPS.length} />

      <AnimatePresence mode="wait">
        {/* ── Step 0: Paste JD ─────────────────────────────────────────────── */}
        {wizardStep === 0 && (
          <motion.div
            key="step-jd"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
          >
            <div className="rounded-2xl border border-line bg-surface p-6 space-y-4">
              <div>
                <h2 className="font-semibold text-lg">Paste the job description</h2>
                <p className="text-sm text-foreground-muted mt-0.5">
                  We&apos;ll read it and generate tailored questions for this specific role.
                </p>
              </div>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here — the more detail, the better the questions..."
                rows={12}
                className="w-full resize-none rounded-xl border border-line-strong bg-background px-4 py-3 text-sm text-foreground placeholder-foreground-dim focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
              <div className="flex items-center justify-between text-xs text-foreground-muted">
                <span>Minimum 50 characters</span>
                <span>{jobDescription.length} chars</span>
              </div>

              {analyzeError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/10 p-4">
                  <AlertCircle className="h-4 w-4 text-[#ef4444] mt-0.5 shrink-0" />
                  <p className="text-sm text-[#ef4444]">{analyzeError}</p>
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={jobDescription.trim().length < 50 || analyzing}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white shadow-lg shadow-[rgba(108,99,255,0.3)] hover:bg-primary-dark active:scale-[0.98] active:bg-[#5a52e0] active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing job description…
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Generate my questions
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Step 1: Questions ────────────────────────────────────────────── */}
        {wizardStep === 1 && analysis && (
          <motion.div
            key="step-questions"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="space-y-5"
          >
            {/* Role pill */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {analysis.role_title}
              </span>
              <span className="rounded-full border border-line px-3 py-1 text-xs text-foreground-muted">
                {analysis.seniority}
              </span>
              <span className="rounded-full border border-line px-3 py-1 text-xs text-foreground-muted">
                {analysis.industry}
              </span>
            </div>

            {/* Grouped questions */}
            {groupBySection(analysis.questions).map(([section, qs]) => (
              <div key={section} className="rounded-2xl border border-line bg-surface p-6 space-y-5">
                <h3 className="font-semibold text-sm uppercase tracking-widest text-foreground-muted">
                  {section}
                </h3>
                {qs.map((q) => (
                  <div key={q.id} className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      {q.question}
                      {q.required && <span className="text-[#ef4444] ml-0.5">*</span>}
                    </label>
                    <textarea
                      value={answers[q.id] ?? ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      placeholder={q.placeholder}
                      rows={q.section === "Work Experience" ? 4 : 2}
                      className="w-full resize-none rounded-xl border border-line-strong bg-background px-4 py-3 text-sm text-foreground placeholder-foreground-dim focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                    />
                    <div className="flex justify-end">
                      {!isFactualField(q) && (
                      <button
                        type="button"
                        onClick={() => handleAssist(q)}
                        disabled={assistingQId !== null}
                        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {assistingQId === q.id ? (
                          <><Loader2 className="h-3 w-3 animate-spin" />Getting suggestion&hellip;</>
                        ) : (
                          <><Sparkles className="h-3 w-3" />{answers[q.id] ? "Rewrite with AI" : "Help me write this"}</>
                        )}
                      </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            <div className="flex gap-3">
              <button
                onClick={() => setWizardStep(0)}
                className="flex items-center gap-1.5 rounded-xl border border-line px-5 py-3 text-sm font-semibold text-foreground-muted hover:text-foreground hover:border-line-hover transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={() => setWizardStep(2)}
                disabled={!requiredAnswered}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-dark active:scale-[0.98] active:bg-[#5a52e0] active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Review answers
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Step 2: Review ──────────────────────────────────────────────── */}
        {wizardStep === 2 && analysis && (
          <motion.div
            key="step-review"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="space-y-5"
          >
            <div className="rounded-2xl border border-line bg-surface p-6 space-y-4">
              <h2 className="font-semibold text-lg">Review your answers</h2>
              <p className="text-sm text-foreground-muted">
                Everything look good? Hit Build to generate your tailored CV.
              </p>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {analysis.questions.map((q) =>
                  answers[q.id] ? (
                    <div key={q.id} className="rounded-xl bg-background p-4 space-y-1">
                      <p className="text-xs text-foreground-muted">{q.question}</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{answers[q.id]}</p>
                    </div>
                  ) : null
                )}
              </div>
            </div>

            {buildError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/10 p-4">
                <AlertCircle className="h-4 w-4 text-[#ef4444] mt-0.5 shrink-0" />
                <p className="text-sm text-[#ef4444]">{buildError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setWizardStep(1)}
                className="flex items-center gap-1.5 rounded-xl border border-line px-5 py-3 text-sm font-semibold text-foreground-muted hover:text-foreground hover:border-line-hover transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Edit answers
              </button>
              <button
                onClick={handleBuild}
                disabled={building}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-[rgba(108,99,255,0.3)] hover:bg-primary-dark active:scale-[0.98] active:bg-[#5a52e0] active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {building ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Building your CV…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Build my CV
                  </>
                )}
              </button>
            </div>

            {/* Building progress animation */}
            <AnimatePresence>
              {building && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border border-line bg-surface p-5"
                >
                  <div className="space-y-2">
                    {[
                      "Reading your answers",
                      "Writing your experience section",
                      "Crafting tailored bullet points",
                      "Scoring against the job description",
                    ].map((task, i) => (
                      <motion.div
                        key={task}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.5 }}
                        className="flex items-center gap-2 text-xs text-foreground-muted"
                      >
                        <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                        {task}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Step 3: Result ──────────────────────────────────────────────── */}
        {wizardStep === 3 && buildResult && (
          <motion.div
            key="step-result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg">Your CV is ready</h2>
                <p className="text-sm text-foreground-muted">
                  Tailored for{" "}
                  <span className="text-primary font-medium">{analysis?.role_title}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setWizardStep(0);
                  setJobDescription("");
                  setAnalysis(null);
                  setAnswers({});
                  setBuildResult(null);
                }}
                className="text-xs text-foreground-muted hover:text-foreground border border-line rounded-lg px-3 py-1.5 transition-colors"
              >
                Start over
              </button>
            </div>

            {/* Score + Assessment side by side on wide screens */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ScoreCard
                before={{ overall_score: 0, summary: "", keyword_coverage: 0, skills_alignment: 0, formatting_compliance: 0, matched_keywords: [], missing_keywords: [] }}
                after={buildResult.score}
                mode="targeted"
                isLocked={false}
                hideBeforeAfter
              />

              {buildResult.assessment && (
                <ShortlistAssessment assessment={buildResult.assessment} />
              )}
              {buildResult.assessment?.skills_heatmap?.length ? (
                <GapAnalysis
                  skillsHeatmap={buildResult.assessment.skills_heatmap}
                  transferableBridges={buildResult.assessment.transferable_bridges ?? []}
                  gapRoadmap={buildResult.assessment.gap_roadmap ?? []}
                />
              ) : null}
            </div>

            {/* Optimized resume — full width */}
            <ResultsPanel
              optimizedResume={buildResult.resume}
              coverLetter=""
              changesMade={[]}
              keywordsAdded={buildResult.keywords_used}
              mode="targeted"
              isPaid={true}
              hideCoverLetter
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
