# VERA frontend (Vite + React + TypeScript)

SPA del flujo VERA (Vite + React + TypeScript).

## Desarrollo

```bash
pnpm install
pnpm dev
```

- UI: http://localhost:5173
- Mock API: http://localhost:3001 (proxied as `/api` desde Vite)

## Scripts

| Script | Qué hace |
| --- | --- |
| `pnpm dev` | Mock Express + Vite |
| `pnpm dev:vite` | Solo Vite |
| `pnpm dev:mock` | Solo mock |
| `pnpm build` | Build de producción |

## Docs

- [`docs/api-simulada.md`](./docs/api-simulada.md) — contrato HTTP del mock
- [`docs/frontend-explicado.md`](./docs/frontend-explicado.md) — arquitectura de pantallas

## Contrato

Endpoints `/api/analyses…` (ver docs). Persistencia del mock: `data/vera-db.json`.
