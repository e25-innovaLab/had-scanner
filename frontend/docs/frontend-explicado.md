# VERA Frontend — Explicado fácil

Este documento describe **cómo está armado hoy** el frontend Vite +
React + TypeScript: rutas con React Router, componentes, datos vía API
simulada (Express) y cómo se sincronizan las pantallas.

Contrato HTTP (endpoints, persistencia JSON, seed): ver
[`api-simulada.md`](./api-simulada.md).

---

## Premisa clave (estado actual del repo)

En el PDF de arquitectura ideal, **la verdad vive en el backend (DB)** y
viaja por URL con un `analysisId`.

Hoy el frontend habla con una **API simulada** (Express + JSON en
disco). La UI no importa el catálogo de barreras directo: hace `fetch`
a través de `src/lib/api/client.ts`.

| Ideal (PDF) | Este repo (hoy) |
| --- | --- |
| `analysisId` en la URL | Sí — query `?analysisId=` (también en `sessionStorage` como respaldo de nav) |
| Datos en PostgreSQL | JSON en `data/vera-db.json` |
| Decisiones / borradores en DB | Persistidos vía `/api/analyses/...` |
| `POST` / `GET` a la API | `client.ts` → proxy Vite → `mock/server.ts` |

`src/lib/aula.ts` es el **seed** (catálogo mock) que clona el servidor
al crear un análisis. No es la fuente de verdad en runtime de Revisar /
Adaptar / Detalle.

`src/lib/barrier-session.ts` quedó como legado; el flujo principal ya
no lo usa.

---

## Conceptos clave: `analysisId` + `barrierId`

1. **`analysisId`** — hilo del flujo completo. Se crea en Cargar
   (`POST /api/analyses`), viaja en la URL y lo preservan `FlowNav` /
   `AnalysisFlowFooter` (`src/lib/api/url.ts`).
2. **`barrierId`** — ítem dentro del análisis
   (`comprension-0`, `estructura-1`, …). Une Adaptar ↔ Detalle.

```text
/analisis/detalle?analysisId=...&origen=ia&desde=generar&barrera=comprension-0&intentos=4
```

---

## Mapa del proyecto

```text
frontend/
├── index.html
├── vite.config.ts              # alias @/, proxy /api → :3001
├── mock/
│   └── server.ts               # API simulada (Express)
├── data/
│   └── vera-db.json            # persistencia del mock (gitignored)
├── src/
│   ├── main.tsx
│   ├── App.tsx                 # BrowserRouter + Routes
│   ├── index.css
│   ├── layouts/                # root, home, analisis
│   ├── pages/                  # pantallas (inicio + flujo)
│   ├── components/
│   │   ├── aula/               # UI del flujo
│   │   ├── shell/              # Header, navs
│   │   └── ui/                 # shadcn / Base UI
│   └── lib/
│       ├── api/                # client, types, store, seed, service
│       ├── aula.ts             # seed + constantes de UI
│       ├── barrier-session.ts  # legado (sin uso en el flujo)
│       └── utils.ts
└── docs/
    ├── frontend-explicado.md   # este archivo
    └── api-simulada.md         # contrato HTTP
```

**Stack:** Vite + React 19 + TypeScript + React Router + Tailwind 4 + pnpm.

---

## Navegación (React Router)

Las URLs son las mismas que en el producto Next; el árbol se define en
`src/App.tsx` con layouts anidados.

| URL | Componente principal |
| --- | --- |
| `/` | Home + `TutorialDialog` |
| `/ayuda`, `/configuracion` | Ayuda / `SettingsForm` |
| `/analisis/cargar` | `CargarStep` + `UploadPanel` |
| `/analisis/analizar` | `AnalysisChecklist` |
| `/analisis/revisar` | `RevisarStep` + `BarrierList` |
| `/analisis/adaptar` | `AdaptBoard` |
| `/analisis/detalle` | `DetailEditor` |
| `/analisis/resultado` | `ResultadoStep` + `DownloadList` |

Cómo se navega:

1. `<Link to=...>` / `FlowNav` / `AnalysisFlowFooter` (agregan `analysisId`).
2. `navigate(...)` (React Router) al ir a Detalle con query params.
3. `useSearchParams()` en pasos del flujo y en Detalle.

---

## Flujo paso a paso (hoy)

### 0 — Inicio (`/`)

CTA a Cargar; tutorial con `FLOW_STEPS`.

### 1 — Cargar (`/analisis/cargar`)

- `UploadPanel` valida archivo o texto (cliente).
- **Siguiente: Analizar** llama `api.createAnalysis({ fileName, fileSize })`.
- El binario/texto **no se analiza de verdad**: solo metadatos + seed de
  barreras. Cualquier PDF válido alcanza para pasar el paso.
- Guarda `analysisId` y navega a
  `/analisis/analizar?analysisId=...`.

### 2 — Analizar (`/analisis/analizar`)

