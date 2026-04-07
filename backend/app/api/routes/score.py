from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.services.parser import extract_text
from app.services.ai import score_resume
from app.models.schemas import ScoreResult

router = APIRouter()


@router.post("/", response_model=ScoreResult)
async def get_score(
    file: UploadFile = File(...),
    job_description: str = Form(...),
):
    resume_text = await extract_text(file)
    if not resume_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from file")
    return await score_resume(resume_text, job_description)
