from __future__ import annotations

import logging
import shutil
import subprocess
import time
from pathlib import Path

from app.ai.errors import GeminiAnalysisError
from app.core.config import (
    OCR_DESKEW,
    OCR_FORCE_ALL,
    OCR_LANGUAGE,
    OCR_ROTATE_PAGES,
    OCR_TIMEOUT_SECONDS,
)


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


def prefer_ocr_pdf(source: str | Path) -> Path:
    path = Path(source)
    sidecar = ocr_sidecar_path(path)
    if sidecar != path and sidecar.is_file():
        return sidecar
    return path


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
