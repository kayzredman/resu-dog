"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Pen,
  FileDown,
  Globe,
  Eye,
  Users,
} from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Before & After Score",
    description:
      "See exactly how your resume scores against the job description before and after optimization — across keywords, skills, and formatting.",
    tag: "Free preview",
    tagColor: "#00d4aa",
  },
  {
    icon: Pen,
    title: "AI Rewrite with Action Verbs",
    description:
      "Every experience bullet is rewritten with powerful action verbs and role-specific keywords. No fabrication — only what's already there, made stronger.",
    tag: "Core",
    tagColor: "#6c63ff",
  },
  {
    icon: FileDown,
    title: "Clean ATS-Proof Output",
    description:
      "Download your optimized resume as PDF or DOCX. No tables, no columns, no headers that break parsers. Built to pass every ATS system.",
    tag: "Paid",
    tagColor: "#6c63ff",
  },
  {
    icon: Globe,
    title: "Personalized Cover Letter",
    description:
      "Not a template. A cover letter that connects your specific experience to the specific role — written to complement your optimized resume.",
    tag: "Paid",
    tagColor: "#6c63ff",
  },
  {
    icon: Eye,
    title: "Public Profile Page",
    description:
      "Share a beautiful scroll-based resume landing page with a 'Hire Me' CTA. See who viewed it. Coming Phase 2.",
    tag: "Phase 2",
    tagColor: "#f59e0b",
  },
  {
    icon: Users,
    title: "Multi-Platform Modes",
    description:
      "Optimize for LinkedIn, WES credential evaluation, UK/AU/CA CV formats, and specific ATS systems like Workday and Greenhouse.",
    tag: "Phase 2",
    tagColor: "#f59e0b",
  },
];

export default function Features() {
  return (
    <section id="features" className="px-4 py-24 sm:px-6 lg:px-8 bg-section">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Everything you need to land the interview
          </h2>
          <p className="mt-3 text-foreground-muted max-w-xl mx-auto">
            Built for the ATS era. Designed for the human on the other side too.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="group rounded-2xl border border-line bg-surface p-6 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{
                    color: feature.tagColor,
                    background: `${feature.tagColor}15`,
                    border: `1px solid ${feature.tagColor}30`,
                  }}
                >
                  {feature.tag}
                </span>
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-foreground-muted leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
