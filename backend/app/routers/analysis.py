from fastapi import APIRouter, HTTPException

from app.services.analysis_service import analyze_material


router = APIRouter(
    prefix="/materials",
    tags=["Analysis"]
)


@router.post(
    "/{material_id}/analysis"
)
def analyze_material_endpoint(material_id: int):
    file_path = "/app/data/CLASE 1.pdf"

    try:
        return analyze_material(file_path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="Material file not found"
        )