
import logging
import os

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.repositories import material_repository
from app.schemas.analysis import AnalysisResponse
from app.services.analysis_service import (
    create_material_analysis,
    get_analysis_by_id,
    process_analysis_task,
)
from app.utils.pdf_parser import extract_document


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
    status_code=status.HTTP_202_ACCEPTED,
)
def analyze_material_endpoint(
    material_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    material = material_repository.get_by_id(
        db=db,
        material_id=material_id,
    )

    if material is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found",
        )

    if not os.path.isfile(material.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material file not found",
        )

    try:
        analysis = create_material_analysis(
            db=db,
            material_id=material_id,
        )

        background_tasks.add_task(
            process_analysis_task,
            analysis.id,
            material_id,
        )

        return analysis

    except Exception:
        logger.exception(
            "Failed to start analysis for material %s",
            material_id,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo iniciar el análisis del material.",
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
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found",
        )

    return analysis

@router.get(
    "/{material_id}/parsed-document",
)
def get_parsed_document_endpoint(
    material_id: int,
    db: Session = Depends(get_db),
):
    material = material_repository.get_by_id(
        db=db,
        material_id=material_id,
    )

    if material is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found",
        )

    if not os.path.isfile(material.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material file not found",
        )

    try:
        return extract_document(material.file_path)

    except Exception:
        logger.exception(
            "Failed to parse material %s",
            material_id,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo procesar el documento.",
        )