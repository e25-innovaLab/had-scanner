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
