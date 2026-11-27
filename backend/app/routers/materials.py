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
    delete_material,
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


# Static path must be registered before /{material_id} or FastAPI treats
# "finalized-documents" as a material_id and returns 422.
@router.get(
    "/finalized-documents",
)
def list_finalized_documents(
    db: Session = Depends(get_db),
):
    from app.services.finalization_service import list_all_finalized_documents

    documents = list_all_finalized_documents(db=db)
    return [
        {
            "id": document.id,
            "material_id": document.material_id,
            "material_name": (
                document.material.name if document.material else None
            ),
            "filename": document.filename,
            "created_at": document.created_at,
            "download_url": (
                f"/materials/{document.material_id}/finalized-documents/"
                f"{document.id}/download"
            ),
        }
        for document in documents
    ]


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


@router.delete(
    "/{material_id}",
    status_code=204,
)
def remove_material(
    material_id: int,
    db: Session = Depends(get_db),
):
    delete_material(db=db, material_id=material_id)