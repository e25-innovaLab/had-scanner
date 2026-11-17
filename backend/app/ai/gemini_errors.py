"""Map Gemini / google-genai failures to user-facing Spanish messages."""

from __future__ import annotations

from typing import Any


MSG_UNAVAILABLE = (
    "El servicio de IA (Gemini) está saturado o no disponible temporalmente. "
    "No es un fallo de VERA: reintentá en unos minutos."
)

MSG_QUOTA = (
    "Se agotó la cuota de la API de Gemini (plan free u otro límite). "
    "No es un fallo de VERA: reintentá más tarde, cuando se renueve la cuota."
)

MSG_TIMEOUT = (
    "La IA no respondió a tiempo. "
    "No es un fallo de VERA: reintentá en unos minutos."
)

MSG_CONFIG = (
    "La IA no está configurada correctamente en el servidor "
    "(falta o es inválida la API key de Gemini)."
)

MSG_GENERIC_GEMINI = (
    "No se pudo completar la operación con la IA (Gemini). "
    "Si el problema continúa, reintentá más tarde."
)

MSG_GENERIC = "No se pudo completar el análisis del material."


def _exception_blob(exc: BaseException) -> str:
    parts: list[str] = [str(exc)]
    cause = exc.__cause__ or exc.__context__
    if cause is not None:
        parts.append(str(cause))
    # google.genai ServerError often embeds JSON in the message already.
    status = getattr(exc, "status_code", None) or getattr(exc, "code", None)
    if status is not None:
        parts.append(str(status))
    response_json = getattr(exc, "response_json", None)
    if isinstance(response_json, dict):
        parts.append(str(response_json))
    return " ".join(parts).lower()


def classify_gemini_failure(exc: BaseException) -> tuple[str, str, int]:
    """Return ``(code, user_message, http_status)`` for a Gemini-related error.

    ``code`` is a stable token for logs/UI: gemini_unavailable, gemini_quota,
    gemini_timeout, gemini_config, gemini_error, unknown.
    """
    blob = _exception_blob(exc)
    status = getattr(exc, "status_code", None)
    try:
        status_int = int(status) if status is not None else None
    except (TypeError, ValueError):
        status_int = None

    if status_int == 429 or any(
        token in blob
        for token in (
            "resource_exhausted",
            "quota",
            "rate limit",
            "rate_limit",
            "exceeded your current quota",
        )
    ):
        return "gemini_quota", MSG_QUOTA, 429

    if status_int == 503 or any(
        token in blob
        for token in (
            "unavailable",
            "high demand",
            "overloaded",
            "temporarily",
            "503",
        )
    ):
        return "gemini_unavailable", MSG_UNAVAILABLE, 503

    if status_int in (408, 504) or any(
        token in blob
        for token in ("timeout", "timed out", "deadline", "504", "408")
    ):
        return "gemini_timeout", MSG_TIMEOUT, 504

    if (
        any(
            token in blob
            for token in (
                "api key",
                "api_key",
                "not configured",
                "invalid_argument",
                "permission_denied",
                "401",
                "403",
            )
        )
        or (
            isinstance(exc, RuntimeError)
            and "GEMINI_API_KEY" in str(exc)
        )
    ):
        return "gemini_config", MSG_CONFIG, 502

    # Likely Gemini if it came from google.genai or mentions Gemini/generate.
    if any(
        token in blob
        for token in ("gemini", "google.genai", "generate_content", "servererror")
    ) or type(exc).__module__.startswith("google.genai"):
        return "gemini_error", MSG_GENERIC_GEMINI, 502

    return "unknown", MSG_GENERIC, 502


def analysis_error_message(exc: BaseException) -> str:
    _code, message, _status = classify_gemini_failure(exc)
    return message


def proposal_http_error(exc: BaseException) -> tuple[int, str]:
    _code, message, status = classify_gemini_failure(exc)
    return status, message


def is_gemini_availability_message(message: str | None) -> bool:
    if not message:
        return False
    lowered = message.lower()
    return any(
        token in lowered
        for token in (
            "gemini",
            "servicio de ia",
            "cuota",
            "saturado",
            "no es un fallo de vera",
        )
    )
