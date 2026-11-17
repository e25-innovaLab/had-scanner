import logging
import time
from pathlib import Path
from xml.parsers.expat import errors

import httpx
from google.genai import errors as gemini_errors
from pydantic import ValidationError

from app.core.exceptions import AnalysisCancelledException
from app.ai.gemini_client import analyze_pdf_with_gemini
from app.ai.openrouter_client import analyze_pdf_with_openrouter

logger = logging.getLogger(__name__)


class AllAIProvidersFailed(RuntimeError):
    """Guarda los errores de los proveedores de IA."""

    def __init__(self, failures: list[dict]):
        self.failures = failures

        super().__init__(
            "No fue posible completar el análisis "
            "con los proveedores de IA disponibles."
        )


def is_recoverable_error(exc: Exception) -> bool:
    """
    Determina si corresponde intentar otro proveedor.
    """

    # Errores del servicio de Gemini.
    if isinstance(exc, gemini_errors.APIError):
        status = getattr(exc, "status_code", None)

        if status in (408, 429, 500, 502, 503, 504):
            return True

        return False

    # Errores HTTP de OpenRouter.
    if isinstance(exc, httpx.HTTPStatusError):
        status = exc.response.status_code

        if status in (408, 429, 500, 502, 503, 504):
            return True

        return False

    # Problemas de conexión o timeout.
    if isinstance(exc, httpx.RequestError):
        return True

    # El proveedor devolvió un JSON incompatible.
    if isinstance(exc, ValidationError):
        return True

    # Errores conocidos generados por nuestros clientes.
    if isinstance(exc, RuntimeError):
        message = str(exc).lower()

        if any(
            text in message
            for text in (
                "respuesta vacía",
                "respuesta vacia",
                "no devolvió resultados",
                "no devolvio resultados",
                "diagnóstico inválido",
                "diagnostico invalido",
                "no cumple el esquema de accesibilidad",
                "empty accessibility analysis",
            )
        ):
            return True

    # Los errores desconocidos no activan fallback.
    return False


def analyze_pdf_with_fallback(
    file_path: str,
    check_cancelled=None,
) -> dict:

    # Validamos el archivo antes de llamar a cualquier IA.
    pdf_path = Path(file_path)

    if not pdf_path.is_file():
        raise FileNotFoundError(file_path)

    if pdf_path.suffix.lower() != ".pdf":
        raise ValueError("El archivo debe ser un PDF")

    providers = [
        ("gemini", analyze_pdf_with_gemini),
        ("openrouter", analyze_pdf_with_openrouter),
    ]

    errors = []

    for provider_name, analyze_function in providers:

        if check_cancelled:
            check_cancelled()

        start = time.perf_counter()

        try:
            logger.info(
                "Iniciando análisis con %s",
                provider_name,
            )

            result = analyze_function(str(pdf_path))

            # Evitamos aceptar resultados inesperados.
            if not isinstance(result, dict):
                raise RuntimeError("El proveedor devolvió un resultado inesperado")

            if not isinstance(result.get("analysis"), dict):
                raise RuntimeError("El proveedor devolvió un resultado inesperado")

            elapsed = time.perf_counter() - start

            if check_cancelled:
                check_cancelled()

            logger.info(
                "Análisis exitoso con %s en %.2f segundos",
                provider_name,
                elapsed,
            )

            return {
                "analysis": result["analysis"],
                "provider": provider_name,
                "elapsed_seconds": round(elapsed, 2),
            }

        except AnalysisCancelledException:
            logger.info("Análisis cancelado. No se ejecutará otro proveedor.")
            raise

        except Exception as exc:
            elapsed = time.perf_counter() - start

            # Comprobamos si el docente canceló
            # durante la solicitud a la IA.
            if check_cancelled:
                check_cancelled()

            if not is_recoverable_error(exc):
                logger.exception(
                    "Error no recuperable con %s",
                    provider_name,
                )
                raise

            logger.warning(
                "Proveedor %s falló después de %.2f segundos: %s",
                provider_name,
                elapsed,
                type(exc).__name__,
            )

            status = getattr(exc, "status_code", None)

            if isinstance(exc, httpx.HTTPStatusError):
                status = exc.response.status_code

            errors.append(
                {
                    "provider": provider_name,
                    "error_type": type(exc).__name__,
                    "status_code": status,
                }
            )

            logger.info("Intentando el siguiente proveedor disponible")

    # Ningún proveedor pudo generar el análisis.
    logger.error(
        "Todos los proveedores fallaron: %s",
        errors,
    )


    raise AllAIProvidersFailed(errors)
