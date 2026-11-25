from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.material import Material


def get_active_by_hash(
    db: Session,
    file_hash: str,
) -> Material | None:
    statement = select(Material).where(
        Material.file_hash == file_hash,
        Material.status == "uploaded",
    )

    return db.scalar(statement)


def create(
    db: Session,
    material: Material,
) -> Material:
    db.add(material)
    db.commit()
    db.refresh(material)

    return material

def get_all(db: Session) -> list[Material]:
    statement = (
        select(Material)
        .where(Material.status == "uploaded")
        .order_by(Material.created_at.desc(), Material.id.desc())
    )

    return list(db.scalars(statement).all())


def get_by_id(
    db: Session,
    material_id: int,
) -> Material | None:
    statement = select(Material).where(
        Material.id == material_id,
        Material.status == "uploaded",
    )

    return db.scalar(statement)


def soft_delete(
    db: Session,
    material: Material,
) -> Material:
    material.status = "deleted"
    db.add(material)
    db.commit()
    db.refresh(material)
    return material