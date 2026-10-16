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
    statement = select(Material).order_by(Material.id)

    return list(db.scalars(statement).all())