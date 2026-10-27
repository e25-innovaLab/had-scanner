from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.repositories import material_repository
from app.schemas.analysis import AnalysisResponse
from app.services.analysis_service import (
    create_material_analysis,
    get_analysis_by_id,
)

import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/materials",
    tags=["Analysis"],
)

analysis_by_id_router = APIRouter(
    prefix="/analysis",
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

@analysis_by_id_router.get(
    "/{analysis_id}",
    response_model=AnalysisResponse,
)
def get_analysis_by_id_endpoint(
    analysis_id: int,
    db: Session = Depends(get_db),
):
    analysis = get_analysis_by_id(
        db=db,
        analysis_id=analysis_id,
    )

    if analysis is None:
        raise HTTPException(
            status_code=404,
            detail="Analysis not found",
        )

    return analysis