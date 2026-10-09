from pathlib import Path

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.models.material import Material
from app.repositories import material_repository
from app.utils.file_hash import calculate_sha256
from app.utils.file_storage import save_file


def create_material(
    db: Session,
    file: UploadFile,
) -> Material:

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file must have a name.",
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed.",
        )

    saved_file_path = None

    try:
        saved_file_path = save_file(
            file=file,
            filename=file.filename,
        )

        file_hash = calculate_sha256(saved_file_path)

        existing_material = material_repository.get_active_by_hash(
            db=db,
            file_hash=file_hash,
        )

        if existing_material:
            saved_file_path.unlink()

            raise HTTPException(
                status_code=409,
                detail="A material with the same file already exists.",
            )

        material = Material(
            name=saved_file_path.name,
            file_path=str(
                Path("data") / saved_file_path.name
            ),
            file_hash=file_hash,
            status="uploaded",
        )

        return material_repository.create(
            db=db,
            material=material,
        )

    except HTTPException:
        raise

    except Exception:
        if saved_file_path and saved_file_path.exists():
            saved_file_path.unlink()

        raise

def get_all_materials(
        db: Session
) -> list[Material]:
    return material_repository.get_all(db=db)