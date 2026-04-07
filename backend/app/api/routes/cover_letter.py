from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.services.parser import extract_text
from app.services.ai import generate_cover_letter
from app.models.schemas import CoverLetterResult

router = APIRouter()


@router.post("/", response_model=CoverLetterResult)
async def get_cover_letter(
    file: UploadFile = File(...),
    job_description: str = Form(...),
    optimized_resume: str = Form(""),
):
    resume_text = await extract_text(file)
    if not resume_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from file")

    base_resume = optimized_resume if optimized_resume.strip() else resume_text
    return await generate_cover_letter(resume_text, job_description, base_resume)
