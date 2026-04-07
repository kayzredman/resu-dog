from pydantic import BaseModel
from typing import List, Optional


class ScoreResult(BaseModel):
    overall_score: int
    keyword_coverage: int
    skills_alignment: int
    formatting_compliance: int
    matched_keywords: List[str]
    missing_keywords: List[str]
    summary: str


class OptimizeResult(BaseModel):
    optimized_resume: str
    changes_made: List[str]
    keywords_added: List[str]


class CoverLetterResult(BaseModel):
    cover_letter: str
    tone: str
    key_connections: List[str]


class OptimizeRequest(BaseModel):
    job_description: str


class FullOptimizeResponse(BaseModel):
    score_before: ScoreResult
    score_after: ScoreResult
    optimized_resume: str
    changes_made: List[str]
    keywords_added: List[str]
    cover_letter: str


# Profile page model (Phase 2)
class ProfileSection(BaseModel):
    title: str
    items: List[str]


class PublicProfile(BaseModel):
    slug: str
    name: str
    headline: str
    summary: Optional[str] = None
    experience: List[dict]
    skills: List[str]
    certifications: Optional[List[str]] = []
    education: Optional[List[dict]] = []
    contact_url: Optional[str] = None
    profile_mode: str = "ats"  # ats | linkedin | wes | uk_au_ca
