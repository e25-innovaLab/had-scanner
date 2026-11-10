from pathlib import Path

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.models.material import Material
from app.repositories import material_repository
from app.utils.file_hash import calculate_sha256
from app.utils.file_storage import save_file
from app.utils.object_storage import (
    material_storage_enabled,
    upload_material_file,
)


def _persist_file_path(
    *,
    local_path: Path,
    file_hash: str,
    display_name: str,
) -> str:
    if material_storage_enabled():
        return upload_material_file(
            local_path=local_path,
            file_hash=file_hash,
            filename=display_name,
        )
    return str(Path("data") / local_path.name)


def _rehydrate_existing_material(
    db: Session,
    *,
    material: Material,
    local_path: Path,
) -> None:
    """Refresh durable storage after ephemeral disk loss (same file hash)."""
    if not material_storage_enabled():
        return
    storage_uri = upload_material_file(
        local_path=local_path,
        file_hash=material.file_hash,
        filename=material.name or local_path.name,
    )
    if material.file_path != storage_uri:
        material.file_path = storage_uri
        db.add(material)
        db.commit()
        db.refresh(material)


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
            try:
                _rehydrate_existing_material(
                    db,
                    material=existing_material,
                    local_path=saved_file_path,
                )
            finally:
                saved_file_path.unlink(missing_ok=True)

            raise HTTPException(
                status_code=409,
                detail="A material with the same file already exists.",
            )

        stored_path = _persist_file_path(
            local_path=saved_file_path,
            file_hash=file_hash,
            display_name=saved_file_path.name,
        )

        material = Material(
            name=saved_file_path.name,
            file_path=stored_path,
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


def get_material_by_id(
    db: Session,
    material_id: int,
) -> Material:
    material = material_repository.get_by_id(
        db=db,
        material_id=material_id,
    )

    if material is None:
        raise HTTPException(
            status_code=404,
            detail=f"Material with id {material_id} not found",
        )

    return material
