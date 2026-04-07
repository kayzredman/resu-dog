"use client";

import { motion } from "framer-motion";
import { TrendingUp, Tag, Cpu, AlignLeft } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface ScoreCardProps {
  before: ScoreData;
  after: ScoreData;
  mode?: "targeted" | "general";
  isLocked?: boolean;
  hideBeforeAfter?: boolean;
}

function getScoreColor(score: number) {
  if (score >= 75) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-[100px] w-[100px]">
        <svg className="rotate-[-90deg]" width="100" height="100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--line)" strokeWidth="8" />
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-2xl font-extrabold"
            style={{ color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {score}
          </motion.span>
          <span className="text-[10px] text-foreground-muted">/ 100</span>
        </div>
      </div>
      <span className="text-xs font-medium text-foreground-muted">{label}</span>
    </div>
  );
}

function ScoreBar({ label, icon: Icon, value }: { label: string; icon: React.ElementType; value: number }) {
  const color = getScoreColor(value);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <span className="text-xs font-semibold" style={{ color }}>
          {value}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-line overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />
      </div>
    </div>
  );
}

export default function ScoreCard({ before, after, mode = "targeted", isLocked = false, hideBeforeAfter = false }: ScoreCardProps) {
  const improvement = after.overall_score - before.overall_score;
  const afterColor = getScoreColor(after.overall_score);
  const heroRadius = 56;
  const heroCircumference = 2 * Math.PI * heroRadius;

  return (
    <div className="space-y-4">
      {/* Hero optimized score */}
      <div className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-foreground-muted">
            Optimized ATS Score
          </span>

          <div className="relative h-[140px] w-[140px]">
            <svg className="rotate-[-90deg]" width="140" height="140">
              <circle cx="70" cy="70" r={heroRadius} fill="none" stroke="var(--line)" strokeWidth="10" />
              <motion.circle
                cx="70" cy="70" r={heroRadius}
                fill="none"
                stroke={afterColor}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={heroCircumference}
                initial={{ strokeDashoffset: heroCircumference }}
                animate={{ strokeDashoffset: heroCircumference - (after.overall_score / 100) * heroCircumference }}
                transition={{ duration: 1.4, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className="text-5xl font-extrabold tabular-nums"
                style={{ color: afterColor }}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
              >
                {after.overall_score}
              </motion.span>
              <span className="text-xs text-foreground-muted">/ 100</span>
            </div>
          </div>

          {!hideBeforeAfter && improvement > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="flex items-center gap-2 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/25 px-4 py-1.5 text-sm font-bold text-[#22c55e]"
            >
              <TrendingUp className="h-4 w-4" />
              +{improvement} pts improvement from original
            </motion.div>
          )}

          {!isLocked && after.summary && (
            <p className="text-xs text-center text-foreground-muted italic max-w-xs">{after.summary}</p>
          )}
        </div>
      </div>

      {/* Before / After comparison */}
      {!hideBeforeAfter && (
      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="font-semibold text-sm mb-5">Before vs After</h3>
        <div className="flex items-center justify-around">
          <ScoreRing
            score={before.overall_score}
            label="Before"
            color={getScoreColor(before.overall_score)}
          />
          <div className="text-3xl font-black text-line">→</div>
          <div className={cn("relative", isLocked && "select-none")}>
            {isLocked && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm bg-background/60">
                <span className="text-xs text-foreground-muted text-center px-2">Upgrade to unlock</span>
              </div>
            )}
            <ScoreRing
              score={isLocked ? 0 : after.overall_score}
              label="After"
              color={afterColor}
            />
          </div>
        </div>
      </div>
      )}

      {/* Score breakdown bars */}
        <div className="rounded-2xl border border-line bg-surface p-6 space-y-4">
        <h3 className="font-semibold text-sm mb-2">Score Breakdown</h3>
        {mode === "general" ? (
          <>
            <ScoreBar label="Clarity" icon={AlignLeft} value={after.clarity ?? 0} />
            <ScoreBar label="Action Language" icon={Cpu} value={after.action_language ?? 0} />
            <ScoreBar label="Structure" icon={Tag} value={after.structure ?? 0} />
            <ScoreBar label="Completeness" icon={TrendingUp} value={after.completeness ?? 0} />
          </>
        ) : (
          <>
            <ScoreBar label="Keyword Coverage" icon={Tag} value={after.keyword_coverage ?? 0} />
            <ScoreBar label="Skills Alignment" icon={Cpu} value={after.skills_alignment ?? 0} />
            <ScoreBar label="Formatting Compliance" icon={AlignLeft} value={after.formatting_compliance ?? 0} />
          </>
        )}
      </div>

      {/* Keywords (targeted mode only) */}
      {mode === "targeted" && after.matched_keywords && after.matched_keywords.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-6">
          <h3 className="font-semibold text-sm mb-3">
            Matched Keywords{" "}
            <span className="text-foreground-muted font-normal">
              ({after.matched_keywords.length})
            </span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {after.matched_keywords.slice(0, 15).map((kw) => (
              <span
                key={kw}
                className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs text-accent"
              >
                {kw}
              </span>
            ))}
          </div>

            {after.missing_keywords && after.missing_keywords.length > 0 && (
            <>
              <h3 className="font-semibold text-sm mt-4 mb-3">
                Missing Keywords{" "}
                <span className="text-foreground-muted font-normal">
                  ({after.missing_keywords.length})
                </span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {after.missing_keywords.slice(0, 10).map((kw) => (
                  <span
                    key={kw}
                    className="rounded-full border border-danger/20 bg-danger/10 px-2.5 py-0.5 text-xs text-danger"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
