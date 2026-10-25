# Resu-Dog — Project Audit

_Audited 2026-10-25. Scope: everything in `frontend/` and `backend/`, plus the README._
_Checks run: `npm ci`, `eslint`, `tsc --noEmit`, `next build` (passes), `npm audit --omit=dev`._

Work through these in order. Tick each one off as it ships.

**Progress, 2026-10-25:** P0 and most of P1 are done, plus the mobile quick wins. Lint, typecheck and the production build pass, and `npm audit` reports 0 vulnerabilities.
Not yet tested end to end with a real OpenAI key, or with Upstash (sharing and rate limits are off until the `KV_*` env vars are set).
Priority key: **P0** = trust and legal (blocks a public launch), **P1** = security, abuse and cost, **P2** = product correctness and quality, **P3** = engineering hygiene.

---

## P0 — Authenticity and trust

- [x] **1. The prompts tell the AI to invent metrics, which breaks the core promise.**
  The README and landing page say "we never fabricate". But every writing prompt says that if a metric is missing, the AI should *"infer a reasonable one from context (e.g. ~30%, 5×, $X0K)"*:
  - [optimize/route.ts:66](frontend/app/api/v1/optimize/route.ts:66), [:297](frontend/app/api/v1/optimize/route.ts:297), [:333](frontend/app/api/v1/optimize/route.ts:333)
  - [build/route.ts:119](frontend/app/api/v1/build/route.ts:119), [:265](frontend/app/api/v1/build/route.ts:265)
  - The `assist` prompt ([build/route.ts:334](frontend/app/api/v1/build/route.ts:334)) also asks for "real-sounding examples… with metrics".

  The refine step adds to the pressure: it says "address EVERY critical gap", and a real gap can't be fixed by rewriting. An invented "reduced latency by 40%" is a lie the candidate has to defend in an interview.
  **Fix:** never generate numbers that aren't in the source. Use visible placeholders such as `[X%]` or `[# users]`, highlight them in the UI, and ask the user to fill them in. Only apply quick wins that the source text supports.

- [x] **2. The privacy policy is false.**
  - [privacy/page.tsx:40](frontend/app/privacy/page.tsx:40) says "No resume data is persisted", and [:70](frontend/app/privacy/page.tsx:70) says "there is nothing to delete".
  - In reality, "Share Profile" stores the profile **and the full resume text** in Upstash Redis for 90 days ([profile/publish/route.ts:38](frontend/app/api/v1/profile/publish/route.ts:38)).
  - Upstash isn't listed as a third party.
  - OpenAI keeps API data for up to 30 days for abuse monitoring. "No training" is true, but "discarded when the response is sent" is not.

  This is a GDPR/CCPA problem. **Fix:** rewrite the policy, and add an "Unpublish / delete" action (a slug plus a secret delete token stored in localStorage).

- [x] **3. Public profiles over-expose personal data.**
  - Publishing uploads the full resume text (phone, address and so on), and anyone with the link can download it.
  - There's no consent screen showing what will become public.
  - There's no `noindex`, so search engines can index people's CVs.
  - The links never expire early, and there's no way to unpublish.

  **Fix:** add a preview step with "fields that will be public" toggles, set `robots: noindex` by default (opt in to indexing), and make the CV download opt-in.

- [x] **4. Some marketing claims can't be backed up.**
  - "75% of resumes are rejected by ATS" ([Hero.tsx:38](frontend/components/landing/Hero.tsx:38)) is a widely debunked statistic that traces back to a vendor's marketing.
  - "Built to pass every ATS system" ([Features.tsx:34](frontend/components/landing/Features.tsx:34)) can't be proven.
  - The "ATS score" is GPT-4o's opinion, not something an ATS measured. It's still shown as a `/100` badge on public profiles, where it looks like a credential.

  **Fix:** remove or source the statistic. Rename the score to something like "Job-match score", explain how it's computed, and drop it from public profiles (or label it clearly).

