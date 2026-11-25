# Deploy

## Backend (Render)
- Base: https://had-scanner-rk7u.onrender.com
- Docs: https://had-scanner-rk7u.onrender.com/docs
- Health: https://had-scanner-rk7u.onrender.com/health

Env típicos (Render): `DATABASE_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET=vera-materials`,
CORS con el origen de Vercel + `http://localhost:5173`.

## Frontend (Vercel)
- Root Directory: `frontend`
- Production branch: `main`
- Build: pnpm (`pnpm install` / `pnpm build`)
- Env: `VITE_API_BASE_URL=https://had-scanner-rk7u.onrender.com`

## Local contra Render

En `frontend/.env`:

```bash
VITE_API_BASE_URL=https://had-scanner-rk7u.onrender.com
```

Luego: `pnpm dev:vite`.

## Supabase (datos; lo usa Render, no Vercel)
- Postgres: historial (materiales, análisis, barreras, propuestas, PDF finalizados)
- Storage: bucket privado `vera-materials`
  - originales: `materials/<hash>/…`
  - adaptados: `finalized/<material_id>/…`
- Retención de PDF adaptados (Render): `FINALIZED_RETENTION_DAYS`,
  `FINALIZED_RETENTION_CLEANUP_SECONDS`
- Soft-delete de usuario: `material.status=deleted` y
  `finalized_document.status=deleted` (se ocultan en la UI).
  - Adaptados (`finalized/<material_id>/…`): purge manual o retención TTL.
  - Originales (`materials/<hash>/…`): sin TTL automático; solo purge manual.
- Al purgar Storage a mano: no borrar `materials/<hash>/…` si otro material
  activo reutiliza el mismo hash (re-subida del mismo PDF tras soft-delete).
  Los adaptados van por `finalized/<material_id>/…` y no colisionan.
