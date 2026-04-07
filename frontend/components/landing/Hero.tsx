"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, ShieldCheck, FileText } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pt-20 pb-24 sm:px-6 lg:px-8">
      {/* Background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-start justify-center"
      >
        <div className="h-[600px] w-[900px] rounded-full bg-[#6c63ff] opacity-[0.07] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left — copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-6">
              <Sparkles className="h-3 w-3" />
              Powered by GPT-4o
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
              Your resume,{" "}
              <span className="text-[#6c63ff]">finally</span>{" "}
              seen by humans
            </h1>

            <p className="mt-5 text-lg text-foreground-muted leading-relaxed max-w-xl">
              75% of resumes are rejected by ATS before a human reads them. Resu-Dog
              rewrites yours for the job, scores it before and after, and writes a
              cover letter that&apos;s actually personal.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/optimize"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-[rgba(108,99,255,0.35)] hover:bg-primary-dark hover:shadow-[rgba(108,99,255,0.5)] transition-all"
              >
                Optimize my resume free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-line px-6 py-3.5 text-base font-medium text-foreground-muted hover:text-foreground hover:border-line-hover transition-all"
              >
                See how it works
              </a>
            </div>

            {/* Trust badges */}
            <div className="mt-8 flex flex-wrap items-center gap-5 text-xs text-foreground-muted">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#00d4aa]" />
                Data never stored
              </span>
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-[#00d4aa]" />
                PDF, DOCX, TXT
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-[#00d4aa]" />
                Free to try
              </span>
            </div>
          </motion.div>

          {/* Right — illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
            className="hidden lg:flex justify-center"
          >
            <HeroIllustration />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function HeroIllustration() {
  return (
    <div className="relative">
      {/* Score card mock */}
      <div className="w-[360px] rounded-2xl border border-line bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider">
            Compatibility Score
          </span>
          <span className="text-xs text-[#00d4aa] font-semibold">Senior Dev Role</span>
        </div>

        {/* Before / After scores */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-xl bg-background p-4 text-center border border-line">
            <p className="text-xs text-foreground-muted mb-1">Before</p>
            <p className="text-3xl font-black text-[#ef4444]">38</p>
            <p className="text-xs text-foreground-muted">/ 100</p>
          </div>
          <div className="rounded-xl bg-primary/10 p-4 text-center border border-primary/30">
            <p className="text-xs text-[#6c63ff] mb-1">After</p>
            <p className="text-3xl font-black text-[#6c63ff]">91</p>
            <p className="text-xs text-[#6c63ff]/70">/ 100</p>
          </div>
        </div>

        {/* Score bars */}
        {[
          { label: "Keyword Coverage", before: 30, after: 88 },
          { label: "Skills Alignment", before: 45, after: 94 },
          { label: "Formatting", before: 40, after: 92 },
        ].map((item) => (
          <div key={item.label} className="mb-3 last:mb-0">
            <div className="flex justify-between text-xs text-foreground-muted mb-1.5">
              <span>{item.label}</span>
              <span className="text-[#6c63ff] font-semibold">{item.after}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-line overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#6c63ff] to-[#00d4aa]"
                style={{ width: `${item.after}%` }}
              />
            </div>
          </div>
        ))}

        {/* CTA row */}
        <div className="mt-5 flex gap-2">
          <div className="flex-1 rounded-lg bg-[#6c63ff] py-2.5 text-center text-xs font-semibold text-white">
            Download Resume
          </div>
          <div className="flex-1 rounded-lg border border-line py-2.5 text-center text-xs font-medium text-foreground-muted">
            Cover Letter
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="absolute -top-4 -right-4 rounded-xl bg-[#00d4aa] px-3 py-2 text-xs font-bold text-[#0a0a0f] shadow-lg"
      >
        +53 pts boost
      </motion.div>
    </div>
  );
}