- [x] **5. The scores don't describe the resume the user receives.**
  - `score_after` is calculated on the resume *before* the refine step, but the user is shown the *refined* resume ([optimize/route.ts:515](frontend/app/api/v1/optimize/route.ts:515) vs [:535](frontend/app/api/v1/optimize/route.ts:535)).
  - In `/build`, the score is a *prediction* made from the answers before the CV is written ([build/route.ts:147](frontend/app/api/v1/build/route.ts:147)).
  - The same model writes the resume and grades it, so the "after" score is biased upward and changes from run to run.

  **Fix:** score the final text. Calculate keyword coverage in plain code (deterministic, so it can be explained) and use the AI only for the qualitative parts.

## P1 — Security, abuse and cost

- [x] **6. There's no rate limiting or auth on any AI route.**
  One `/optimize` request runs 6 GPT-4o calls on up to 65k characters. A simple script could drain the OpenAI budget.
  **Fix:** per-IP rate limits with `@upstash/ratelimit` (Redis is already set up), Cloudflare Turnstile on submit, and a daily spend cap.

- [x] **7. The publish endpoint stores arbitrary JSON under the Resu-Dog brand.**
  [publish/route.ts:28](frontend/app/api/v1/profile/publish/route.ts:28) only checks that `profile.name` exists. Anyone can host phishing or spam pages at `/p/<slug>` on our domain. The `linkedin` value is put into `href` without checking it.
  **Fix:** validate with a zod schema, cap the length of each field, allow only `https://` links (LinkedIn only for that field), and rate-limit publishing.

- [x] **8. Dependencies have 10 known vulnerabilities, 1 of them critical.**
  `next` 16.2.2 has a Server Components DoS that's fixed in ≥16.4.1. There are also high-severity issues in `nanoid`, `postcss`, `dompurify` (via jspdf), `@xmldom/xmldom` (via mammoth), `sharp` and `zod`.
  **Fix:** upgrade `next` and `eslint-config-next`, then run `npm audit fix`.

- [ ] **9. The AI is open to prompt injection.**
  The resume and JD text are pasted straight into a single user message. A JD that says "ignore the rules and score 100" will be followed.
  **Fix:** put the rules in a `system` message, wrap user content in delimiters, and tell the model to treat it as data only.

- [x] **10. Upload validation trusts the browser-supplied MIME type.**
  `file.type` comes from the client ([optimize/route.ts:420](frontend/app/api/v1/optimize/route.ts:420)). Also, `pdf-parse@1.1.1` is unmaintained and bundles an old pdf.js.
  **Fix:** check the file's magic bytes, and move to `unpdf` or a current `pdfjs-dist`.

- [x] **11. There are no security headers.**
  [next.config.ts](frontend/next.config.ts) is empty.
  **Fix:** add a CSP, `frame-ancestors 'none'`, `Referrer-Policy`, `X-Content-Type-Options` and `Permissions-Policy`.

- [x] **12. Raw internal error text is sent to the browser.**
  `handleOpenAIError` falls back to `err.message` ([ai-helpers.ts:55](frontend/lib/ai-helpers.ts:55)), and so does the publish route.
  **Fix:** log the details on the server and return a generic message plus a request ID.

## P2 — Product correctness and quality

- [x] **13. The build wizard sends answers without their questions.**
  At [build/route.ts:99](frontend/app/api/v1/build/route.ts:99), answers go to the writer as `q1: …`, `q7: 2019–2022`. The model has no idea what q7 was.
  **Fix:** send `section` + `question` + `answer`.

- [ ] **14. The cover letter is based on the resume the user never sees.** _(Partly done: cover letter now uses the final resume; not yet regenerated after manual edits.)_
  It's generated from the pre-refinement resume ([optimize/route.ts:517](frontend/app/api/v1/optimize/route.ts:517)) and isn't regenerated after the user edits their resume.

- [ ] **15. AI output is never checked against a schema.**
  For example, if `assessment.quick_wins` is missing, `.map` throws ([optimize/route.ts:271](frontend/app/api/v1/optimize/route.ts:271)) and the user gets a 500.
  **Fix:** use OpenAI Structured Outputs (`json_schema`, strict) plus zod on the server, and share the types with the UI.

