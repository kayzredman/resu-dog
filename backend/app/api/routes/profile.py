# Phase 2: Public profile page routes
# Placeholder — will be implemented when profile page feature is built
from fastapi import APIRouter

router = APIRouter()


@router.get("/{slug}")
async def get_profile(slug: str):
    return {"message": f"Profile page for {slug} coming in Phase 2"}
