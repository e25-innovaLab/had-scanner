import os

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-flash-latest",
)


def _positive_float_env(name: str, default: float) -> float:
    try:
        value = float(os.getenv(name, default))
    except (TypeError, ValueError):
        return default
    return value if value > 0 else default


def _non_negative_int_env(name: str, default: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default
    return value if value >= 0 else default


# Tope de espera por cada request a Gemini (subida del PDF y análisis).
# Acota el peor caso de "Deteniendo…" y evita workers colgados.
GEMINI_TIMEOUT_SECONDS = _positive_float_env("GEMINI_TIMEOUT_SECONDS", 600.0)

# Durable material files (survives Render free ephemeral disk).
# When both URL and service role key are set, uploads go to Supabase Storage.
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_STORAGE_BUCKET = os.getenv(
    "SUPABASE_STORAGE_BUCKET",
    "vera-materials",
)

# Auto-delete finalized PDFs older than N days (0 = disabled).
FINALIZED_RETENTION_DAYS = _non_negative_int_env("FINALIZED_RETENTION_DAYS", 14)
# Minimum seconds between retention sweeps (startup, background, and list).
FINALIZED_RETENTION_CLEANUP_SECONDS = _non_negative_int_env(
    "FINALIZED_RETENTION_CLEANUP_SECONDS",
    3600,
)


def _env_bool(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


# OCR for scanned / text-poor PDFs (ocrmypdf + tesseract).
OCR_MIN_CHARS_PER_PAGE = int(os.getenv("OCR_MIN_CHARS_PER_PAGE", "40"))
OCR_MIN_TOTAL_CHARS = int(os.getenv("OCR_MIN_TOTAL_CHARS", "120"))
OCR_LANGUAGE = os.getenv("OCR_LANGUAGE", "spa+eng")
OCR_TIMEOUT_SECONDS = int(os.getenv("OCR_TIMEOUT_SECONDS", "600"))
# When true, OCR every page (--force-ocr). Default hybrid: skip pages
# that already have selectable text (--skip-text).
OCR_FORCE_ALL = _env_bool("OCR_FORCE_ALL", "false")
OCR_DESKEW = _env_bool("OCR_DESKEW", "true")
OCR_ROTATE_PAGES = _env_bool("OCR_ROTATE_PAGES", "true")

# Finalize: "patch" edits the source PDF in place (keeps figures);
# "rebuild" regenerates a text-only PDF with ReportLab.
FINALIZE_MODE = os.getenv("FINALIZE_MODE", "patch").strip().lower()
BBOX_MAX_PAGE_COVERAGE = float(os.getenv("BBOX_MAX_PAGE_COVERAGE", "0.70"))
BBOX_SCAN_REJECT_COVERAGE = float(
    os.getenv("BBOX_SCAN_REJECT_COVERAGE", "0.55")
)
BBOX_SCAN_IMPRECISE_COVERAGE = float(
    os.getenv("BBOX_SCAN_IMPRECISE_COVERAGE", "0.35")
)
BBOX_SCAN_MIN_AREA = float(os.getenv("BBOX_SCAN_MIN_AREA", "120"))
