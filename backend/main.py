from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import optimize, score, cover_letter, profile
from app.core.config import settings

app = FastAPI(
    title="Resu-Dog API",
    description="AI-Powered Resume Optimization API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(optimize.router, prefix="/api/v1/optimize", tags=["optimize"])
app.include_router(score.router, prefix="/api/v1/score", tags=["score"])
app.include_router(cover_letter.router, prefix="/api/v1/cover-letter", tags=["cover-letter"])
app.include_router(profile.router, prefix="/api/v1/profile", tags=["profile"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "resu-dog-api"}
