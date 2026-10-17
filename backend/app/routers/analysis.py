
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.repositories import material_repository
from app.schemas.analysis import AnalysisResponse
from app.services.analysis_service import create_material_analysis

import logging

logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/materials",
    tags=["Analysis"],
)

@router.post(
    "/{material_id}/analysis",
    response_model=AnalysisResponse,
    status_code=201,
)
def analyze_material_endpoint(
    material_id: int,
    db: Session = Depends(get_db),
):
    material = material_repository.get_by_id(
        db=db,
        material_id=material_id,
    )

    if material is None:
        raise HTTPException(
            status_code=404,
            detail="Material not found",
        )

    file_path = material.file_path

    try:
        return create_material_analysis(
            db=db,
            material_id=material_id,
            file_path=file_path,
        )

    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="Material file not found",
        )

    except RuntimeError as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )

    except Exception:
        logger.exception(
            "Failed to analyze material %s",
            material_id,
        )
        raise HTTPException(
            status_code=500,
            detail="No se pudo completar el análisis del material.",
        )
