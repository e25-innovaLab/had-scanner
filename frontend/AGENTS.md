# Frontend: Vite + React + TypeScript

## Objetivo
App VERA en Vite + React + TypeScript (producto actual en `frontend/`).

## Docs
- Contrato mock (histórico): `readme/api-simulada.md`
- Arquitectura UI: `readme/frontend-explicado.md`

## App a correr
- `frontend/`: Vite + React + TS
- Demo: mock in-browser (`pnpm dev:vite`); Express `:3001` opcional (`pnpm dev`)
- API real: `VITE_API_BASE_URL` (local `:8000` o `https://had-scanner-rk7u.onrender.com`)
- Flujo: Cargar → Analizar → Revisar → Adaptar → Detalle → Resultado

## Preservar
Mismo UX; Demo vía `service.ts` / localStorage; API real vía FastAPI.