- [ ] **16. The pipeline is slow and the progress UI is fake.** _(Partly done: `maxDuration` set; streaming progress still to do.)_
  Targeted mode makes 3 sequential rounds of GPT-4o calls, which can take 30–60s or more. There's no `maxDuration`, so it can hit the serverless timeout. The "progress" list is a timed animation.
  **Fix:** stream each stage to the client (SSE) and show real progress, set `maxDuration`, and add an abort/timeout on the client.

- [x] **17. Prompts and model choice are copy-pasted across routes.** _(Done 2026-10-25: every AI call goes through `lib/ai-helpers.ts` → `generateJSON()`. The provider is switched with `AI_PROVIDER` (gemini | openai) and the model with `AI_MODEL`. The prompts themselves are still per route.)_
  `"gpt-4o"` is hard-coded in about 14 places. The assessment and refine prompts are duplicated between `optimize` and `build`.
  **Fix:** move them into one `lib/ai/` module (prompts, model from env, a single call helper), and re-evaluate the model choice.

- [ ] **18. PDF and DOCX output is fragile.**
  - The text is re-parsed with heuristics: name detection, ALL-CAPS headers, and a dash to spot role lines.
  - The jsPDF built-in Helvetica can't render non-Latin-1 characters (ɛ, ɔ, ŋ, many non-Latin names).
  - [pdf.ts](frontend/lib/pdf.ts) and [docx.ts](frontend/lib/docx.ts) duplicate the parsing.

  **Fix:** have the AI return a structured resume (JSON) once, and render PDF, DOCX and the profile from that. Embed a Unicode font.

- [ ] **19. The paywall is for show.** _(Partly done: labelled "Free during beta"; the dead upgrade button is gone.)_
  - `isPaid={true}` is hard-coded.
  - The "Upgrade to Pro — $12/mo" button ([ResultsPanel.tsx:57](frontend/components/optimizer/ResultsPanel.tsx:57)) does nothing.
  - The pricing page's "Start 3-day free trial" just links to `/optimize`.

  Until Stripe is live, label it honestly ("Free during beta") or hide the pricing.

- [ ] **20. The public profile shows things that may not be true.** _(Partly done: "Open to Work" is now honest; profile editing still to do.)_
  - "Open to Work" always appears publicly, whatever the toggle says ([ProfileView.tsx:238](frontend/components/profile/ProfileView.tsx:238)), and the toggle isn't saved.
  - The profile can't be edited before publishing.
  - The summary may have been "inferred" by the AI.

- [ ] **21. The build wizard loses everything on refresh.**
  **Fix:** keep the draft in `sessionStorage`.

- [ ] **22. The LinkedIn export throws away its structured output.**
  The headline, skills and recommendation-request templates are generated, but only `formatted` is shown.

## P3 — Engineering hygiene

