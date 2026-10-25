// What the privacy policy and terms say about the AI provider, so they always describe the
// one the server is really using (see AI_PROVIDER in lib/ai-helpers.ts).
//
// Gemini's terms differ by tier: on the free tier Google may use inputs to improve its products
// and human reviewers may read them; on the paid tier it doesn't. The key alone doesn't tell us
// which, so set GEMINI_PAID_TIER=true once the Google project has billing turned on.

import { currentProvider } from "@/lib/ai-helpers";

export interface AIDisclosure {
  /** e.g. "the Google Gemini API" */
  service: string;
  /** Company name for lists, e.g. "Google (Gemini)" */
  company: string;
  /** How the provider treats what we send it */
  terms: string;
  /** One line for the third-party list */
  summary: string;
}

export function aiDisclosure(): AIDisclosure {
  if (currentProvider() === "openai") {
    return {
      service: "the OpenAI API",
      company: "OpenAI",
      terms:
        "Under OpenAI's API terms, this data is not used to train their models. OpenAI may keep API inputs and outputs for up to 30 days to monitor for abuse, then deletes them.",
      summary: "AI processing (no training; up to 30-day abuse-monitoring retention)",
    };
  }
  if (process.env.GEMINI_PAID_TIER === "true") {
    return {
      service: "the Google Gemini API",
      company: "Google (Gemini)",
      terms:
        "Under Google's terms for paid Gemini API services, Google doesn't use your prompts or responses to improve its products. It keeps them for a limited period only to detect abuse and meet legal obligations.",
      summary: "AI processing (no training; limited abuse-monitoring retention)",
    };
  }
  return {
    service: "the Google Gemini API (free tier, during our beta)",
    company: "Google (Gemini)",
    terms:
      "Under Google's terms for unpaid Gemini API services, Google may use what we send to improve its products, and human reviewers may read it. Please don't upload anything you wouldn't want reviewed. We'll move to the paid tier, which doesn't allow this, before launch.",
    summary: "AI processing (free tier: may be used to improve Google's products)",
  };
}
