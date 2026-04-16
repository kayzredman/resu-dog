# resu-dog — Copilot Context

> **For GitHub Copilot:** Read this file at the start of any session on a new machine to get full project context. This is the canonical source of truth for stack, architecture, and progress.

## Repo

- GitHub: https://github.com/kayzredman/resu-dog.git
- Branches: `dev` (Vercel preview) → `main` (Vercel production)
- Owner: kayzredman

## Stack

- **Frontend**: Next.js 16.2.2, App Router, TypeScript, Tailwind CSS v4, Framer Motion, next-themes
- **AI**: OpenAI GPT-4o, JSON mode, called via Next.js Route Handlers (no separate backend in use)
- **File parsing**: mammoth (DOCX), pdf-parse@1.1.1 (PDF), TXT native
- **PDF generation**: jsPDF@4.x, dynamic import client-side
- **DOCX generation**: docx + file-saver
- **Shareable profiles**: Upstash Redis (@upstash/redis), nanoid for slug generation
- **Backend scaffold**: FastAPI (Python) exists at `backend/` but no Python on dev machine — not running

## Theme

- CSS variable token system: `:root` (dark) + `.light` class (light), registered via `@theme inline`
- `next-themes` with `attribute="class"`, `defaultTheme="dark"`
- ThemeToggle in Navbar (Sun/Moon, hydration-safe)
- Tokens: `bg-background`, `bg-surface`, `bg-section`, `border-line`, `border-line-strong`, `border-line-hover`, `text-foreground`, `text-foreground-soft`, `text-foreground-muted`, `text-foreground-dim`, `text-foreground-disabled`, `bg-primary`, `bg-primary-dark`, `text-primary`, `text-accent`, `text-success`, `text-warning`, `text-danger`

## Key Files

- `frontend/app/api/v1/optimize/route.ts` — full AI pipeline (targeted + general modes)
- `frontend/app/api/v1/build/route.ts` — CV builder pipeline (analyze / write / assist actions)
- `frontend/app/api/v1/profile/route.ts` — `POST { resume }` → GPT-4o (temp 0.1) → ProfileData JSON
- `frontend/app/api/v1/export/route.ts` — `POST { resume, format }` → formatted text; formats: linkedin / wes / uk
- `frontend/app/api/v1/profile/publish/route.ts` — `POST { profile, resume }` → saves to Upstash Redis, returns `{ slug, url }`
- `frontend/app/optimize/page.tsx` — optimizer UI; `isPaid=true` for testing; `max-w-screen-xl` grid `[360px_1fr]` when result shown
- `frontend/app/build/page.tsx` — CV builder wizard (4-step); result step is `max-w-screen-xl`
- `frontend/app/p/preview/page.tsx` — owner's profile preview (localStorage-backed); uses shared `ProfileView` component + Share button
- `frontend/app/p/[slug]/page.tsx` — public shareable profile page (server component, fetches from Redis, dynamic OG tags)
- `frontend/components/profile/ProfileView.tsx` — shared profile rendering component (used by both preview and public pages)
- `frontend/lib/redis.ts` — Upstash Redis singleton client
- `frontend/lib/pdf.ts` — shared PDF generation (jsPDF)
- `frontend/lib/docx.ts` — shared DOCX generation
- `frontend/components/optimizer/ScoreCard.tsx` — score rings, bars, keyword chips
- `frontend/components/optimizer/ResultsPanel.tsx` — resume viewer, cover letter, PDF download, Create Profile + Export As
- `frontend/components/optimizer/ShortlistAssessment.tsx` — expandable recruiter assessment panel; exports `AssessmentData` type
- `frontend/components/optimizer/GapAnalysis.tsx` — skills heatmap + transferable bridges + gap roadmap (targeted mode only)
- `frontend/components/landing/` — Hero, HowItWorks, Features, Pricing
- `frontend/components/layout/` — Navbar, Footer
- `frontend/.env.local` — OPENAI_API_KEY + NEXT_PUBLIC_API_URL + KV_REST_API_URL + KV_REST_API_TOKEN (gitignored — must create on each machine)

## Known Gotchas

- `pdf-parse@1.1.1` must use `require("pdf-parse/lib/pdf-parse")` — top-level import triggers a self-test looking for `test/data/05-versions-space.pdf`
- Lucide React v1 has **NO brand icons** — LinkedIn / GitHub / X use inline SVGs everywhere
- Tailwind v4 uses `@theme inline` (not `extend.colors`) for custom token registration
- `isPaid={true}` is hardcoded in optimize/page.tsx and build/page.tsx for development — Phase 4 will gate this properly

## AI Pipeline (3 steps)

- Step 1: `Promise.all([scoreBefore, optimize])`
- Step 2: `Promise.all([scoreAfter, coverLetter, assess])`
- Step 3: `refineWithAssessment(resume, assessment, jd)` → final refined resume

## AI Prompt Rules (enforced in all writing prompts)

- Every bullet: `[Action Verb] + [Specific Achievement] + [Measurable Outcome]`
- Banned openers: `Responsible for`, `Helped`, `Assisted`, `Worked on`, `Involved in`, `Participated in`
- Bullet length: 15–22 words, one tight sentence
- Metric inference: if no exact figure exists, infer a credible one from context
- Never fabricate experience, dates, companies, or qualifications
- Scoring: never penalise for not naming the company; no cover letter/network criteria

## AssessmentData type (exported from ShortlistAssessment.tsx)

```ts
interface AssessmentData {
  shortlist_probability: "Low" | "Fair" | "Good" | "Strong";
  probability_rationale: string;
  strengths: string[];
  critical_gaps: string[];
  quick_wins: string[];
  red_flags: string[];
  // Gap Analysis — targeted mode only
  skills_heatmap?: {
    skill: string;
    status: "matched" | "transferable" | "gap";
  }[];
  transferable_bridges?: { skill: string; bridge: string }[];
  gap_roadmap?: { skill: string; action: string }[];
}
```