- [ ] **23. There's no git repo and no CI.** The README describes `.github/workflows` and a `dev`/`main` branch flow that don't exist.
- [ ] **24. The FastAPI `backend/` is a stale fork.** It has no general mode, `/build`, `/export` or assessment. Setting `NEXT_PUBLIC_API_URL` would break the app. Decide whether to delete it or adopt it; right now it's misleading.
- [ ] **25. There are no tests.** Start with the API routes (mock OpenAI) and the resume-to-PDF/DOCX parsers.
- [ ] **26. Lint:** there's 1 error ([ThemeToggle.tsx:24](frontend/components/ui/ThemeToggle.tsx:24), setState inside an effect), the `formatBytes` function is unused, and the dead `_mockResponse` should go ([optimize/route.ts:553](frontend/app/api/v1/optimize/route.ts:553)). _(Partly done: lint is clean and dead helpers are removed; `_mockResponse` is still there.)_
- [ ] **27. The theme flashes.** It defaults to dark and then switches to light after hydration in the daytime. It also ignores the OS `prefers-color-scheme`. _(Partly done: now follows the device setting with no flash; time-based is an optional mode.)_
- [ ] **28. There's no observability.** No error tracking, product analytics, or per-request token/cost logging.
- [ ] **29. Domains are inconsistent.** `metadataBase` uses `resume-dog.vercel.app`, the backend CORS uses `resu-dog.vercel.app`, and the UI says `resu-dog.com`.
- [ ] **30. The README is out of date.** It names the wrong env file (`.env.local.example`), says the AI calls use `asyncio.gather` (they're TS `Promise.all`), and describes the old backend as the main architecture.
- [ ] **31. Accessibility hasn't been fully audited.** Quick spots: the mode toggle has no `aria-pressed`, and errors have no `role="alert"`.

## Design and mobile (iOS + Android)

_Checked in the browser at 375×812 (phone) and desktop, against Apple's Human Interface Guidelines, Android's Material guidelines and WCAG AA. The results and profile screens were reviewed from the code only, because they need an OpenAI key to render._

- [x] **D1. Colour contrast fails WCAG AA (4.5:1) in key places.**
  | Pair | Ratio |
  | --- | --- |
  | White text on `--primary` #6c63ff (every main button) | 4.32 |
  | Primary text on the light background | 4.07 |
  | Light-mode accent #00b894 on white | 2.54 |
  | Light-mode success #16a34a on white (the green pills) | 3.30 |
  | `--foreground-dim` (helper text, placeholders), dark mode | 2.33 |
  | `--foreground-dim`, light mode | 3.20 |

  **Fix:** use `--primary-dark` #5a52e0 for button fills, darken the light-mode accent and success colours, and keep "dim" for decoration only, never for text.

- [x] **D2. Many tap targets are smaller than 44pt (iOS) / 48dp (Android).**
  - The menu button is 20×20px. My own test tap missed it.
  - The theme toggle is 36×36px.
  - Footer links and the GitHub icon are 18–20px tall, and mobile menu links use `py-1`.

  **Fix:** make every tappable element at least 44×44.

- [x] **D3. iPhones zoom in when you tap a text box.**
  The textareas use 14px text, and iOS Safari auto-zooms any field under 16px. **Fix:** use `text-base` (16px) on inputs at phone widths.

- [ ] **D4. The Optimize flow is awkward on a phone.** _(Partly done: results auto-scroll on phones and the placeholder is hidden; a sticky action bar is still to do.)_
  - A full-screen "your results will appear here" placeholder sits under the form.
  - After you tap Optimize, nothing scrolls to the results.
  - Once a JD is pasted, the submit button is pushed off-screen.

  **Fix:** hide the placeholder on mobile, scroll to the results when they arrive, and use a sticky bottom action bar padded for the safe area.

- [x] **D5. The mode toggle breaks at phone width.**
  "General Improvement" wraps onto two lines and its icon ends up outside the pill. **Fix:** use shorter labels ("For a job" / "General") or stack the options.

- [x] **D6. Content stays invisible until a scroll animation runs.**
  Landing sections start at `opacity: 0` (`whileInView`). In testing, Features, How it works and Pricing showed blank screens until the animation caught up. Nothing respects `prefers-reduced-motion`.
  **Fix:** wrap the app in `<MotionConfig reducedMotion="user">`, animate only position or scale, and never hide content behind an animation.

- [x] **D7. Safe areas and the browser bar aren't handled.**
  There's no `viewport-fit=cover`, no `env(safe-area-inset-*)` padding (needed for the iPhone notch and home indicator, and Android's gesture bar), and no `theme-color`, so the browser bar on both platforms doesn't match the app.
  **Fix:** add these through Next's `export const viewport`.

- [x] **D8. The theme ignores the phone's dark-mode setting.**
  With the phone set to dark, the site still rendered light because of the time-of-day rule. People on phones expect the app to follow their system setting. The clock icon for "auto" is also unclear.
  **Fix:** default to `system`, and keep the time-based option as a choice.

- [ ] **D9. The design system has drifted.** _(Partly done: hard-coded colours replaced with tokens; some 10–11px text remains.)_
  - There are about 160 hard-coded hex colours: `#ef4444` ×35, `#22c55e` ×35, `#6c63ff` ×28 and more. They skip the theme tokens, so light/dark changes don't reach them.
  - There are 16 uses of 10–11px text, which is too small on phones.

  **Fix:** use tokens only. Set a minimum of 12px for labels and 16px for body text on mobile.

