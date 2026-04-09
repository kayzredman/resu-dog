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
- `frontend/app/optimize/page.tsx` — optimizer UI; `isPaid=true` for testing; `max-w-screen-xl` grid `[360px_1fr]` when result shown
- `frontend/app/build/page.tsx` — CV builder wizard (4-step); result step is `max-w-screen-xl`
- `frontend/app/p/preview/page.tsx` — public profile page (localStorage-backed); reads `resudog_profile` + `resudog_resume`
- `frontend/components/optimizer/ScoreCard.tsx` — score rings, bars, keyword chips
- `frontend/components/optimizer/ResultsPanel.tsx` — resume viewer, cover letter, PDF download, Create Profile + Export As
- `frontend/components/optimizer/ShortlistAssessment.tsx` — expandable recruiter assessment panel; exports `AssessmentData` type
- `frontend/components/optimizer/GapAnalysis.tsx` — skills heatmap + transferable bridges + gap roadmap (targeted mode only)
- `frontend/components/landing/` — Hero, HowItWorks, Features, Pricing
- `frontend/components/layout/` — Navbar, Footer
- `frontend/.env.local` — OPENAI_API_KEY + NEXT_PUBLIC_API_URL (gitignored — must create on each machine)

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
  skills_heatmap?: { skill: string; status: "matched" | "transferable" | "gap" }[];
  transferable_bridges?: { skill: string; bridge: string }[];
  gap_roadmap?: { skill: string; action: string }[];
}
```

## ProfileData interface (exported from app/p/preview/page.tsx)
```ts
interface ProfileData {
  name: string; title: string; location: string | null; email: string | null;
  linkedin: string | null; summary: string; years_experience: number;
  industries: string[]; skills: string[];
  experience: { title: string; company: string; period: string; bullets: string[] }[];
  education: { degree: string; institution: string; year: string }[];
  certifications: string[];
  ats_score?: number; // injected by ResultsPanel before storing
}
```

## localStorage Keys
- `resudog_profile` — ProfileData JSON (written by ResultsPanel `handleCreateProfile`)
- `resudog_resume` — raw optimized resume text (written alongside profile)

## Export Formats (export/route.ts)
- `linkedin` — Headline + About + Experience sections, copy-paste ready for LinkedIn
- `wes` — Canadian immigration CV: full date ranges, reference contacts, formal headers
- `uk` — UK/EU 2-page CV: Profile Statement, hobbies/interests, "References available on request"

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

## Up Next — Phase 4
- Auth: Supabase (email + Google OAuth)
- Real shareable `/p/[username]` routes (DB-backed, not localStorage)
- Stripe paywall — remove `isPaid={true}` hardcode
- Profile analytics ("X recruiters viewed your page this week")

## Future Modes (post Phase 4)
- ATS-specific optimizer (Workday, Greenhouse, Lever)
- AU / CA CV format variants
