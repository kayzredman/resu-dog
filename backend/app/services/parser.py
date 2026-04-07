import pdfplumber
import docx
from fastapi import UploadFile, HTTPException
import io


ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
}


async def extract_text(file: UploadFile) -> str:
    content_type = file.content_type
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: PDF, DOCX, TXT",
        )

    file_bytes = await file.read()

    if ALLOWED_TYPES[content_type] == "pdf":
        return _extract_from_pdf(file_bytes)
    elif ALLOWED_TYPES[content_type] == "docx":
        return _extract_from_docx(file_bytes)
    else:
        return file_bytes.decode("utf-8", errors="ignore")


def _extract_from_pdf(file_bytes: bytes) -> str:
    text_parts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts)


def _extract_from_docx(file_bytes: bytes) -> str:
    doc = docx.Document(io.BytesIO(file_bytes))
    return "\n".join(para.text for para in doc.paragraphs if para.text.strip())
