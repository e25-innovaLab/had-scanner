# Architecture (VERA / had-scanner)

## Stack
- Frontend: Vite + React + TypeScript + Tailwind (`frontend/`)
- Backend: FastAPI + SQLAlchemy + Alembic + Postgres (`backend/`)
- IA: Google Gemini (análisis y propuestas de adaptación)
- Persistencia: Postgres (Supabase) + Storage bucket `vera-materials`
- Deploy: API en Render, front en Vercel (Production → `main`)

## Flujo del frontend
El home arranca siempre contra la API real (`VITE_API_BASE_URL`). El usuario sube un PDF, revisa barreras/propuestas y genera un PDF adaptado. El progreso del análisis en curso vive en la sesión del navegador; materiales y PDF finalizados quedan en el servidor (historial en home).

## Dónde vive qué
- UI / rutas: `frontend/src/pages`, `frontend/src/components`
- Cliente HTTP: `frontend/src/lib/api/client.ts`
- API: `backend/app/routers`, servicios en `backend/app/services`
- Gemini: `backend/app/ai/`
- PDFs durables: `backend/app/utils/object_storage.py`
  - originales: `storage://materials/<hash>/…`
  - adaptados: `storage://finalized/<material_id>/…`

## Docs relacionadas
- Deploy y env: [deploy.md](./deploy.md)
- UI detalle: `frontend/readme/`
