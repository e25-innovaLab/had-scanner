from __future__ import annotations

import logging
import re
import shutil
import subprocess
import time
import unicodedata
from pathlib import Path

from app.ai.errors import GeminiAnalysisError
from app.core.config import (
    OCR_DESKEW,
    OCR_FORCE_ALL,
    OCR_LANGUAGE,
    OCR_ROTATE_PAGES,
    OCR_TIMEOUT_SECONDS,
)

# Keep aligned with app.utils.file_storage.STORAGE_DIR (avoid importing FastAPI here).
STORAGE_DIR = Path("/app/data")

logger = logging.getLogger(__name__)


def _resolve_path(file_path: str) -> Path:
    path = Path(file_path)
    if path.is_file():
        return path.resolve()

    alt = Path("/app") / file_path
    if alt.is_file():
        return alt.resolve()

    raise FileNotFoundError(file_path)


def ocr_sidecar_path(source: str | Path) -> Path:
    path = Path(source)
    stem = path.stem
    if stem.endswith("_ocr"):
        return path
    return path.with_name(f"{stem}_ocr{path.suffix}")


def _ascii_safe_name(filename: str) -> str:
    original = Path(filename)
    stem = unicodedata.normalize("NFKD", original.stem)
    ascii_stem = "".join(char for char in stem if ord(char) < 128)
    ascii_stem = re.sub(r"[^A-Za-z0-9._-]+", "_", ascii_stem)
    ascii_stem = ascii_stem.strip("._") or "material"
    suffix = original.suffix.lower() or ".pdf"
    if not suffix.startswith("."):
        suffix = f".{suffix}"
    return f"{ascii_stem}{suffix}"


def durable_ocr_path(source: str | Path) -> Path:
    """Stable OCR copy under ``STORAGE_DIR/ocr``."""
    name = _ascii_safe_name(ocr_sidecar_path(source).name)
    return STORAGE_DIR / "ocr" / name


def prefer_ocr_pdf(source: str | Path) -> Path:
    path = Path(source)
    sidecar = ocr_sidecar_path(path)
    if sidecar != path and sidecar.is_file():
        return sidecar
    durable = durable_ocr_path(path)
    if durable.is_file():
        return durable
    return path


def persist_ocr_artifact(*, ocr_path: str, source_file_path: str) -> str:
    """Copy OCR output to ``STORAGE_DIR/ocr`` for adapt/finalize reuse."""
    local = Path(ocr_path)
    if not local.is_file():
        raise FileNotFoundError(ocr_path)

    dest = durable_ocr_path(source_file_path)
    dest.parent.mkdir(parents=True, exist_ok=True)
    if local.resolve() != dest.resolve():
        shutil.copy2(local, dest)

    logger.info("Persisted OCR artifact to %s", dest)
    return str(dest)


def resolve_analyzed_pdf_path(
    file_path: str,
    *,
    preferred_path: str | None = None,
) -> Path:
    """PDF for adapt/finalize: preferred OCR path, sibling sidecar, or original."""
    if preferred_path:
        if preferred_path.startswith("storage://"):
            from app.utils.object_storage import resolve_material_path

            return resolve_material_path(preferred_path)
        preferred = Path(preferred_path)
        if preferred.is_file():
            return preferred

    resolved = Path(file_path)
    if resolved.is_file():
        return prefer_ocr_pdf(resolved)

    from app.utils.object_storage import resolve_material_path

    return prefer_ocr_pdf(resolve_material_path(file_path))


def ocr_pdf(
    file_path: str,
    *,
    page_count: int = 1,
    force: bool = False,
) -> str:
    if shutil.which("ocrmypdf") is None:
        raise GeminiAnalysisError(
            "ocr_unavailable",
            (
                "OCR no está disponible en el servidor "
                "(falta ocrmypdf/tesseract)."
            ),
        )

    source = _resolve_path(file_path)
    output = ocr_sidecar_path(source)

    if output.exists() and output != source:
        output.unlink()

    # Whole-document sparse / scan PDFs often carry a junk text layer;
    # --skip-text would leave them untouched. Force when asked or configured.
    ocr_mode = (
        "--force-ocr" if (OCR_FORCE_ALL or force) else "--skip-text"
    )
    command = [
        "ocrmypdf",
        "--language",
        OCR_LANGUAGE,
        ocr_mode,
        "--optimize",
        "0",
        "--skip-big",
        "100",
    ]
    if OCR_DESKEW:
        command.append("--deskew")
    if OCR_ROTATE_PAGES:
        command.append("--rotate-pages")
    command.extend([str(source), str(output)])

    pages = max(int(page_count), 1)
    started = time.perf_counter()
    logger.info(
        "Starting OCR for %s (mode=%s, pages≈%s)",
        source.name,
        ocr_mode,
        pages,
    )

    try:
        completed = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            timeout=OCR_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired as exc:
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        logger.error(
            "OCR timeout for %s after %sms (limit=%ss, pages≈%s)",
            source.name,
            elapsed_ms,
            OCR_TIMEOUT_SECONDS,
            pages,
        )
        raise GeminiAnalysisError(
            "ocr_timeout",
            (
                f"El OCR del PDF excedió el tiempo límite "
                f"({OCR_TIMEOUT_SECONDS}s"
                f"{f' · ~{pages} páginas' if pages > 1 else ''}). "
                "Reintentá con un archivo más chico o menos páginas "
                "escaneadas."
            ),
        ) from exc

    elapsed_ms = int((time.perf_counter() - started) * 1000)

    if completed.returncode != 0 or not output.is_file():
        stderr = (completed.stderr or "").strip()
        logger.error(
            "OCR failed for %s in %sms: %s",
            source.name,
            elapsed_ms,
            stderr[:500],
        )
        raise GeminiAnalysisError(
            "ocr_failed",
            (
                "No se pudo aplicar OCR al PDF escaneado. "
                "Revisá que el archivo no esté corrupto."
            ),
        )

    logger.info(
        "OCR finished for %s in %sms → %s",
        source.name,
        elapsed_ms,
        output.name,
    )
    return str(output)
