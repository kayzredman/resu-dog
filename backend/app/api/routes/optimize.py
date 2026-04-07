from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.services.parser import extract_text
from app.services.ai import score_resume, optimize_resume, generate_cover_letter
from app.models.schemas import FullOptimizeResponse
from app.core.config import settings
import asyncio

router = APIRouter()


@router.post("/", response_model=FullOptimizeResponse)
async def optimize(
    file: UploadFile = File(...),
    job_description: str = Form(...),
):
    # Validate file size
    file_bytes = await file.read()
    if len(file_bytes) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large")
    await file.seek(0)

    # Extract text from uploaded resume
    resume_text = await extract_text(file)

    if not resume_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from file")

    # Run score before, optimize, and score after — parallelize where possible
    score_before, optimize_result = await asyncio.gather(
        score_resume(resume_text, job_description),
        optimize_resume(resume_text, job_description),
    )

    # Score after + cover letter in parallel
    score_after, cover_letter_result = await asyncio.gather(
        score_resume(optimize_result.optimized_resume, job_description),
        generate_cover_letter(resume_text, job_description, optimize_result.optimized_resume),
    )

    return FullOptimizeResponse(
        score_before=score_before,
        score_after=score_after,
        optimized_resume=optimize_result.optimized_resume,
        changes_made=optimize_result.changes_made,
        keywords_added=optimize_result.keywords_added,
        cover_letter=cover_letter_result.cover_letter,
    )
