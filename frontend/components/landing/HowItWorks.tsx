"use client";

import { motion } from "framer-motion";
import { Upload, Cpu, Download } from "lucide-react";

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Upload your resume",
    description:
      "Drop your resume in PDF, DOCX, or TXT format. Paste the job description you're targeting.",
    color: "#6c63ff",
  },
  {
    icon: Cpu,
    step: "02",
    title: "AI optimizes it",
    description:
      "GPT-4o rewrites your experience with strong action verbs, adds ATS keywords, and cleans the formatting. Your score jumps.",
    color: "#00d4aa",
  },
  {
    icon: Download,
    step: "03",
    title: "Download & apply",
    description:
      "Get your optimized resume and a personalized cover letter. See your before/after score. Apply with confidence.",
    color: "#6c63ff",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Three steps. Sixty seconds.
          </h2>
          <p className="mt-3 text-[#8888aa] max-w-xl mx-auto">
            From raw resume to fully optimized, scored, and cover-letter-ready.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector line (desktop) */}
          <div
            aria-hidden
            className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-[#6c63ff]/30 via-[#00d4aa]/40 to-[#6c63ff]/30"
          />

          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="relative rounded-2xl border border-[#1e1e2e] bg-[#12121a] p-7"
            >
              <div
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl mb-5"
                style={{
                  background: `${step.color}18`,
                  border: `1px solid ${step.color}30`,
                }}
              >
                <step.icon className="h-5 w-5" style={{ color: step.color }} />
              </div>
              <div className="absolute top-6 right-6 text-4xl font-black text-[#1e1e2e]">
                {step.step}
              </div>
              <h3 className="text-lg font-bold mb-2">{step.title}</h3>
              <p className="text-sm text-[#8888aa] leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
