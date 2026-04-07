# Resu-Dog Backend

FastAPI backend for the Resu-Dog AI Resume Optimization system.

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Fill in your OPENAI_API_KEY
uvicorn main:app --reload --port 8000
```

## API Docs

Visit `http://localhost:8000/docs` for interactive Swagger UI.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/optimize/` | Full pipeline: parse → score before → optimize → score after → cover letter |
| POST | `/api/v1/score/` | Score resume against JD only |
| POST | `/api/v1/cover-letter/` | Generate cover letter only |
| GET  | `/api/v1/profile/{slug}` | Public profile page (Phase 2) |
| GET  | `/health` | Health check |
