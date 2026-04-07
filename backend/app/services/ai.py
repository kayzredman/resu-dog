from openai import AsyncOpenAI
from app.core.config import settings
from app.models.schemas import ScoreResult, OptimizeResult, CoverLetterResult
import json

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def score_resume(resume_text: str, job_description: str) -> ScoreResult:
    prompt = f"""
You are an expert ATS resume analyst. Analyze the resume against the job description.

Return ONLY valid JSON with this exact structure:
{{
  "overall_score": <integer 0-100>,
  "keyword_coverage": <integer 0-100>,
  "skills_alignment": <integer 0-100>,
  "formatting_compliance": <integer 0-100>,
  "matched_keywords": [<list of matched keywords>],
  "missing_keywords": [<list of important missing keywords>],
  "summary": "<one sentence summary of the match>"
}}

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}
"""
    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.2,
    )
    data = json.loads(response.choices[0].message.content)
    return ScoreResult(**data)


async def optimize_resume(resume_text: str, job_description: str) -> OptimizeResult:
    prompt = f"""
You are an expert resume writer and ATS optimization specialist.

Your task: Rewrite the resume to maximize ATS compatibility with the job description.

Rules:
- ONLY rewrite existing content. Do NOT fabricate experience, skills, or achievements.
- Rewrite bullet points using strong action verbs.
- Naturally incorporate relevant keywords from the job description.
- Keep all dates, job titles, and company names exactly as they are.
- Remove tables, columns, headers/footers — use clean single-column plain text.
- Format for ATS: clear section headers (EXPERIENCE, EDUCATION, SKILLS, etc.)

Return ONLY valid JSON with this exact structure:
{{
  "optimized_resume": "<full rewritten resume as plain text>",
  "changes_made": [<list of key changes made>],
  "keywords_added": [<list of JD keywords naturally incorporated>]
}}

ORIGINAL RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}
"""
    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.3,
    )
    data = json.loads(response.choices[0].message.content)
    return OptimizeResult(**data)


async def generate_cover_letter(
    resume_text: str, job_description: str, optimized_resume: str
) -> CoverLetterResult:
    prompt = f"""
You are an expert career coach and professional writer.

Write a compelling, personalized cover letter based on the candidate's experience and the job description.

Rules:
- Write in first person, professional but engaging tone.
- Connect specific experiences from the resume to specific requirements in the JD.
- Do NOT use generic filler phrases like "I am a hard worker" or "team player".
- 3-4 paragraphs maximum.
- No "Dear Hiring Manager" — use a strong opening hook instead.
- This is NOT a template. Write it specifically for this role.

Return ONLY valid JSON with this exact structure:
{{
  "cover_letter": "<full cover letter text>",
  "tone": "<professional/confident/enthusiastic>",
  "key_connections": [<list of specific resume-to-JD connections made>]
}}

CANDIDATE RESUME:
{optimized_resume}

JOB DESCRIPTION:
{job_description}
"""
    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.5,
    )
    data = json.loads(response.choices[0].message.content)
    return CoverLetterResult(**data)
