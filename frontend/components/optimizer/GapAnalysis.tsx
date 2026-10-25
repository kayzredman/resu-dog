"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, CheckCircle2, ArrowRightLeft, XCircle, BookOpen, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SkillHeatmapItem, TransferableBridge, GapRoadmapItem } from "./ShortlistAssessment";

interface GapAnalysisProps {
  skillsHeatmap: SkillHeatmapItem[];
  transferableBridges: TransferableBridge[];
  gapRoadmap: GapRoadmapItem[];
}

const STATUS_CONFIG = {
  matched: {
    pill: "bg-success/10 border border-success/25 text-success",
    icon: CheckCircle2,
    iconColor: "text-success",
    label: "Matched",
  },
  transferable: {
    pill: "bg-warning/10 border border-warning/25 text-warning",
    icon: ArrowRightLeft,
    iconColor: "text-warning",
    label: "Transferable",
  },
  gap: {
    pill: "bg-danger/10 border border-danger/25 text-danger",
    icon: XCircle,
    iconColor: "text-danger",
    label: "Gap",
  },
};

export default function GapAnalysis({ skillsHeatmap, transferableBridges, gapRoadmap }: GapAnalysisProps) {
  const [expanded, setExpanded] = useState(false);

  const matched = skillsHeatmap.filter((s) => s.status === "matched");
  const transferable = skillsHeatmap.filter((s) => s.status === "transferable");
  const gaps = skillsHeatmap.filter((s) => s.status === "gap");

  const hasTransferable = transferableBridges.length > 0;
  const hasGaps = gapRoadmap.length > 0;

  return (
    <div className="rounded-2xl border border-line bg-surface overflow-hidden">
      {/* Banner / toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-(--overlay) transition-colors group"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary-ink shrink-0" />
            <span className="font-semibold text-sm">Skills Gap Analysis</span>
          </div>
          {/* Summary pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 rounded-full bg-success/10 border border-success/20 px-2.5 py-0.5 text-[11px] font-semibold text-success">
              <CheckCircle2 className="h-3 w-3" />
              {matched.length} matched
            </span>
            {transferable.length > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-warning/10 border border-warning/20 px-2.5 py-0.5 text-[11px] font-semibold text-warning">
                <ArrowRightLeft className="h-3 w-3" />
                {transferable.length} transferable
              </span>
            )}
            {gaps.length > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-danger/10 border border-danger/20 px-2.5 py-0.5 text-[11px] font-semibold text-danger">
                <XCircle className="h-3 w-3" />
                {gaps.length} {gaps.length === 1 ? "gap" : "gaps"}
              </span>
            )}
          </div>
        </div>
        <div className="text-foreground-muted group-hover:text-foreground transition-colors shrink-0 ml-2">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expandable body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="gap-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-6 border-t border-line pt-5">

              {/* ── Heatmap pill grid ──────────────────────────────────── */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-foreground-muted mb-3">
                  Skills Heatmap
                </h4>
                <div className="flex flex-wrap gap-2">
                  {skillsHeatmap.map((item) => {
                    const cfg = STATUS_CONFIG[item.status];
                    const Icon = cfg.icon;
                    return (
                      <span
                        key={item.skill}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                          cfg.pill
                        )}
                      >
                        <Icon className="h-3 w-3 shrink-0" />
                        {item.skill}
                      </span>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-foreground-muted">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-success" /> Matched — present in your resume</span>
                  <span className="flex items-center gap-1.5"><ArrowRightLeft className="h-3 w-3 text-warning" /> Transferable — adjacent experience exists</span>
                  <span className="flex items-center gap-1.5"><XCircle className="h-3 w-3 text-danger" /> Gap — genuinely missing</span>
                </div>
              </div>

              {/* ── Transferable bridges ───────────────────────────────── */}
              {hasTransferable && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-foreground-muted mb-3">
                    Transferable Skill Bridges
                  </h4>
                  <div className="space-y-2.5">
                    {transferableBridges.map((item) => (
                      <div
                        key={item.skill}
                        className="flex gap-3 rounded-xl border-l-2 border-warning/60 bg-warning/5 px-4 py-3"
                      >
                        <ArrowRightLeft className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-warning mb-0.5">{item.skill}</p>
                          <p className="text-sm text-foreground-soft leading-relaxed">{item.bridge}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Gap closure roadmap ────────────────────────────────── */}
              {hasGaps && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-foreground-muted mb-3">
                    Gap Closure Roadmap
                  </h4>
                  <div className="space-y-2.5">
                    {gapRoadmap.map((item) => (
                      <div
                        key={item.skill}
                        className="flex gap-3 rounded-xl border-l-2 border-danger/50 bg-danger/5 px-4 py-3"
                      >
                        <BookOpen className="h-4 w-4 text-danger shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-danger mb-0.5">{item.skill}</p>
                          <p className="text-sm text-foreground-soft leading-relaxed">{item.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] text-foreground-dim">
                    These are honest next steps — not quick fixes. Closing these gaps strengthens every future application, not just this one.
                  </p>
                </div>
              )}

              {!hasTransferable && !hasGaps && (
                <p className="text-sm text-foreground-muted text-center py-2">
                  All JD skills are matched — no gaps detected. Strong alignment.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
