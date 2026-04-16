"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  AlertTriangle,
  Zap,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SkillHeatmapItem {
  skill: string;
  status: "matched" | "transferable" | "gap";
}

export interface TransferableBridge {
  skill: string;
  bridge: string;
}

export interface GapRoadmapItem {
  skill: string;
  action: string;
}

export interface AssessmentData {
  shortlist_probability: "Low" | "Fair" | "Good" | "Strong";
  probability_rationale: string;
  strengths: string[];
  critical_gaps: string[];
  quick_wins: string[];
  red_flags: string[];
  // Gap Analysis (targeted mode only)
  skills_heatmap?: SkillHeatmapItem[];
  transferable_bridges?: TransferableBridge[];
  gap_roadmap?: GapRoadmapItem[];
}

interface ShortlistAssessmentProps {
  assessment: AssessmentData;
}

const PROBABILITY_CONFIG = {
  Low: {
    color: "#ef4444",
    bg: "bg-[#ef4444]/10",
    border: "border-[#ef4444]/25",
    text: "text-[#ef4444]",
    bar: 15,
    label: "Low chance",
  },
  Fair: {
    color: "#f59e0b",
    bg: "bg-[#f59e0b]/10",
    border: "border-[#f59e0b]/25",
    text: "text-[#f59e0b]",
    bar: 42,
    label: "Fair chance",
  },
  Good: {
    color: "#6c63ff",
    bg: "bg-[#6c63ff]/10",
    border: "border-[#6c63ff]/25",
    text: "text-[#6c63ff]",
    bar: 70,
    label: "Good chance",
  },
  Strong: {
    color: "#22c55e",
    bg: "bg-[#22c55e]/10",
    border: "border-[#22c55e]/25",
    text: "text-[#22c55e]",
    bar: 92,
    label: "Strong match",
  },
};

export default function ShortlistAssessment({ assessment }: ShortlistAssessmentProps) {
  const [open, setOpen] = useState(false);
  const cfg = PROBABILITY_CONFIG[assessment.shortlist_probability] ?? PROBABILITY_CONFIG.Fair;

  return (
    <div className="rounded-2xl border border-line bg-surface overflow-hidden">
      {/* ── Banner (always visible) ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-foreground/2 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-4 min-w-0">
          {/* Probability badge */}
          <div
            className={cn(
              "shrink-0 rounded-xl border px-3 py-1.5 text-sm font-bold",
              cfg.bg,
              cfg.border,
              cfg.text
            )}
          >
            {cfg.label}
          </div>

          {/* Progress bar + rationale */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="h-1.5 w-full max-w-50 rounded-full bg-line overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: cfg.color }}
                initial={{ width: 0 }}
                animate={{ width: open || true ? `${cfg.bar}%` : 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
              />
            </div>
            <p className="text-xs text-foreground-muted truncate pr-2">
              {assessment.probability_rationale}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-primary hidden sm:block">
            {open ? "Hide analysis" : "View deep analysis"}
          </span>
          {open ? (
            <ChevronUp className="h-4 w-4 text-foreground-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-foreground-muted" />
          )}
        </div>
      </button>

      {/* ── Expandable body ── */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-line px-5 pb-5 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Strengths */}
              {assessment.strengths.length > 0 && (
                <Section
                  icon={CheckCircle2}
                  iconColor="#22c55e"
                  title="What's working"
                  items={assessment.strengths}
                  itemStyle="text-foreground-soft"
                  dotColor="#22c55e"
                />
              )}

              {/* Critical gaps */}
              {assessment.critical_gaps.length > 0 && (
                <Section
                  icon={AlertTriangle}
                  iconColor="#f59e0b"
                  title="Critical gaps"
                  items={assessment.critical_gaps}
                  itemStyle="text-foreground-soft"
                  dotColor="#f59e0b"
                />
              )}

              {/* Quick wins */}
              {assessment.quick_wins.length > 0 && (
                <Section
                  icon={Zap}
                  iconColor="#6c63ff"
                  title="Quick wins — do these now"
                  items={assessment.quick_wins}
                  itemStyle="text-foreground-soft"
                  dotColor="#6c63ff"
                  numbered
                />
              )}

              {/* Red flags */}
              {assessment.red_flags.length > 0 && (
                <Section
                  icon={ShieldAlert}
                  iconColor="#ef4444"
                  title="Recruiter red flags"
                  items={assessment.red_flags}
                  itemStyle="text-foreground-soft"
                  dotColor="#ef4444"
                />
              )}

              {/* No red flags — positive note */}
              {assessment.red_flags.length === 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-[#22c55e]/20 bg-[#22c55e]/8 px-4 py-3 sm:col-span-2">
                  <TrendingUp className="h-4 w-4 text-[#22c55e] shrink-0" />
                  <p className="text-xs text-[#22c55e] font-medium">No major red flags detected — strong presentation overall.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Section sub-component ────────────────────────────────────────────────────

function Section({
  icon: Icon,
  iconColor,
  title,
  items,
  itemStyle,
  dotColor,
  numbered = false,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  items: string[];
  itemStyle: string;
  dotColor: string;
  numbered?: boolean;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: iconColor }} />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
          {title}
        </h4>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-start gap-2 text-sm"
          >
            {numbered ? (
              <span
                className="shrink-0 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white mt-0.5"
                style={{ backgroundColor: dotColor }}
              >
                {i + 1}
              </span>
            ) : (
              <span
                className="shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: dotColor }}
              />
            )}
            <span className={itemStyle}>{item}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
