import os

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-flash-latest",
)

GEMINI_TIMEOUT_SECONDS = float(
    os.getenv("GEMINI_TIMEOUT_SECONDS", "30")
)

# OpenRouter - proveedor de respaldo
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

OPENROUTER_MODEL = os.getenv(
    "OPENROUTER_MODEL",
    "openrouter/free",
)

OPENROUTER_TIMEOUT_SECONDS = float(
    os.getenv("OPENROUTER_TIMEOUT_SECONDS", "90")
)


# Durable material files (survives Render free ephemeral disk).
# When both URL and service role key are set, uploads go to Supabase Storage.
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_STORAGE_BUCKET = os.getenv(
    "SUPABASE_STORAGE_BUCKET",
    "vera-materials",
)
