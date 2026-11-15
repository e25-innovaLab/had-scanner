# Contrato del MVP y plan de trabajo frontend

Convierte el brief y la investigación inicial en decisiones de implementación. Tres personas, tres módulos, un solo contrato. Se avanza con fixtures tipados sin esperar a FastAPI ni a Gemini.

## Alcance del MVP

```text
Cargar o pegar texto -> analizar -> revisar diagnóstico -> seleccionar barreras ->
generar propuesta -> aceptar, editar o descartar -> obtener contenido adaptado e informe
```

| Incluido | Fuera |
| --- | --- |
| PDF con capa de texto y texto pegado | Word, PowerPoint, OCR |
| Diagnóstico orientativo por seis dimensiones | Certificación de accesibilidad |
| Reglas automáticas, IA e híbridas | Aplicación automática de cambios |
| Adaptaciones revisables una a una | Audio, braille, lectura en voz alta, PDF/UA |
| Versión adaptada e informe básico | Export a PDF |

## Principios

- El diagnóstico es orientativo; la decisión pedagógica es del docente.
- Un hallazgo solo de IA nunca es `barrier`; como máximo `to_review`.
- El score se calcula solo sobre criterios evaluables y siempre se muestra como `N de M criterios evaluados`.
- Sin evidencia no hay "correcto": el criterio se informa como no evaluable, nunca en verde.
- PDF sin capa de texto: se rechaza con un único hallazgo `document.text_layer`, sin score.
- Antes de enviar a Gemini, la interfaz avisa qué se envía y que es un servicio externo.

## Contrato de tipos

Vive en `frontend/src/types/`. Qué significa cada tipo: `docs/types-wiki.md`. Cambios respecto a la primera versión:

- Sets cerrados como objetos `const` (`SEVERITY_LEVEL`, `DIMENSION`, ...): se usan en runtime, no solo como tipo.
- `Finding.action`: qué adaptación genera el hallazgo (una de las cinco del MVP o `manual`). Es el puente entre diagnóstico y adaptación.
- `Finding.criterionId`: mismo id que usa el catálogo del backend.
- `Finding` por origen: `AiFinding` no admite `barrier` por tipo.
- `Diagnosis.status`: `complete`, `partial` (falló la IA, solo reglas) o `not_analyzable`.
- `Diagnosis.nonEvaluableCriteria`: lista explícita con motivo.
- `PdfDocument.hasTextLayer` y `tagState`; `Document.language` para explicar por qué las reglas lingüísticas quedan fuera si el material no está en español.
- `AdaptationType` son las cinco adaptaciones mínimas del brief: `plain_language`, `split_steps`, `reorganize`, `alt_text`, `heading_structure`.

## Hitos y semanas

Las semanas son las del plan del brief. El backend tiene "primer flujo de análisis completo" en semana 4; hasta ahí, todo con fixtures.

| Hito | Semana | Demo |
| --- | --- | --- |
| A. Mocks y shell | 1-2 | Los tres módulos renderizan en su ruta desde fixtures |
| B. Carga a diagnóstico | 3 | Un documento recorre carga y diagnóstico, incluido el caso sin texto |
| C. Diagnóstico a adaptación | 4-5 | Un hallazgo seleccionado genera una propuesta revisable |
| D. Flujo completo | 6-7 | Versión adaptada e informe |
| E. API real | 6+ | FastAPI y Gemini reemplazan fixtures sin cambiar el contrato |

## Dueños y reglas

Tabla de dueños por carpeta y reglas de trabajo en paralelo: `CONTRIBUTING.md`. Resumen:

- Cada persona toca solo su carpeta y su ruta. `types`, `fixtures`, `layout`, `globals.css` y `package.json` cambian por PR `contract` revisado por los otros dos.
- Una rama por tarea, PR chico, un reviewer, rebase diario.
- Cada módulo expone un componente que recibe datos por props; la página conecta fixture → componente.
- Nada de estado global antes del Hito B.

## Tareas para arrancar

Cada tarea es un PR de ~300 líneas máximo. Definition of Done: renderiza en su ruta desde fixtures, navegable por teclado, sin `any`/`unknown`/`as`, no toca carpetas ajenas.

**Tarea 0 (hecha):** tipos en `src/types`, fixtures en `src/fixtures`, shadcn/ui, rutas placeholder, este documento.

**F1 — carga y shell** (`/`, `src/features/upload/`)
1. Shell: reemplazar el boilerplate, header y nav con las tres rutas.
2. `UploadForm`: PDF (tipo y tamaño) + textarea. Texto pegado arma un `TextDocument` local; PDF devuelve `pdfDocument` con demora simulada.
3. Vista previa del texto extraído, metadatos, estado sin texto (`pdfWithoutText`), aviso de privacidad antes de analizar.

**F2 — diagnóstico** (`/diagnosis`, `src/features/diagnosis/`)
1. `DiagnosisSummary`: score, `N de M`, estado. Renderiza `diagnosisComplete`, `diagnosisPartial` y `diagnosisNotAnalyzable`.
2. `DimensionList`: seis dimensiones con cobertura; no evaluable explícito.
3. `FindingCard` y lista: severidad, origen, fragmento, evidencia, explicación, recomendación, ubicación.
4. Filtros por dimensión y severidad.

**F3 — adaptación y salida** (`/adaptation`, `src/features/adaptation/`)
1. `AdaptationCompare`: original vs propuesta.
2. Aceptar, editar (guarda `finalContent`), descartar, deshacer. Estado local con `useReducer`.
3. `AdaptationSummary` y versión adaptada con aceptadas y editadas.
4. Informe y exportación (Hito D).

## Decisiones pendientes

| Decisión | Cuándo | Quién |
| --- | --- | --- |
| Cómo viaja el `Document` entre rutas | Hito B | Coordinador del hito |
| Formato de exportación (texto o Markdown + copiar) | Hito D | F3 |
| Contrato HTTP definitivo | Semana 4, con backend | Dueño del contrato |

## Riesgos

- El PDF es el formato con menos señal de estructura: no inferir accesibilidad de la ausencia de hallazgos.
- La IA varía entre corridas: medir repetibilidad; nunca elevar solo IA a barrera.
- Las fórmulas de legibilidad valen para español; otro idioma marca esas reglas como no evaluables.
- No enviar datos sensibles de estudiantes a un servicio externo.

## Fuentes

- Brief: "Herramienta de accesibilidad para docentes" (innova.lab).
- "Escáner de accesibilidad para docentes: investigación inicial" (14/09/2026).
