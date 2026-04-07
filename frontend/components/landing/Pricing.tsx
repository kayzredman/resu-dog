"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Zap, Lock } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "",
    description: "Try it right now. No account needed.",
    cta: "Start for free",
    ctaHref: "/optimize",
    highlighted: false,
    features: [
      { text: "Upload resume (PDF, DOCX, TXT)", included: true },
      { text: "Compatibility score — before", included: true },
      { text: "1–2 optimizations per month", included: true },
      { text: "Score after optimization (teased)", included: "partial" },
      { text: "Download optimized resume", included: false },
      { text: "Personalized cover letter", included: false },
      { text: "Full keyword breakdown", included: false },
    ],
  },
  {
    name: "Pro",
    price: "$12",
    period: "/month",
    description: "For active job seekers. Everything included.",
    cta: "Start 3-day free trial",
    ctaHref: "/optimize",
    highlighted: true,
    badge: "Most popular",
    features: [
      { text: "Upload resume (PDF, DOCX, TXT)", included: true },
      { text: "Compatibility score — before & after", included: true },
      { text: "Unlimited optimizations", included: true },
      { text: "Download optimized resume (PDF + DOCX)", included: true },
      { text: "Personalized cover letter", included: true },
      { text: "Full keyword breakdown", included: true },
      { text: "Resume history & versions", included: true },
    ],
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Simple pricing
          </h2>
          <p className="mt-3 text-foreground-muted">
            Free to try. Pay only when you want to download.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`relative rounded-2xl p-7 ${
                plan.highlighted
                  ? "bg-primary border border-primary shadow-2xl shadow-[rgba(108,99,255,0.3)]"
                  : "bg-surface border border-line"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#00d4aa] px-3 py-1 text-xs font-bold text-[#0a0a0f]">
                  {plan.badge}
                </div>
              )}

              <div className="mb-5">
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  {plan.period && (
                    <span
                      className={`text-sm ${
                        plan.highlighted ? "text-white/70" : "text-foreground-muted"
                      }`}
                    >
                      {plan.period}
                    </span>
                  )}
                </div>
                <p
                  className={`mt-1.5 text-sm ${
                    plan.highlighted ? "text-white/70" : "text-foreground-muted"
                  }`}
                >
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-3 mb-7">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-start gap-2.5">
                    {feature.included === true ? (
                      <Check
                        className={`h-4 w-4 mt-0.5 shrink-0 ${
                          plan.highlighted ? "text-white" : "text-accent"
                        }`}
                      />
                    ) : feature.included === "partial" ? (
                      <Zap
                        className={`h-4 w-4 mt-0.5 shrink-0 ${
                          plan.highlighted ? "text-white/70" : "text-warning"
                        }`}
                      />
                    ) : (
                      <Lock
                        className={`h-4 w-4 mt-0.5 shrink-0 ${
                          plan.highlighted ? "text-white/40" : "text-line-strong"
                        }`}
                      />
                    )}
                    <span
                      className={`text-sm ${
                        feature.included === false
                          ? plan.highlighted
                            ? "text-white/40"
                            : "text-foreground-disabled"
                          : plan.highlighted
                          ? "text-white"
                          : "text-foreground-soft"
                      }`}
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className={`block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all ${
                  plan.highlighted
                    ? "bg-white text-primary hover:bg-foreground"
                    : "bg-primary text-white hover:bg-primary-dark shadow-lg shadow-[rgba(108,99,255,0.25)]"
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="text-center mt-6 text-xs text-foreground-muted">
          Cancel anytime. No credit card required for free tier.
        </p>
      </div>
    </section>
  );
}
