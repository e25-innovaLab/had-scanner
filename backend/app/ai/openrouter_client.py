import json
import base64
import logging
from pathlib import Path

import httpx
from pydantic import ValidationError

from app.ai.accessibility_schemas import AccessibilityAnalysis
from app.ai.gemini_client import ACCESSIBILITY_PROMPT
from app.core.config import (
    OPENROUTER_API_KEY,
    OPENROUTER_MODEL,
    OPENROUTER_TIMEOUT_SECONDS,
)

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


def analyze_pdf_with_openrouter(file_path: str) -> dict:
    if not OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY no configurada")

    # Evitamos seleccionar accidentalmente un modelo pago.
    if OPENROUTER_MODEL != "openrouter/free" and not OPENROUTER_MODEL.endswith(":free"):
        raise ValueError("Solo se permiten modelos gratuitos")

    pdf_path = Path(file_path)

    if not pdf_path.is_file():
        raise FileNotFoundError(file_path)

    if pdf_path.suffix.lower() != ".pdf":
        raise ValueError("El archivo debe ser un PDF")

    # Enviamos el PDF completo, codificado en Base64.
    pdf_base64 = base64.b64encode(pdf_path.read_bytes()).decode("utf-8")

    pdf_data = f"data:application/pdf;base64,{pdf_base64}"

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            ACCESSIBILITY_PROMPT
                            + "\n\nFORMATO JSON OBLIGATORIO:\n"
                            + json.dumps(
                                AccessibilityAnalysis.model_json_schema(),
                                ensure_ascii=False,
                            )
                            + "\n\nResponde exclusivamente con un objeto JSON "
                            + "que cumpla exactamente este esquema. "
                            + "Usa únicamente 'comprension' o 'estructura' "
                            + "para dimension. "
                            + "Incluye todos los campos obligatorios "
                            + "y exactamente una evidencia por barrera. "
                            + "No incluyas texto adicional ni Markdown."
                        ),
                    },
                    {
                        "type": "file",
                        "file": {
                            "filename": pdf_path.name,
                            "file_data": pdf_data,
                        },
                    },
                ],
            }
        ],
        "plugins": [
            {
                "id": "file-parser",
                "pdf": {
                    "engine": "cloudflare-ai",
                },
            }
        ],
        "stream": False,
    }

    logger.info(
        "Iniciando análisis con OpenRouter. Modelo: %s",
        OPENROUTER_MODEL,
    )

    with httpx.Client(timeout=OPENROUTER_TIMEOUT_SECONDS) as client:
        response = client.post(
            OPENROUTER_URL,
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        data = response.json()

    choices = data.get("choices") or []

    if not choices:
        raise RuntimeError("OpenRouter no devolvió resultados")

    message = choices[0].get("message") or {}
    content = message.get("content")

    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("OpenRouter devolvió una respuesta vacía")

    content = content.strip()

    # Algunos modelos envuelven el JSON en Markdown.
    if content.startswith("```"):
        lines = content.splitlines()
        if len(lines) >= 3 and lines[-1].strip() == "```":
            content = "\n".join(lines[1:-1]).strip()

    try:
        analysis = AccessibilityAnalysis.model_validate_json(content)
    except (ValidationError, ValueError) as exc:
        logger.warning("OpenRouter devolvió un diagnóstico inválido")
        raise RuntimeError(
            "La respuesta no cumple el esquema de accesibilidad"
        ) from exc

    logger.info("Análisis de OpenRouter validado correctamente")

    return {
        "analysis": analysis.model_dump(),
    }