- `AnalysisChecklist` hace **polling** a `GET .../status`.
- Cuando `status === "ready"`, muestra “Listo” y **deja de pollar**.
- **No auto-navega:** el docente avanza con **Siguiente: Revisar**.

### 3 — Revisar (`/analisis/revisar`)

- `BarrierList` → `GET .../barriers` (grupos + stats).
- Solo lectura del diagnóstico; footer a Adaptar.

### 4 — Adaptar (`/analisis/adaptar`)

- `AdaptBoard` → `GET .../barriers?flat=1`.
- Generar IA → `POST .../proposals` (+ overlay) → Detalle.
- Aceptar / descartar / reopen → endpoints homónimos.
- Links a Detalle llevan `analysisId` + `barrera` (+ `origen`, `intentos`).

### 5 — Detalle (`/analisis/detalle`)

- Carga barreras por API; draft con `PUT .../draft` (p. ej. on blur).
- Variantes IA → `POST .../proposals` con `variant`.
- Guardar / descartar / reopen → API.
- Query: `barrera`, `origen`, `desde`, `intentos`, `analysisId`.

### 6 — Resultado (`/analisis/resultado`)

- `POST .../export` + `GET .../exports`.
- Lista de cambios según barreras `accepted`.
- Descarga aún es un `.txt` blob de muestra en el cliente.

---

## Capa `src/lib/api/` (qué queda vs qué se tira)

| Pieza | Rol hoy | Con API real |
| --- | --- | --- |
| `client.ts` | `fetch` tipado | **Se queda**; `VITE_API_BASE_URL` → FastAPI |
| `types.ts` / `url.ts` | Contrato + helpers de URL | **Se quedan** (ajustando tipos si hace falta) |
| `store.ts`, `service.ts`, `seed.ts` | JSON + lógica fake | **Se borran** |
| `mock/server.ts` | Express | **Se borra** |

Detalle del contrato y mapeo a backend: [`api-simulada.md`](./api-simulada.md).

---

## `aula.ts` (seed + UI)

Sigue exportando:

- Navegación: `HOME_LINKS`, `FLOW_STEPS`, `DIMENSIONS`
- Comportamiento UI: `AI_ATTEMPTS_PER_BARRIER`, timeouts de overlays
- Catálogo mock: `BARRIERS`, `DETAIL_BARRIERS`, `SUGGESTIONS` → consumido
  por `seed.ts` / `service.ts`, **no** por los componentes del flujo
- Helpers de legibilidad: `countWords`, `readingLabel`, …

---

## Componentes (resumen)

### Shell

| Componente | Notas |
| --- | --- |
| `AppHeader`, `HomeNav`, `SideNav` | Nav de inicio |
| `FlowNav` | Pasos del flujo; preserva `analysisId` |
| `IaFab` | Montado en `RootLayout` |

### Aula

| Componente | Datos |
| --- | --- |
| `UploadPanel` / `CargarStep` | Crea análisis por API |
| `AnalysisChecklist` | Poll status; espera botón |
| `BarrierList` | GET barriers |
| `AdaptBoard` | flat barriers + proposals / decisions |
| `DetailEditor` | draft / proposals / accept |
| `DownloadList` / `ResultadoStep` | export |
| `AnalysisFlowFooter` | Footer con `analysisId` |
| `MissingAnalysis` | Sin `analysisId` → CTA a Cargar |

### Diagrama Adaptar ↔ Detalle (hoy)

```text
                 POST /api/analyses  →  analysisId
                              │
              seed (aula.ts) en el servidor mock
                              │
         AdaptBoard  ←── GET/POST /api/... ──→  DetailEditor
                              │
                    query params en URL
              (analysisId, barrera, origen, desde, intentos)
```

---

## Cuando haya una API real (FastAPI u otra)

1. Apuntar `VITE_API_BASE_URL` al host del backend.
2. Eliminar `mock/` y la lógica de store/seed local.
3. Mantener pantallas y `client.ts` si el contrato de paths/body se
   conserva (o adaptar solo el client).
4. El upload real debería enviar el archivo (multipart), no solo
   `fileName` / `fileSize`.
5. Optimizaciones del JSON local (no escribir en cada poll) **no se
   trasladan** al front: son del mock.

---

## Resumen

1. **React Router** + layouts en `src/layouts/`.
2. **Verdad del flujo** en la API simulada + `analysisId` en URL.
3. **Pages delgadas**, lógica en componentes de `aula/`.
4. **`aula.ts`** = seed y constantes; no estado de runtime del flujo.
5. **Contrato HTTP** documentado en [`api-simulada.md`](./api-simulada.md).

---

## Archivos ancla

1. `docs/api-simulada.md` — endpoints
2. `src/lib/api/client.ts` — llamadas del front
3. `src/lib/aula.ts` — seed / constantes
4. `src/components/aula/adapt-board.tsx` / `detail-editor.tsx`
5. `src/App.tsx` + `src/layouts/analisis-layout.tsx` + `flow-nav.tsx`
