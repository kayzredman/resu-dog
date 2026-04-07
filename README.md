# Resu-Dog 🐾

**AI-Powered Resume Optimization System**

> Upload your resume. Paste the job description. Get back an ATS-optimized resume, a compatibility score, and a personalized cover letter — in seconds.

---

## Product Vision

Most people lose jobs before a human ever reads their resume. ATS (Applicant Tracking Systems) filter out 75%+ of applicants automatically. Resu-Dog fixes that — by using AI to rewrite, score, and optimize resumes specifically for each job description.

The tool is designed to be **so obviously valuable on first use** that users convert to paid without friction. The free tier shows the problem (low score). The paid tier solves it (optimized resume + cover letter download).

---

## Core Features

### 1. Resume Upload
- Supported formats: **PDF, DOCX, TXT**
- Drag-and-drop or file picker
- Max file size: 10MB

### 2. Compatibility Score (Before & After)
- Score shown **before** optimization (the hook — user sees how bad it is)
- Score shown **after** optimization (the payoff — user sees the improvement)
- Breakdown across three dimensions:
  - **Keyword Coverage** — how many JD keywords appear in the resume
  - **Skills Alignment** — how well the skills match the role requirements
  - **Formatting Compliance** — whether the resume passes ATS formatting rules
- After score is **blurred/teased on free tier** — visible only on paid

### 3. Optimized Resume
- Experiences rewritten with **strong action verbs**
- **Keywords from the job description** naturally incorporated
- **ATS-clean formatting** — no tables, columns, headers/footers that break parsers
- Downloadable as PDF and DOCX (paid tier)

### 4. Matching Cover Letter
- Personalized — **not a template**
- Connects specific candidate experience to specific role requirements
- Written to complement the optimized resume
- Download/copy (paid tier)

---

## Planned Features (Phase 2+)

### Resume Profile Page
A public shareable landing page for the candidate — inspired by the Udemy course page layout:

| Udemy Element | Resume Equivalent |
|---|---|
| Course title + subtitle | Name, job title, tagline |
| Instructor photo | Profile picture |
| "What you'll learn" checklist | Key skills / what I bring |
| Sticky pricing card (right) | Sticky **"Hire Me / Download CV / Contact"** CTA |
| Course content timeline | Work experience timeline |
| Instructor bio | Personal pitch / about me |
| Reviews section | Recommendations / testimonials |

**URL format:** `resu-dog.com/p/john-doe`

**Why it matters:**
- Candidates share the link when applying — hiring manager lands on a scroll experience instead of opening a PDF
- Dual strategy: ATS gets the clean PDF, humans get the page
- Analytics ("3 recruiters viewed your page this week") = a very sticky paid feature
- Every page has a subtle "Made with Resu-Dog" footer → viral loop

**Scroll effects (Framer Motion):**
- Sticky sidebar CTA
- Fade-in sections on scroll
- Animated experience timeline
- Skill bars / radar chart animating on scroll
- Stats counter (e.g. "5 years" counts up on viewport entry)

> Profile page data is pulled from the optimized resume — users cannot freestyle input, keeping it honest and connected to the core product.

### Platform Optimization Modes
Expand beyond the standard ATS resume into a **career document platform**:

| Mode | Target Market |
|---|---|
| North American Resume (ATS) | Core product — Phase 1 |
| LinkedIn Profile Optimizer | 1B+ users, massive TAM |
| WES / Credential Evaluation | Immigrants, international students |
| UK / AU / CA CV Format | International job seekers |
| ATS-specific (Workday, Greenhouse, Lever) | Power users, recruiters |

Each mode is a separate feature/upsell tier. The architecture already supports a `profile_mode` field in the data model to accommodate this from day one.

---

## Monetization Strategy

**Model: Product-Led Growth (freemium → subscription)**

The user experiences the value before being asked to pay. They see their low score and the improved score — then hit the paywall exactly when the pain of *not* getting the result is highest.

### Free Tier (The Hook)
| Feature | Access |
|---|---|
| Upload resume + paste JD | ✅ Always free |
| Compatibility score before | ✅ Visible |
| Score after optimization | ⚡ Teased / blurred |
| Optimized resume download | ❌ Locked |
| Cover letter | ❌ Locked |
| Keyword breakdown detail | ⚡ Partial |
| Optimizations per month | 1–2 |

### Paid Tier (~$12/month — 3-day free trial)
| Feature | Access |
|---|---|
| Full optimized resume (PDF + DOCX) | ✅ |
| Full cover letter | ✅ |
| Complete keyword breakdown | ✅ |
| Resume history & versions | ✅ |
| Unlimited optimizations | ✅ |
| Multiple job applications tracked | ✅ |
| Public profile page (Phase 2) | ✅ |
| Profile view analytics | ✅ |
| Platform modes (LinkedIn, WES, etc.) | ✅ |

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

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 14 (App Router) | TypeScript, Tailwind CSS |
| Auth | NextAuth.js | Google OAuth — sign up to unlock downloads |
| Backend API | FastAPI (Python 3.12) | Async, parallel AI calls |
| LLM | OpenAI GPT-4o | JSON mode for structured outputs |
| Resume Parsing | pdfplumber + python-docx | PDF, DOCX, TXT support |
| Resume Output | python-docx + WeasyPrint | DOCX and PDF generation |
| Scroll Animations | Framer Motion | Profile page Phase 2 |
| Database | PostgreSQL via Supabase | Free tier to start |
| File Storage | Supabase Storage / S3 | Uploaded resumes, temp outputs |
| Payments | Stripe | Subscription billing |
| Frontend Hosting | Vercel | Auto-deploy from GitHub |
| Backend Hosting | Railway or Render | FastAPI container deployment |

---

## Architecture Overview

```
User Input
  ├── Resume (PDF / DOCX / TXT)
  └── Job Description (paste)
          │
          ▼
   Parsing Layer (FastAPI)
  ├── pdfplumber   → PDF text extraction
  ├── python-docx  → DOCX text extraction
  └── plain text   → TXT passthrough
          │
          ▼
   AI Processing Layer (OpenAI GPT-4o)          [parallel where possible]
  ├── Score BEFORE optimization
  ├── Rewrite resume (action verbs + JD keywords, no fabrication)
  ├── Score AFTER optimization
  └── Generate cover letter
          │
          ▼
   Output Layer
  ├── Score card (before / after)
  ├── Optimized resume (download PDF + DOCX) — paid
  └── Cover letter (download / copy)          — paid
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
├── frontend/                        Next.js 14 app
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

| Branch | Purpose | Deploys To |
|--------|---------|------------|
| `dev`  | Active development | Vercel Preview URL |
| `main` | Stable production releases | Vercel Production |

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
