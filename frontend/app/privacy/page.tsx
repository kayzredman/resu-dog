import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Resu-Dog",
  description: "How Resu-Dog handles your data, uses AI, and protects your privacy.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">Privacy Policy</h1>
      <p className="text-sm text-foreground-muted mb-10">Last updated: October 2026</p>

      <div className="prose prose-sm prose-invert max-w-none space-y-8 text-foreground-soft leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">1. What we collect</h2>
          <p>
            When you use Resu-Dog, we process the resume file, job description and questionnaire answers you provide
            to generate your results. We don&apos;t ask you to create an account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">2. How we use AI</h2>
          <p>
            Resu-Dog sends your resume and job description to the <strong>OpenAI API</strong> to perform optimization,
            scoring, assessment, cover letter generation, and profile extraction. Under OpenAI&apos;s API terms, this data
            is <strong>not used to train their models</strong>. OpenAI may keep API inputs and outputs for up to 30 days
            to monitor for abuse, then deletes them.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">3. What we store, and for how long</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Optimizing or building a resume:</strong> nothing is saved on our servers. Files and text are
              processed in memory and discarded when your results are returned.
            </li>
            <li>
              <strong>Sharing a profile page:</strong> when you tap &ldquo;Share Profile&rdquo;, we store the profile
              you chose to publish (name, title, summary, experience, education, skills, and your email only if you
              chose to show it) on our database provider, Upstash. Your full CV text is stored only if you choose to
              let visitors download it. Shared profiles are deleted automatically after <strong>90 days</strong>, are
              hidden from search engines, and you can unpublish yours at any time from the profile page.
            </li>
            <li>
              <strong>Abuse prevention:</strong> to stop automated misuse, we keep short-lived request counters keyed
              to a one-way hash of your IP address. They expire within 24 hours.
            </li>
            <li>
              <strong>On your device:</strong> your profile preview, optimized resume and (if you shared) the private
              key that lets you unpublish are kept in your browser&apos;s{" "}
              <code className="text-xs bg-surface px-1 py-0.5 rounded">localStorage</code>. Clearing your browser data
              removes them.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">4. Cookies &amp; analytics</h2>
          <p>
            Resu-Dog does not use tracking cookies. We may use privacy-respecting analytics (e.g. Vercel Analytics)
            to understand page-level traffic. No personal data is collected through analytics.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">5. Third-party services</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>OpenAI</strong> — AI processing (no training; up to 30-day abuse-monitoring retention)</li>
            <li><strong>Upstash</strong> — storage for shared profile pages and abuse-prevention counters</li>
            <li><strong>Vercel</strong> — hosting and edge delivery</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">6. Your rights</h2>
          <p>
            You can delete a shared profile yourself with the &ldquo;Unpublish&rdquo; button on your profile page. If
            you&apos;ve lost access to it (for example, you cleared your browser), email us the profile link and
            we&apos;ll remove it. You can also ask us what we hold about you, or to correct or delete it, at the email
            below.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">7. Contact</h2>
          <p>
            Questions about this policy? Email us at{" "}
            <a href="mailto:privacy@resu-dog.com" className="text-primary-ink hover:underline">
              privacy@resu-dog.com
            </a>.
          </p>
        </section>

      </div>

      <div className="mt-12 pt-6 border-t border-line">
        <Link href="/terms" className="text-sm text-primary-ink hover:underline">
          Terms of Service →
        </Link>
      </div>
    </div>
  );
}
