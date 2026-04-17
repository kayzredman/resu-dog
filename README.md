# Resu-Dog 🐾

**AI-Powered Resume Optimization & Career Intelligence Platform**

> Upload your resume. Paste the job description. Get back an ATS-optimized resume, a recruiter-grade shortlist assessment, a skills gap analysis with a closure roadmap, and a personalized cover letter — in seconds.

---

## Product Vision

Most people lose jobs before a human ever reads their resume. ATS systems filter out 75%+ of applicants automatically. Resu-Dog fixes that — and goes further. We don't sugarcoat. We give candidates a **brutally honest, actionable picture** of where they stand: what's working, what's missing, and exactly how to fix it.

**The ethical line we hold:** We help users present what they have more powerfully. We never fabricate skills, credentials, or experience. Trust is the product.

---

## Core Features

### 1. Resume Upload

- Supported formats: **PDF, DOCX, TXT**
- Drag-and-drop or file picker
- Max file size: 10MB

### 2. Compatibility Score (Before & After)

- **Targeted mode**: Keyword Coverage, Skills Alignment, Formatting Compliance
- **General mode**: Clarity, Action Language, Structure, Completeness
- Independent before/after scoring — never in the same AI call
- After score teased on free tier — visible on paid

### 3. Optimized Resume

- Every bullet follows: **[Action Verb] + [Specific Achievement] + [Measurable Outcome]**
- Weak openers (`Responsible for`, `Helped`, `Assisted`) explicitly banned in prompts
- Keywords from JD naturally incorporated
- ATS-clean formatting — no tables, columns, broken headers
- Downloadable as PDF (paid tier)

### 4. Shortlist Assessment

- Recruiter-perspective verdict: **Low / Fair / Good / Strong** probability of shortlisting
- Strengths (referencing specific resume content)
- Critical gaps vs the JD
- 3 actionable quick wins
- Red flags a recruiter would notice
- Assessment-driven refinement: quick wins + gaps are **automatically applied** back into the resume before final delivery

### 5. Skills Gap Analysis _(targeted mode only)_

- **Skills Heatmap**: pill grid showing every JD skill as 🟢 Matched / 🟡 Transferable / 🔴 Gap
- **Transferable Bridges**: for each amber skill, one honest sentence mapping what they do have
- **Gap Closure Roadmap**: for each red gap, a specific cert / side project / course recommendation
- Collapses to a summary banner: `"12 matched · 3 transferable · 2 gaps"`

### 6. Matching Cover Letter _(targeted mode only)_

- Personalized — not a template
- Connects specific candidate experience to specific role requirements
- Professional "Dear Hiring Manager," salutation + sign-off with candidate's name
- Download/copy (paid tier)

---

## Roadmap

### ✅ Phase 1 — Core Optimizer (shipped)

- Upload CV (PDF / DOCX / TXT) + paste job description
- GPT-4o rewrites the resume for ATS compatibility
- Independent before/after compatibility scores
- Cover letter generated from the optimized resume
- PDF download
- Time-aware theme: auto light (6 AM–6 PM) / dark (6 PM–6 AM) based on local time, manual toggle persists preference
- Next.js Route Handler — no separate backend required

### ✅ Phase 2A — JD-Optional Mode (shipped)

- **Targeted mode**: Upload CV + paste JD → scored against the JD
- **General mode**: Upload CV only → scored on general quality (Clarity, Action Language, Structure, Completeness)
- Mode toggle (pill UI) on optimize page

### ✅ Phase 2B — CV Builder Wizard (shipped, `/build`)

- Paste job description → AI generates targeted questions specific to that role
- User fills multi-step structured form (questions differ per role — not generic)
- AI writes full tailored CV + scores + shortlist assessment
- AI Assist per question ("Help me write this" / "Rewrite with AI")
- Assessment-driven refinement applied before final delivery

### ✅ Phase 2C — Shortlist Assessment + Assessment-Driven Refinement (shipped)

- Recruiter-grade assessment panel after every optimize/build
- `refineWithAssessment()` applies quick wins + critical gaps back into the resume
- Merged `changes_made` list shows both optimize + refinement improvements

### ✅ Phase 2D — Skills Gap Analysis (shipped)

- Skills heatmap (🟢 Matched / 🟡 Transferable / 🔴 Gap) as a scannable pill grid
- Transferable bridges: one honest sentence mapping existing experience to each amber skill
- Gap closure roadmap: specific named certs/courses/projects for each red gap
- Collapsible `GapAnalysis.tsx` card below `ShortlistAssessment`
- Targeted mode only — hidden in general mode (no JD to compare against)

---

### ✅ Phase 3 — Public Profile Page + Shareable Links (shipped)

**Flow:**

