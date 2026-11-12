
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

5. Cada barrera debe corresponder a un único elemento de contenido
   identificable del documento (un párrafo, texto o título).

6. Cada barrera debe contener exactamente una evidencia. No agrupes
   diferentes párrafos, textos o elementos en una misma barrera,
   aunque presenten el mismo problema de accesibilidad.

7. Si un mismo elemento de contenido presenta varios problemas
   de accesibilidad, agrúpalos dentro de una única barrera.
   La descripción, justificación y recomendación deben contemplar
   todos los problemas detectados en ese elemento.

8. Nunca generes dos barreras diferentes que hagan referencia
   al mismo elemento de contenido. Cada elemento debe aparecer
   como máximo en una barrera.

9. Si dos o más elementos diferentes presentan el mismo problema
   de accesibilidad, genera una barrera independiente para cada uno.

10. No generes barreras para problemas generales de organización
    o estructura que no puedan asociarse a un único elemento
    de contenido modificable.

11. Para la única evidencia de cada barrera, devuelve:
    - El número de página, comenzando desde 1.
    - El tipo de elemento.
    - Un ancla textual breve, literal y distintiva, de hasta 12 palabras
      cuando sea posible.
    - El título o sección de contexto, si se puede identificar.

12. No reproduzcas párrafos completos ni el texto completo del documento.
    El backend recuperará el contenido original mediante su parser.

13. El ancla debe copiarse literalmente del PDF. No la parafrasees.

14. Las recomendaciones deben ser concretas, viables y orientadas
    a mejorar la accesibilidad educativa del elemento identificado.

15. No inventes números de página ni fragmentos textuales.

16. Devuelve las barreras en el JSON solicitado. No incluyas explicaciones
    fuera del JSON.

17. Si no encuentras barreras justificables, devuelve una lista vacía.

No evalúes todavía accesibilidad visual, multimedia, navegación
ni alternativas de representación. Esas dimensiones se analizarán
en etapas posteriores.

REGLAS DE GRANULARIDAD DE LAS BARRERAS

1. Cada barrera debe representar un problema detectado en un único
   elemento de contenido del documento.

2. Cada barrera debe contener exactamente una evidencia.

3. Nunca agrupes diferentes párrafos, títulos o elementos de contenido
   dentro de una misma barrera, aunque presenten el mismo problema.

4. Si dos párrafos diferentes presentan el mismo problema de
   accesibilidad, genera dos barreras independientes.

5. Si un mismo párrafo presenta varios problemas relacionados con
   la accesibilidad, agrúpalos en una única barrera y genera una
   recomendación que contemple todos esos problemas.

6. Nunca generes dos barreras independientes para el mismo elemento
   de contenido.

7. La evidencia debe permitir identificar inequívocamente el elemento
   original que posteriormente será adaptado.

8. Las recomendaciones deben aplicarse exclusivamente al elemento
   identificado por la evidencia de la barrera.
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
        uploaded_file = client.files.upload(file=str(pdf_path))

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

        analysis = AccessibilityAnalysis.model_validate_json(
            response.text
        )

        return {
            "analysis": analysis.model_dump(),
        }

    finally:
        if uploaded_file is not None:
            try:
                client.files.delete(name=uploaded_file.name)
            except Exception:
                pass

        client.close()
