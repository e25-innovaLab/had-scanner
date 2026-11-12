# Wiki de tipos

Qué significa cada tipo de `frontend/src/types/` y por qué existe. Los nombres en código están en inglés; acá se explica el sentido.

Convención: cada set cerrado de valores es un objeto `const` y el tipo se deriva de él. `SEVERITY_LEVEL.BARRIER` es el valor que se usa en código; `SeverityLevel` es el tipo. Nunca se escribe el string a mano.

## Documento (`document.ts`)

| Tipo | Qué es |
| --- | --- |
| `Document` | Lo que el docente cargó, ya convertido a texto analizable. Es `TextDocument` o `PdfDocument`. |
| `TextDocument` | Texto pegado. Trae `wordCount` porque hay reglas que no corren con poco texto. |
| `PdfDocument` | PDF subido. `pages`, `hasTextLayer` (si es falso no se puede analizar) y `tagState`. |
| `PdfTagState` | `tagged`, `untagged` o `unknown`. Un PDF sin etiquetar no permite evaluar estructura, alt text ni orden de lectura. |
| `Document.language` | Idioma detectado. Si no es `es`, las reglas lingüísticas quedan como no evaluables. |
| `extractedText` | Es el texto, no el archivo. El binario del PDF se modela aparte cuando la API lo necesite. |

## Diagnóstico (`diagnosis.ts`)

| Tipo | Qué es |
| --- | --- |
| `Diagnosis` | Resultado del análisis de un documento. Trae `status`, `score` (opcional), cobertura, dimensiones, hallazgos y criterios no evaluables. |
| `AnalysisStatus` | `complete`: reglas e IA corrieron. `partial`: la IA falló, hay solo reglas y los criterios de IA quedan no evaluables. `not_analyzable`: no hay texto; sin score. |
| `Dimension` | Las seis del brief: comprensión, estructura, visual, alternativas, multimedia, navegación. |
| `DimensionResult` | Score y cobertura por dimensión. `score` es opcional: sin criterios evaluables no hay número. |
| `Finding` | Un hallazgo. Explica el problema (`explanation`), muestra el fragmento observado (`fragment`), recomienda una acción (`recommendation`) y dice qué adaptación genera (`action`). |
| `SeverityLevel` | `correct`, `to_review`, `barrier`. Son los tres semáforos del brief. |
| `FindingSource` | `rule` (regla determinista), `ai` (Gemini), `hybrid` (regla corroborada por IA). |
| `RuleFinding`, `HybridFinding`, `AiFinding` | Un hallazgo solo de IA no puede ser `barrier`: `AiFinding` lo impide por tipo. |
| `FindingAction` | Las cinco adaptaciones del MVP más `manual` (hay que corregirlo a mano, la IA no propone nada). |
| `criterionId` | Id del criterio en el catálogo del backend, por ejemplo `comprehension.sentence_length`. Reglas e IA usan los mismos ids. |
| `EvaluationEvidence` | Valor medido y umbral: "59 palabras, máximo 30". Solo lo traen las reglas; la IA muestra solo el fragmento. |
| `FindingLocation` | Dónde está: página (PDF), párrafo o rango de caracteres sobre el texto extraído. |
| `NonEvaluableCriterion` | Criterio que no se pudo evaluar y por qué. Se muestra explícito; nunca se asume correcto. |

Cobertura: `evaluatedCriteria` de `totalCriteria`. El score se calcula solo sobre los evaluados y se muestra siempre junto a la cobertura.

## Adaptación (`adaptation.ts`)

| Tipo | Qué es |
| --- | --- |
| `Adaptation` | Propuesta de cambio para un hallazgo (`findingId`). Guarda `original`, `proposed` y, si el docente editó, `finalContent`. |
| `AdaptationType` | Las cinco del brief: `plain_language` (lenguaje claro), `split_steps` (consigna en pasos), `reorganize` (contenido extenso), `alt_text` (texto alternativo), `heading_structure` (títulos y secciones). |
| `AdaptationStatus` | `pending`, `accepted`, `edited`, `rejected`. La versión final usa `proposed` si fue aceptada y `finalContent` si fue editada. |
| `AdaptationSummary` | Conteo por estado para el resumen y el informe. |

## Fixtures (`fixtures/`)

Datos de ejemplo tipados que reemplazan a la API hasta que exista. Cubren los casos que la interfaz tiene que mostrar:

| Fixture | Caso |
| --- | --- |
| `textDocument`, `diagnosisComplete` | Consigna pegada; reglas e IA corrieron; 7 de 14 criterios evaluables. |
| `pdfDocument`, `diagnosisPartial` | PDF etiquetado; la IA falló; solo reglas; imágenes sin alt text. |
| `pdfWithoutText`, `diagnosisNotAnalyzable` | PDF escaneado; sin score; un único hallazgo. |
| `adaptations` | Una adaptación por cada estado. |
