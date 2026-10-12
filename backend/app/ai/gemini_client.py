
from google import genai

from app.core.config import GEMINI_API_KEY, GEMINI_MODEL


def send_greeting() -> str:
    """Send a greeting to Gemini and return its response."""

    if not GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY environment variable is not configured."
        )

    client = genai.Client(api_key=GEMINI_API_KEY)

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents="Hola, Gemini. ¿Podés saludarme brevemente en español?",
        )

        if not response.text:
            raise RuntimeError(
                "Gemini returned an empty response."
            )

        return response.text

    finally:
        client.close()
