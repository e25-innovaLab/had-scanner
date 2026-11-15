# Architecture (VERA / had-scanner)

## Stack
- Frontend: Vite + React + TypeScript + Tailwind (`frontend/`)
- Backend: FastAPI + SQLAlchemy + Alembic + Postgres (`backend/`)
- IA: Google Gemini (análisis y propuestas de adaptación)
- Persistencia: Postgres (Supabase) + Storage bucket `vera-materials`
- Deploy: API en Render, front en Vercel (Production → `main`)

## Flujos del frontend
| Modo | Qué usa | Dónde |
|------|---------|--------|
| Demo (mock) | `service.ts` + localStorage | Home → “Demo (mock)” |
| API real | FastAPI vía `VITE_API_BASE_URL` | Home → “API real” (PDF) |

## Dónde vive qué
- UI / rutas: `frontend/src/pages`, `frontend/src/components`
- Cliente HTTP: `frontend/src/lib/api/client.ts`
- Demo store: `frontend/src/lib/api/store-browser.ts`
- API: `backend/app/routers`, servicios en `backend/app/services`
- Gemini: `backend/app/ai/`
- PDFs durables: `backend/app/utils/object_storage.py` → `storage://materials/<hash>/…`

## Docs relacionadas
- Deploy y env: [deploy.md](./deploy.md)
- Kickoff histórico: [archive/kickoff/](./archive/kickoff/)
- UI detalle: `frontend/readme/`