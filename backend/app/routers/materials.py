from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db

from app.schemas.material import (
    MaterialResponse,
    MaterialListResponse,
    MaterialTextRequest,
)

from app.services.material_service import (
    create_material,
    create_material_from_text,
    get_all_materials,
    get_material_by_id,
)



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

# POST endpoint to upload material from text
@router.post(
    "/text",
    response_model=MaterialResponse,
    status_code=201,
)
def upload_material_text(
    data: MaterialTextRequest,
    db: Session = Depends(get_db),
):
    name = data.name.strip()
    text = data.text.strip()

    if not name or not text:
        raise HTTPException(
            status_code=422,
            detail="El nombre y el texto no pueden estar vacíos.",
        )

    return create_material_from_text(
        db=db,
        name=name,
        text=text,
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

@router.get(
    "/{material_id}",
    response_model=MaterialResponse,
    status_code=200,
)
def get_material(
    material_id: int,
    db: Session = Depends(get_db),
):
    return get_material_by_id(
        db=db,
        material_id=material_id,
    )