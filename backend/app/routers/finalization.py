import os
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.finalization_service import (
    finalize_material,
    NoCompletedAnalysisError,
    ProposalEvidenceError,
)
from app.repositories import finalization_repository, material_repository


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/materials",
    tags=["Finalization"],
)


@router.post(
    "/{material_id}/finalize",
    status_code=status.HTTP_201_CREATED,
)
def finalize_material_endpoint(
    material_id: int,
    db: Session = Depends(get_db),
):

    try:
        finalized_document = finalize_material(
            db=db,
            material_id=material_id,
        )

        return {
            "message": "PDF generado correctamente.",
            "document_id": finalized_document.id,
            "filename": finalized_document.filename,
            "created_at": finalized_document.created_at,
            "download_url": (
                f"/materials/{material_id}/finalized-documents/"
                f"{finalized_document.id}/download"
            ),
        }

    except LookupError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found",
        )

    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material file not found",
        )

    except NoCompletedAnalysisError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        )

    except ProposalEvidenceError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        )

    except Exception:
        logger.exception(
            "Failed to finalize material %s",
            material_id,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo generar el PDF final.",
        )

@router.get(
    "/{material_id}/finalized-documents",
)
def get_finalized_documents_endpoint(
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

    documents = (
        finalization_repository.get_finalized_documents_by_material(
            db=db,
            material_id=material_id,
        )
    )

    return [
        {
            "id": document.id,
            "filename": document.filename,
            "created_at": document.created_at,
            "download_url": (
                f"/materials/{material_id}/finalized-documents/"
                f"{document.id}/download"
            ),
        }
        for document in documents
    ]


@router.get(
    "/{material_id}/finalized-documents/{document_id}/download",
    response_class=FileResponse,
)
def download_finalized_document_endpoint(
    material_id: int,
    document_id: int,
    db: Session = Depends(get_db),
):

    document = (
        finalization_repository.get_finalized_document_by_id(
            db=db,
            material_id=material_id,
            document_id=document_id,
        )
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Finalized document not found",
        )

    if not os.path.isfile(document.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF file not found",
        )

    return FileResponse(
        path=document.file_path,
        media_type="application/pdf",
        filename=document.filename,
    )


@router.get(
    "/{material_id}/download",
    response_class=FileResponse,
)
def download_finalized_material_endpoint(
    material_id: int,
    db: Session = Depends(get_db),
):
    try:
        finalized_document = (
            finalization_repository.get_latest_finalized_document(
                db=db,
                material_id=material_id,
            )
        )

        if finalized_document is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No se encontró un PDF generado para este material.",
            )

        if not os.path.isfile(finalized_document.file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El archivo PDF no existe.",
            )

        return FileResponse(
            path=finalized_document.file_path,
            media_type="application/pdf",
            filename=finalized_document.filename,
        )

    except HTTPException:
        raise

    except Exception:
        logger.exception(
            "Failed to download finalized material %s",
            material_id,
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo descargar el PDF.",
        )