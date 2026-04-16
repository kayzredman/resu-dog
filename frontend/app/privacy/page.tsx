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
      <p className="text-sm text-foreground-muted mb-10">Last updated: April 2026</p>

      <div className="prose prose-sm prose-invert max-w-none space-y-8 text-foreground-soft leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">1. What we collect</h2>
          <p>
            When you use Resu-Dog, we process the resume file and (optionally) job description you provide solely to
            generate your optimized output. We do <strong>not</strong> store your uploaded files, resume text, or job
            descriptions on our servers after the request completes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">2. How we use AI</h2>
          <p>
            Resu-Dog sends your resume and job description to the <strong>OpenAI API</strong> (GPT-4o) to perform
            optimization, scoring, assessment, cover letter generation, and profile extraction. Your data is processed
            in real time and is <strong>not used by OpenAI to train their models</strong> — OpenAI&apos;s API data usage
            policy confirms that API inputs and outputs are not used for model improvement.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">3. Data storage</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Server-side:</strong> No resume data is persisted. Files are processed in memory and discarded
              when the response is sent.
            </li>
            <li>
              <strong>Client-side:</strong> If you create a profile page, your profile data and optimized resume are
              stored in your browser&apos;s <code className="text-xs bg-surface px-1 py-0.5 rounded">localStorage</code>.
              This data never leaves your device unless you choose to share the page.
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
            <li><strong>OpenAI</strong> — AI processing (API, no training)</li>
            <li><strong>Vercel</strong> — Hosting and edge delivery</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">6. Your rights</h2>
          <p>
            Since we don&apos;t store your data server-side, there is nothing to delete. You can clear your locally
            stored profile at any time by clearing your browser&apos;s localStorage. If you have questions, contact
            us at the email below.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">7. Contact</h2>
          <p>
            Questions about this policy? Email us at{" "}
            <a href="mailto:privacy@resu-dog.com" className="text-primary hover:underline">
              privacy@resu-dog.com
            </a>.
          </p>
        </section>

      </div>

      <div className="mt-12 pt-6 border-t border-line">
        <Link href="/terms" className="text-sm text-primary hover:underline">
          Terms of Service →
        </Link>
      </div>
    </div>
  );
}
