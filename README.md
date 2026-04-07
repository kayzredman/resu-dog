# Resu-Dog 🐾

AI-Powered Resume Optimization System

## What It Does

Upload your resume + paste a job description. Resu-Dog returns:
- **Compatibility score** — before and after optimization
- **Optimized resume** — rewritten with strong action verbs and ATS-friendly keywords
- **Matching cover letter** — personalized, not templated

## Project Structure

```
resu-dog/
├── frontend/          # Next.js 14 (TypeScript + Tailwind)
├── backend/           # FastAPI (Python)
├── .github/workflows/ # CI/CD via GitHub Actions → Vercel
└── .gitignore
```

## Branches

| Branch | Purpose |
|--------|---------|
| `dev`  | Active development — deploys to Vercel preview |
| `main` | Production — deploys to Vercel production |

## Local Development

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev          # http://localhost:3000
```

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # Add your OPENAI_API_KEY
uvicorn main:app --reload  # http://localhost:8000
```

## Deployment

- **Frontend** → Vercel (auto-deploys via GitHub Actions)
- **Backend** → Railway or Render (manual setup, see backend/README.md)