## ProfileData interface (exported from components/profile/ProfileView.tsx)

```ts
interface ProfileData {
  name: string;
  title: string;
  location: string | null;
  email: string | null;
  linkedin: string | null;
  summary: string;
  years_experience: number;
  industries: string[];
  skills: string[];
  experience: {
    title: string;
    company: string;
    period: string;
    bullets: string[];
  }[];
  education: { degree: string; institution: string; year: string }[];
  certifications: string[];
  ats_score?: number; // injected by ResultsPanel before storing
}
```

## localStorage Keys

- `resudog_profile` — ProfileData JSON (written by ResultsPanel `handleCreateProfile`)
- `resudog_resume` — raw optimized resume text (written alongside profile)

## Shareable Profiles

- **Publish flow**: Preview page → "Share Profile" button → `POST /api/v1/profile/publish` → stores in Upstash Redis with nanoid slug (10 chars) → returns URL like `/p/a1b2c3d4e5`
- **Public page**: `/p/[slug]` — server component, fetches from Redis, renders `ProfileView` with `isPublic` flag
- **TTL**: 90 days — profiles auto-expire
- **OG tags**: Dynamic per-profile (`generateMetadata` in page.tsx) — name, title, summary
- **Storage**: JSON blob with `profile` + `resume` + `createdAt`, keyed as `profile:{slug}`

## Export Formats (export/route.ts)

- `linkedin` — Headline + narrative About + Experience sections + recommendation request templates, copy-paste ready for LinkedIn
- `wes` — Canadian immigration CV: full date ranges (Month Year – Month Year), GPA/honours, reference contacts, formal headers
- `uk` — UK/EU 2-page CV: Profile Statement, UK date format (DD Month YYYY), hobbies only if present (never fabricated), "References available on request"

## ResultsPanel — key behaviours

- `Create Profile Page` button: calls `/api/v1/profile`, injects `ats_score`, stores to localStorage, opens `/p/preview` in **new tab** (`window.open`)
- `Export As` dropdown: calls `/api/v1/export`, shows result panel below resume with Copy + dismiss ✕
- Props: `optimizedResume`, `coverLetter`, `changes`, `assessment?`, `isPaid`, `hideCoverLetter?`, `atsScore?`

## Shipped Features

- ✅ Phase 1: Core optimizer (upload → score → optimize → cover letter → PDF)
- ✅ Phase 2A: JD-optional mode (targeted / general toggle)
- ✅ Phase 2B: CV Builder wizard (/build) with AI Assist per question
- ✅ Phase 2C: Shortlist Assessment panel + assessment-driven refinement
- ✅ Phase 2D: Skills Gap Analysis — heatmap + transferable bridges + gap roadmap
- ✅ Phase 3: Public Profile Page (/p/preview) + Export As (LinkedIn/WES/UK) + Create Profile button in ResultsPanel

## Build Plan

### Phase A — Build Features (dev, `isPaid={true}` still hardcoded)

| #   | Build                                                                                                         | Status |
| --- | ------------------------------------------------------------------------------------------------------------- | ------ |
| A1  | Error handling + JSON safety — toasts, try/catch JSON.parse, OpenAI error codes (429/quota/key)               | ✅     |
| A2  | Input validation — server-side file size (10MB), resume/JD text length caps, file type enforcement            | ✅     |
| A3  | Profile page polish — PDF download (not .txt), "Open to Work" toggle, OG meta tags                            | ✅     |
| A4  | DOCX export — add DOCX generation alongside PDF download                                                      | ✅     |
| A5  | Landing page accuracy — remove "Phase 2" tags, fix export dropdown click-outside, mobile ResultsPanel buttons | ✅     |
| A6  | Privacy + Terms pages — real content, data handling, OpenAI disclosure, no-training policy                    | ✅     |
| A7  | Footer links — wire or remove social links, verify GitHub link                                                | ✅     |
| A8  | `.env.example` — document required env vars                                                                   | ✅     |

All A-items are independent — no blockers between them.

### Phase B — Go-Live Prep (launch gate, after Phase A)

| #   | Build                                                                                          | Deps  | Status     |
| --- | ---------------------------------------------------------------------------------------------- | ----- | ---------- |
| B1  | Supabase Auth — email + Google OAuth, login/signup, session, `useUser()`                       | —     | ⬜         |
| B2  | `isPaid` wiring — real subscription check, `LockedOverlay` → checkout, free tier limits        | B1    | ⬜         |
| B3  | Stripe integration — checkout, webhooks, subscription status in Supabase                       | B1+B2 | ⬜         |
| B4  | Rate limiting — by user ID or IP, free: 2/day, paid: unlimited                                 | B1    | ⬜         |
| B5  | Profile persistence — ✅ Upstash Redis shareable URLs (`/p/[slug]`), view counter still needed | B1    | 🔨 partial |
| B6  | Security hardening — rotate API key, CORS prod-only, Vercel env vars, API protection           | B1+B3 | ⬜         |
| B7  | Production infra — custom domain, Sentry, analytics                                            | B6    | ⬜         |
| B8  | Launch checklist — merge dev→main, CI green, smoke test, Stripe live mode                      | B1-B7 | ⬜         |

Critical path: B1 → B2 → B3 → B6 → B7 → B8. B4 and B5 parallel with B2-B3.

## Future Modes (post-launch)

- ATS-specific optimizer (Workday, Greenhouse, Lever)
- AU / CA CV format variants
- Profile analytics ("X recruiters viewed your page this week")