- [ ] **D10. Focus and hover states are incomplete.** _(Partly done: global focus ring added; hover-only affordances not yet reviewed.)_
  Buttons have no `focus-visible` ring, which iPad keyboards, Android keyboards and switch control rely on. Some affordances only appear on hover, and touch screens have no hover.

- [ ] **D11. The results panel is crowded on phones (from the code).**
  - Up to 6 buttons share one wrapping row: Create Profile, Export As, Copy, Edit, DOCX and PDF.
  - The resume is shown as 12px monospace inside a `max-h-80` box that scrolls inside the page, and nested scrolling is clumsy on touch.

  **Fix:** one primary action plus a "More" bottom sheet, and a full-screen reading view for the resume.

- [ ] **D12. The build wizard's step indicator has icons only.**
  The 4 icons have no labels, and "1/4" is tiny. **Fix:** show the current step's name.

- [ ] **D13. The brand is generic.**
  The indigo glow, the "Powered by GPT-4o" badge and the gradients read like a stock AI-SaaS template, and the dog name has no visual personality. On phones the hero is text only, because the score-card mockup is hidden below `lg`.
  **Fix:** a distinctive palette and mascot, a product visual on mobile, and a trust message in place of the GPT badge.

- [ ] **D14. Not yet verified.** The results and profile screens on real devices (they need `OPENAI_API_KEY` in `frontend/.env.local`), and real iOS Safari and Android Chrome. Test on your own phones, or use BrowserStack.

---

## Suggested order

1. **#1** No made-up metrics. This is the product's integrity.
2. **#2 + #3** Honest privacy, and unpublish/consent for profiles.
3. **#6 + #7 + #8** Rate limits, publish validation, and dependency upgrades, before any traffic.
4. **#4 + #5** Honest scoring and claims.
5. **D1–D3, D5, D6** Mobile quick wins: contrast, tap targets, iOS zoom, the toggle, hidden content. These are small changes with a big impact.
6. **#13 → #17** Correctness and pipeline robustness.
7. **D4, D7, D8, D11** A mobile-first pass on the Optimize and results flows.
8. **#23 + #24** Git, CI, and a decision on the backend. These can run alongside the rest.
9. Everything else, with **D13** (brand) as its own design project.

---

## Flow QA — 2026-10-25 (all flows, phone app + API)

| Flow | Finding | Status |
| --- | --- | --- |
| **Just polish** | Results said "Good fit on paper", "Gaps against the job" and "Address a likely gap", which is job-matching language with no job. | **Fixed:** the verdict is now Ready to send / Nearly ready / Needs some work / Needs a lot of work, plus "What's holding it back" and "Fix the main weak spot". |
| Just polish | "How is this scored?" explained keyword matching against a job description. | **Fixed:** there's now a polish-specific explanation (no keyword matching; four quality checks; the overall score is their average; switch to "For a job" for a match score). |
| Just polish | The intro line said "show you where you match". | **Fixed:** it now says "clearer and stronger — no job needed". |
| Just polish | If a job description was sent anyway, the server ignores it. Verified: no cover letter, no skills chips, no keyword list, title "Your review". | OK, verified |
| **For a job** | The server accepted a job description of only spaces, or a few words. | **Fixed:** the server trims it and needs ≥50 characters, with a message pointing to Just polish. |
| For a job | An error left over from the other mode stayed on screen after switching. | **Fixed:** switching modes clears it. |
| For a job | "See the suggested plan below" appeared even when there was no plan. | **Fixed:** shown only when a plan exists. |
| **Build CV** | "Get my questions" silently wiped answers already typed. | **Fixed:** it asks for confirmation first, showing how many answers would be lost. |
| Build CV | The server accepted an empty or very short job description. | **Fixed:** same 50-character rule. |
| **All** | The scoring sheet cut its paragraphs off with "…" at half height. | **Fixed:** the sheet scrolls. |
| All | Unknown mode is rejected (400); the oversized and spoofed file checks still hold. | OK, verified |
| All | On the simulator, the first tap after a pause often doesn't register (it happens in Apple's own Files picker too). | Simulator quirk; **check on a real phone** |