1. User completes optimize or build → sees results as normal
2. "Create Profile Page →" button appears in ResultsPanel header
3. One GPT call parses the optimized resume into structured profile JSON
4. Stored in `localStorage` → user redirected to `/p/preview`
5. **"Share Profile" button** publishes to Upstash Redis → generates shareable URL like `/p/a1b2c3d4e5`
6. Public visitors see the full profile with dynamic OG meta tags, Hire Me CTA, Download CV, and "Built with resu-dog.com" footer
7. Shared profiles auto-expire after 90 days

**Page layout (Udemy-inspired, two-column):**

```
Hero: Avatar (initials) · Name · Title · Location · Open to Work badge · ATS score
Main (scrolls): What I bring · Experience timeline · Education · Skills pill grid
Sidebar (sticky): Stats · Hire Me CTA · Share/Copy Link · Download CV · LinkedIn · "Made with resu-dog"
```

**Animations (Framer Motion):**

- Timeline sections fade in on scroll (IntersectionObserver)
- Stats count up on sidebar viewport entry
- Skill pills stagger in
- Smooth hero entrance

**Export As — same optimized content, different formats:**

| Format                   | What changes                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| **ATS PDF** (current)    | Clean plain text, ATS-parsed — 10pt body, 18pt name, neutral grey dividers                      |
| **ATS DOCX**             | Calibri font, 0.75in margins, industry-standard formatting                                      |
| **LinkedIn Profile**     | Splits into Headline, narrative About, Experience, Skills, recommendation request templates     |
| **WES / Immigration CV** | Credential equivalency framing, Canadian format, Month Year date ranges, GPA/honours            |
| **UK / EU CV**           | 2-page norm, UK date format, hobbies only if present (never fabricated), "references available" |

Each format = one extra GPT call with different formatting rules. Architecture: `POST /api/v1/export` with `format` field.

---

### 🚧 Phase 3B — Time-Aware Theme (shipped)

- **Auto theme**: First-time visitors get light or dark based on local time (6 AM–6 PM = light, otherwise dark)
- **Manual override persists**: Once user toggles the theme, their preference is saved in `localStorage` and sticks across visits
- **No geolocation needed**: Uses `new Date().getHours()` which respects the browser's local timezone
- Implementation: `TimeBasedDefault` child component inside `ThemeProvider` checks `localStorage.theme` on mount — only applies time-based default if no manual preference exists

### 🚧 Phase 4 — Auth + Paywall

- Supabase Auth (email + Google OAuth)
- Save optimize/build results per user
- Stripe paywall — remove `isPaid={true}` hardcode, real subscription tier

### � Phase 5 — Platform Expansion Modes

| Mode                                      | Target Market                      |
| ----------------------------------------- | ---------------------------------- |
| North American Resume (ATS)               | Core product — Phase 1 ✅          |
| LinkedIn Profile Optimizer                | 1B+ users, massive TAM             |
| WES / Credential Evaluation               | Immigrants, international students |
| UK / AU / CA CV Format                    | International job seekers          |
| ATS-specific (Workday, Greenhouse, Lever) | Power users, recruiters            |

Each mode is a separate feature/upsell tier. The architecture already supports a `profile_mode` field in the data model.

---

## Monetization Strategy

**Model: Product-Led Growth (freemium → subscription)**

The user experiences the value before being asked to pay. They see their low score and the improved score — then hit the paywall exactly when the pain of _not_ getting the result is highest.

### Free Tier (The Hook)

| Feature                    | Access              |
| -------------------------- | ------------------- |
| Upload resume + paste JD   | ✅ Always free      |
| Compatibility score before | ✅ Visible          |
| Score after optimization   | ⚡ Teased / blurred |
| Optimized resume download  | ❌ Locked           |
| Cover letter               | ❌ Locked           |
| Keyword breakdown detail   | ⚡ Partial          |
| Optimizations per month    | 1–2                 |

### Paid Tier (~$12/month — 3-day free trial)

| Feature                              | Access |
| ------------------------------------ | ------ |
| Full optimized resume (PDF + DOCX)   | ✅     |
| Full cover letter                    | ✅     |
| Complete keyword breakdown           | ✅     |
| Resume history & versions            | ✅     |
| Unlimited optimizations              | ✅     |
| Multiple job applications tracked    | ✅     |
| Public profile page (Phase 2)        | ✅     |
| Profile view analytics               | ✅     |
| Platform modes (LinkedIn, WES, etc.) | ✅     |

### The Conversion Moment

```
User uploads resume → sees score: 42/100
        ↓
System optimizes   → shows score: 87/100
        ↓
"Download your optimized resume" → [Sign up / Upgrade]
```

They have already seen the improvement. The pain of not getting it drives conversion.

> **Subscription note:** Job hunting is not a daily activity, but when someone is actively hunting they apply to 10–30 jobs. A monthly subscription during that window is natural. Subscription beats one-time payment for LTV.

---

## Tech Stack

