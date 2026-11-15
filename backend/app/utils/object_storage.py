"""Supabase Storage helpers for durable material files on free Render disks."""

from __future__ import annotations

import logging
import mimetypes
import re
import unicodedata
from functools import lru_cache
from pathlib import Path

from app.core.config import (
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_STORAGE_BUCKET,
    SUPABASE_URL,
)
from app.utils.file_storage import STORAGE_DIR

logger = logging.getLogger(__name__)

STORAGE_URI_PREFIX = "storage://"


def ascii_safe_filename(filename: str) -> str:
    original = Path(filename)
    stem = unicodedata.normalize("NFKD", original.stem)
    ascii_stem = "".join(char for char in stem if ord(char) < 128)
    ascii_stem = re.sub(r"[^A-Za-z0-9._-]+", "_", ascii_stem)
    ascii_stem = ascii_stem.strip("._") or "material"
    suffix = original.suffix.lower() or ".pdf"
    if not suffix.startswith("."):
        suffix = f".{suffix}"
    return f"{ascii_stem}{suffix}"


def material_storage_enabled() -> bool:
    return bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)


def is_storage_uri(file_path: str) -> bool:
    return file_path.startswith(STORAGE_URI_PREFIX)


def storage_object_key(file_path: str) -> str:
    if not is_storage_uri(file_path):
        raise ValueError(f"Not a storage URI: {file_path}")
    return file_path[len(STORAGE_URI_PREFIX) :]


def make_storage_uri(object_key: str) -> str:
    key = object_key.lstrip("/")
    return f"{STORAGE_URI_PREFIX}{key}"


def build_object_key(file_hash: str, filename: str) -> str:
    safe = ascii_safe_filename(Path(filename).name)
    return f"materials/{file_hash}/{safe}"


def cache_path_for(object_key: str) -> Path:
    return STORAGE_DIR / "cache" / object_key


@lru_cache(maxsize=1)
def _client():
    if not material_storage_enabled():
        raise RuntimeError(
            "Supabase Storage is not configured "
            "(SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
        )
    from supabase import create_client

    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def ensure_bucket() -> None:
    if not material_storage_enabled():
        return
    client = _client()
    bucket = SUPABASE_STORAGE_BUCKET
    try:
        client.storage.get_bucket(bucket)
        return
    except Exception:
        logger.info("Creating storage bucket %s", bucket)
    try:
        client.storage.create_bucket(
            bucket,
            options={"public": False},
        )
    except Exception:
        logger.exception("Could not ensure bucket %s", bucket)
        raise


def upload_material_file(
    *,
    local_path: Path,
    file_hash: str,
    filename: str | None = None,
) -> str:
    """Upload local file; returns storage:// URI for material.file_path."""
    ensure_bucket()
    object_key = build_object_key(
        file_hash,
        filename or local_path.name,
    )
    content_type = (
        mimetypes.guess_type(local_path.name)[0] or "application/octet-stream"
    )
    data = local_path.read_bytes()
    client = _client()
    client.storage.from_(SUPABASE_STORAGE_BUCKET).upload(
        path=object_key,
        file=data,
        file_options={
            "content-type": content_type,
            "upsert": "true",
        },
    )

    cached = cache_path_for(object_key)
    cached.parent.mkdir(parents=True, exist_ok=True)
    if local_path.resolve() != cached.resolve():
        cached.write_bytes(data)
    return make_storage_uri(object_key)


def download_material_file(storage_uri: str) -> Path:
    """Ensure a local cache copy exists; return its path."""
    object_key = storage_object_key(storage_uri)
    cached = cache_path_for(object_key)
    if cached.is_file() and cached.stat().st_size > 0:
        return cached

    ensure_bucket()
    client = _client()
    data = client.storage.from_(SUPABASE_STORAGE_BUCKET).download(object_key)
    cached.parent.mkdir(parents=True, exist_ok=True)
    cached.write_bytes(data)
    return cached


def resolve_material_path(file_path: str) -> Path:
    """Resolve a DB file_path (storage URI or local) to an on-disk Path."""
    if is_storage_uri(file_path):
        if not material_storage_enabled():
            raise FileNotFoundError(
                "Material stored in Supabase Storage but "
                "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured."
            )
        return download_material_file(file_path)

    path = Path(file_path)
    if path.is_file():
        return path
    alt = Path("/app") / file_path
    if alt.is_file():
        return alt
    data_alt = STORAGE_DIR / Path(file_path).name
    if data_alt.is_file():
        return data_alt
    raise FileNotFoundError(file_path)