**Not yet tested:**
- real AI output in each mode (needs an OpenAI key)
- Android
- the web app's Build CV result (it still uses job-mode wording, which is correct there because Build always has a job)

---

## Real-AI QA — 2026-10-25 (Gemini free tier, sample resumes only)

**What we found the first time the real AI ran:**
- **For a job:** it invented integrations (MTN Mobile Money, Paystack), a "Projects & Certifications" section and Kubernetes/GitHub Actions skills to cover the job's gaps. The score then counted those fake skills.
- **Build CV:** it invented "code reviews and mentoring" and a GitHub Actions project.
- **Just polish:** it invented a LinkedIn URL, padded the bullets, and got the years of experience wrong.

**What changed:**

| Fix | Where |
| --- | --- |
| The rewrite step is no longer told to "address the critical gaps" (that was the trigger for the inventions); gaps stay in the review | optimize and build routes |
| Stricter rules: no new contacts or links, no new details or sections, no totals for years of experience | `lib/prompt-rules.ts` |
| Any link, email or phone number not in the original is removed in code | `stripInventedContacts` |
| Word-level claim check: names, tools and job skills not in the original → the AI is asked once to remove them → whatever remains is deleted in code | `lib/claim-guard.ts` |
| Fact-check pass: a separate AI call corrects any line the original doesn't support (including changed titles, employers or dates), keeping the true part | `verifyClaims` |
| Lines that are only a placeholder (e.g. "[List certifications here]") are removed | `claim-guard` |
| Reviewers and scorers no longer mark the resume down for the intentional `[X%]` blanks | `PLACEHOLDER_NOTE` |
| Retries, a 60-second limit per call, and a fallback model; time limits raised (server 300s, app 280s) | `lib/ai-helpers.ts` |

**Result on the final run:** no invented tools, integrations, sections, titles or contacts. Outcomes are either real or a `[X%]` blank, and the cover letter honestly acknowledges the gaps.

**Known limits:**
- Small embellishments can still slip through occasionally (e.g. "guiding them in best practices").
- On the free tier, runs take about 45–90 seconds and sometimes fall back to a "lite" model.
- Re-test with a paid or stronger model before launch.

## Pro features — 2026-10-25 (beta: free for everyone)

International formats (LinkedIn, Canada/WES, UK) and the shareable profile are now in the phone app, behind one Pro switch.

**The switch**
- Server: `PRO_FEATURES_UNLOCKED` (default on). Set it to `false` once payments are live, and `/api/v1/export`, `/api/v1/profile` and publishing return `402 pro_required`. Taking a profile down is never gated.
- App: `EXPO_PUBLIC_PRO_UNLOCKED` (default on) and `usePro()` in `mobile/src/lib/entitlements.ts`. The purchase check plugs in there (marked `TODO(payments)`). When locked, the screens show a "part of Pro" card instead.

**What was checked (fictional sample resumes)**
- [x] WES and LinkedIn exports run through the honesty checks; reformatting no longer adds new `[X%]` blanks, and the LinkedIn About gets the same check as the CV.
- [x] Profile: build → preview → choose what to share → publish → public page → take down (link then returns 404). Email stays hidden unless chosen; turning on CV download says the CV includes contact details.
- [x] A Profile tab (beside Optimize, Build CV and About) is the profile’s home: it uses the latest resume from this session, and shows the live profile to share or take down. One live profile per phone.
- [x] Local dev works without Upstash: profiles use an in-memory store (lost on restart). Production still needs `KV_REST_API_URL` / `KV_REST_API_TOKEN`.

**Also fixed**
- [x] Just polish: the review was written on the draft before the final rewrite, so it could mention `[result]` blanks the final resume no longer had. That advice is now dropped when no blanks remain.

**Still to do before launch**
- [ ] Payments: subscription check in `usePro()` and `requirePro()`.
- [ ] Upstash Redis in production, so profiles persist.
- [ ] Privacy policy and the app's About still name OpenAI; update them for the provider chosen at launch.
- [ ] Profile "blog"/story section: the profile summary is the write-up for now.