| Layer             | Technology              | Notes                                          |
| ----------------- | ----------------------- | ---------------------------------------------- |
| Frontend          | Next.js 16 (App Router) | TypeScript, Tailwind CSS v4                    |
| Auth              | Supabase (planned)      | Email + Google OAuth — Phase 4                 |
| AI / LLM          | OpenAI GPT-4o           | JSON mode, called via Next.js Route Handlers   |
| File Parsing      | mammoth + pdf-parse     | PDF, DOCX, TXT — server-side in Route Handlers |
| PDF Output        | jsPDF                   | Client-side dynamic import                     |
| DOCX Output       | docx + file-saver       | Client-side generation                         |
| Profile Storage   | Upstash Redis           | Shareable profile links, 90-day TTL            |
| Scroll Animations | Framer Motion           | Profile page + landing page                    |
| Database          | Supabase (planned)      | Phase 4+                                       |
| Payments          | Stripe (planned)        | Phase 4+                                       |
| Hosting           | Vercel                  | Auto-deploy from GitHub, dev → main            |

---

## Architecture Overview

```
User Input
  ├── Resume (PDF / DOCX / TXT)
  └── Job Description (paste)
          │
          ▼
   Next.js Route Handlers
  ├── mammoth       → DOCX text extraction
  ├── pdf-parse     → PDF text extraction
  └── plain text    → TXT passthrough
          │
          ▼
   AI Processing Layer (OpenAI GPT-4o)          [parallel where possible]
  ├── Score BEFORE optimization
  ├── Rewrite resume (action verbs + JD keywords, no fabrication)
  ├── Score AFTER optimization
  ├── Generate cover letter
  ├── Shortlist assessment
  └── Assessment-driven refinement (quick wins + gaps applied back)
          │
          ▼
   Output Layer
  ├── Score card (before / after)
  ├── Optimized resume (download PDF + DOCX)     — paid
  ├── Cover letter (download / copy)              — paid
  ├── Shortlist assessment + gap analysis
  ├── Export As (LinkedIn / WES / UK)
  └── Shareable profile page (/p/[slug])
          │
          ▼
   Storage Layer
  ├── localStorage   → profile preview + resume text (owner)
  └── Upstash Redis  → published shareable profiles (90-day TTL)
```

### AI Prompt Design Principles

- Scoring and rewriting are **separate LLM calls** (accuracy)
- Structured output via **JSON mode** (reliable reassembly)
- Rewrite prompt explicitly instructs: **only rewrite existing content, never fabricate**
- All three post-parse calls run in **parallel** via `asyncio.gather` (speed)

### ATS Formatting Rules Enforced

- No tables, no columns, no text boxes
- No headers/footers (many ATS parsers skip these entirely)
- Clear section labels: EXPERIENCE, EDUCATION, SKILLS, CERTIFICATIONS
- Standard fonts, no embedded images in resume body

---

## Security & Privacy

- Resumes contain PII — clearly stated in privacy policy: **data is not stored or used for training**
- OpenAI API by default does not train on API call data
- File size limits enforced server-side (10MB max)
- File type validation on both client and server
- Env vars for all secrets — never committed to repo

---

## Project Structure

```
resu-dog/
├── frontend/                        Next.js 16 app
│   └── app/                         App Router
├── backend/
│   ├── main.py                      FastAPI entry point
│   ├── requirements.txt
│   └── app/
│       ├── api/routes/
│       │   ├── optimize.py          Full pipeline (parse → score → rewrite → cover letter)
│       │   ├── score.py             Score only
│       │   ├── cover_letter.py      Cover letter only
│       │   └── profile.py          Phase 2 — public profile page
│       ├── services/
│       │   ├── ai.py               All OpenAI calls
│       │   └── parser.py           File text extraction
│       ├── models/schemas.py        Pydantic models (profile_mode field included)
│       └── core/config.py           Settings / env config
└── .github/workflows/
    ├── ci.yml                       Lint + type check on all pushes
    ├── deploy-preview.yml           dev branch → Vercel preview URL
    └── deploy-production.yml        main branch → Vercel production
```

---

## Branch Strategy

| Branch | Purpose                    | Deploys To         |
| ------ | -------------------------- | ------------------ |
| `dev`  | Active development         | Vercel Preview URL |
| `main` | Stable production releases | Vercel Production  |

**Workflow:** all work on `dev` → PR to `main` → auto-deploy to production.

---

## Local Development

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in NEXT_PUBLIC_API_URL
npm run dev                         # http://localhost:3000
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                # add OPENAI_API_KEY
uvicorn main:app --reload           # http://localhost:8000/docs
```

---

## Deployment Setup Checklist

- [ ] Connect repo to Vercel, set `frontend/` as root directory
- [ ] Add `VERCEL_TOKEN` to GitHub → Settings → Secrets → Actions
- [ ] Deploy backend to Railway or Render
- [ ] Add `OPENAI_API_KEY` to backend environment variables
- [ ] Add `NEXT_PUBLIC_API_URL` (backend URL) to Vercel environment variables
- [ ] Configure Supabase project + add DB connection string
- [ ] Set up Stripe account + add keys to both environments
