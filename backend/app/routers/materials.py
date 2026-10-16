from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.material import MaterialResponse, MaterialListResponse
from app.services.material_service import create_material, get_all_materials


router = APIRouter(
    prefix="/materials",
    tags=["Materials"],
)


@router.post(
    "",
    response_model=MaterialResponse,
    status_code=201,
)
def upload_material(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    return create_material(
        db=db,
        file=file,
    )

# Get all materials
@router.get(
    "",
    response_model=MaterialListResponse,
    status_code=200,
)
def get_materials(
    db: Session = Depends(get_db),
):
    materials = get_all_materials(db=db)

    return {
        "materials": materials,
        "total": len(materials),
    }