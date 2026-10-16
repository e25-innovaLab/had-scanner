# API simulada (Express + JSON)

Documentación del **contrato HTTP** que usa el frontend Vite hoy.
Para la arquitectura de pantallas y componentes, ver
[`frontend-explicado.md`](./frontend-explicado.md).

## Cómo funciona

- El browser llama `fetch("/api/...")` vía `src/lib/api/client.ts`.
- Vite (`:5173`) hace **proxy** de `/api` → Express mock (`:3001`).
- Los handlers viven en `mock/server.ts` y delegan en
  `src/lib/api/service.ts`.
- Persistencia: `data/vera-db.json`. Override: env `VERA_DB_PATH`.
- Seed al crear análisis: `src/lib/api/seed.ts` clona el catálogo de
  `src/lib/aula.ts`.

Arranque conjunto: `pnpm dev` (concurrently: mock + Vite).

### Poll de status (perf)

`GET .../status` **no escribe** en cada request: calcula el progreso
en memoria a partir de `analyzingStartedAt` y solo persiste al pasar a
`ready`.

`updateDb` tampoco reescribe el archivo si el JSON no cambió.

---

## Contrato (endpoints actuales)

Prefijo local: `/api`. El client puede anteponer
`VITE_API_BASE_URL` (vacío = mismo origen vía proxy).

| Método | Ruta | Uso en UI |
| --- | --- | --- |
| `POST` | `/api/analyses` | Cargar → crea análisis (`fileName`, `fileSize` o texto) |
| `GET` | `/api/analyses/:id` | Detalle del análisis |
| `GET` | `/api/analyses/:id/status` | Polling en Analizar (checklist por dimensión) |
| `GET` | `/api/analyses/:id/barriers` | Revisar (grupos + stats) |
| `GET` | `/api/analyses/:id/barriers?flat=1` | Adaptar / Detalle (lista plana) |
| `GET` | `/api/analyses/:id/barriers/:barrierId` | Detalle de una barrera |
| `POST` | `/api/analyses/:id/barriers/:barrierId/proposals` | Generar / regenerar propuesta IA (`variant` opcional) |
| `PUT` | `/api/analyses/:id/barriers/:barrierId/draft` | Guardar borrador |
| `POST` | `/api/analyses/:id/barriers/:barrierId/accept` | Aceptar (body opcional `{ draft }`) |
| `POST` | `/api/analyses/:id/barriers/:barrierId/discard` | Descartar |
| `POST` | `/api/analyses/:id/barriers/:barrierId/reopen` | Volver a editar |
| `POST` | `/api/analyses/:id/export` | Generar exportaciones simuladas |
| `GET` | `/api/analyses/:id/exports` | Listar exports + `appliedChanges` + `summary` |

Son del orden de **~12 endpoints**, alineados al PDF Front-Back.

---

## Cliente

```ts
// src/lib/api/client.ts
// base = import.meta.env.VITE_API_BASE_URL ?? ""
api.createAnalysis(...)
api.getStatus(analysisId)
api.listBarriers(analysisId)
// ...
```

Helpers de URL: `src/lib/api/url.ts` (`withAnalysisId`,
`resolveAnalysisId`, `storeAnalysisId`).

---

## Reemplazo por API real (FastAPI u otra)

Cuando el backend real esté listo:

| Acción | Detalle |
| --- | --- |
| Config | `VITE_API_BASE_URL=http://localhost:8000` (o el host real) |
| Borrar | `mock/`, `store.ts`, `service.ts`, `seed.ts` (lógica fake) |
| Conservar | `client.ts`, `types.ts`, `url.ts` y las pantallas |
| Paths | Ideal: mismos paths relativos (`/analyses`, `/analyses/:id/status`, …). Si el backend no usa prefijo `/api`, el base URL o el client lo absorben. |
| Scripts | Quitar `dev:mock` / concurrently; `pnpm dev` solo Vite |

### Mapeo sugerido (simulada → real)

| Simulada (Vite + Express) | Real (ejemplo FastAPI) |
| --- | --- |
| `POST /api/analyses` | `POST /analyses` (multipart PDF real) |
| `GET /api/analyses/:id/status` | `GET /analyses/:id/status` (job/worker) |
| `GET /api/analyses/:id/barriers` | `GET /analyses/:id/barriers` |
| `POST .../proposals` | `POST .../proposals` (Gemini u otro LLM) |
| `PUT .../draft` | `PUT .../draft` |
| `POST .../accept\|discard\|reopen` | mismos verbos |
| `POST .../export` + `GET .../exports` | cola de export + URLs firmadas (S3/MinIO) |

Las optimizaciones del JSON local **no** se portan al front: el
backend decide cómo persistir y cuándo escribir.

### Diferencias esperadas respecto al mock

- Upload con **archivo real**, no solo nombre/tamaño.
- Barreras salen del análisis del documento, no del seed de `aula.ts`.
- Propuestas vienen del LLM; los `variants` del seed dejan de aplicar
  o se regeneran en servidor.
- Auth, errores y códigos HTTP más ricos.

---

## Archivos ancla

1. `src/lib/api/client.ts`
2. `src/lib/api/service.ts` / `store.ts` / `seed.ts`
3. `mock/server.ts`
4. [`frontend-explicado.md`](./frontend-explicado.md)
