
from pathlib import Path

from google import genai
from google.genai import types

from app.core.config import GEMINI_API_KEY, GEMINI_MODEL
from app.ai.accessibility_schemas import AccessibilityAnalysis


ACCESSIBILITY_PROMPT = """
Actúa como un especialista en accesibilidad de materiales educativos
en formato PDF.

Analiza el documento completo adjunto y detecta posibles barreras
de accesibilidad en las siguientes dimensiones.

DIMENSIÓN 1: COMPRENSIÓN

Evalúa:
- Complejidad del lenguaje y terminología innecesariamente difícil.
- Oraciones o párrafos excesivamente extensos.
- Consignas ambiguas o difíciles de interpretar.
- Instrucciones que reúnen demasiadas acciones sin separar los pasos.
- Organización y secuencia de la información que dificulten la comprensión.

DIMENSIÓN 2: ESTRUCTURA

Evalúa:
- Uso y jerarquía de títulos y subtítulos.
- Organización del material en secciones.
- Uso de listas cuando facilitarían la comprensión.
- Orden lógico de los contenidos.
- Bloques extensos de información que deberían dividirse.

CRITERIOS GENERALES

1. Analiza el PDF completo, incluyendo el contexto de cada sección.
2. No inventes problemas. Identifica únicamente barreras respaldadas
   por evidencias observables en el documento.
3. No consideres automáticamente que un párrafo largo, una oración
   compleja o un título constituyen una barrera. Evalúa su función
   y el contexto educativo.
4. No propongas cambios meramente estéticos como barreras de comprensión.
5. Agrupa observaciones que representen un mismo problema subyacente.
   Una barrera puede tener varias evidencias en distintas páginas.
6. Para cada evidencia, devuelve:
   - El número de página, comenzando desde 1.
   - El tipo de elemento.
   - Un ancla textual breve, literal y distintiva, de hasta 12 palabras
     cuando sea posible.
   - El título o sección de contexto, si se puede identificar.
7. No reproduzcas párrafos completos ni el texto completo del documento.
   El backend recuperará el contenido original mediante su parser.
8. El ancla debe copiarse literalmente del PDF. No la parafrasees.
9. Si la barrera se refiere a una organización general y no a un
   fragmento puntual, utiliza la mejor evidencia localizable disponible.
10. Las recomendaciones deben ser concretas, viables y orientadas
    a mejorar la accesibilidad educativa.
11. No inventes números de página ni fragmentos textuales.
12. Devuelve las barreras en el JSON solicitado. No incluyas explicaciones
    fuera del JSON.
13. Si no encuentras barreras justificables, devuelve una lista vacía.

No evalúes todavía accesibilidad visual, multimedia, navegación
ni alternativas de representación. Esas dimensiones se analizarán
en etapas posteriores.
"""


def analyze_pdf_with_gemini(file_path: str) -> dict:
    if not GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY environment variable is not configured."
        )

    pdf_path = Path(file_path)

    if not pdf_path.is_file():
        raise FileNotFoundError(file_path)

    client = genai.Client(api_key=GEMINI_API_KEY)
    uploaded_file = None

    try:
        # 1. Subir el PDF original a Gemini.
        uploaded_file = client.files.upload(file=str(pdf_path))

        # 2. Contar los tokens de entrada antes del análisis.
        token_count = client.models.count_tokens(
            model=GEMINI_MODEL,
            contents=[ACCESSIBILITY_PROMPT, uploaded_file],
        )

        estimated_input_tokens = getattr(
            token_count, "total_tokens", None
        )

        # 3. Analizar el PDF y solicitar una salida JSON estructurada.
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[ACCESSIBILITY_PROMPT, uploaded_file],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=(
                    AccessibilityAnalysis.model_json_schema()
                ),
            ),
        )

        if not response.text:
            raise RuntimeError(
                "Gemini returned an empty accessibility analysis."
            )

        # 4. Validar que la respuesta cumpla el esquema esperado.
        analysis = AccessibilityAnalysis.model_validate_json(
            response.text
        )

        # 5. Recuperar las métricas reales de uso.
        usage = response.usage_metadata

        prompt_tokens = getattr(
            usage, "prompt_token_count", None
        )
        output_tokens = getattr(
            usage, "candidates_token_count", None
        )
        total_tokens = getattr(
            usage, "total_token_count", None
        )
        thoughts_tokens = getattr(
            usage, "thoughts_token_count", 0
        ) or 0
        cached_tokens = getattr(
            usage, "cached_content_token_count", 0
        ) or 0

        # Límite de entrada del modelo, si la API lo informa.
        try:
            model_info = client.models.get(model=GEMINI_MODEL)
            input_limit = getattr(
                model_info, "input_token_limit", None
            )
        except Exception:
            input_limit = None

        remaining_input_capacity = None

        if input_limit is not None and prompt_tokens is not None:
            remaining_input_capacity = max(
                0, input_limit - prompt_tokens
            )

        return {
            "analysis": analysis.model_dump(),
            "token_usage": {
                "input_tokens_estimated_before_request": (
                    estimated_input_tokens
                ),
                "input_tokens_used": prompt_tokens,
                "output_tokens_used": output_tokens,
                "thoughts_tokens_used": thoughts_tokens,
                "cached_tokens_used": cached_tokens,
                "total_tokens_used": total_tokens,
                "model_input_token_limit": input_limit,
                "remaining_input_capacity_estimate": (
                    remaining_input_capacity
                ),
                "note": (
                    "La capacidad restante es una estimación del "
                    "espacio de entrada del modelo, no del saldo "
                    "ni de la cuota disponible de la API."
                ),
            },
        }

    finally:
        # Limpiar el archivo remoto cuando termine este análisis.
        if uploaded_file is not None:
            try:
                client.files.delete(name=uploaded_file.name)
            except Exception:
                # No ocultar el resultado ni el error original
                # si falla la limpieza del archivo remoto.
                pass

        client.close()
