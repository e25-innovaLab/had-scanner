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


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/materials",
    tags=["Finalization"],
)


@router.post(
    "/{material_id}/finalize",
    response_class=FileResponse,
    status_code=status.HTTP_200_OK,
)
def finalize_material_endpoint(
    material_id: int,
    db: Session = Depends(get_db),
):

    try:
        output_path, filename = finalize_material(
            db=db,
            material_id=material_id,
        )

        return FileResponse(
            path=output_path,
            media_type="application/pdf",
            filename=filename,
        )

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