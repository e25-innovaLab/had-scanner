# VERA frontend (Vite + React + TypeScript)

SPA del flujo VERA (Vite + React + TypeScript).

## Requisitos

- [Node.js](https://nodejs.org/) **20+** (LTS recomendado)
- **pnpm** vía [Corepack](https://nodejs.org/api/corepack.html) (incluido con Node)

No uses npm ni yarn: el `preinstall` lo bloquea. La versión de pnpm la fija `packageManager` en `package.json` (Corepack la descarga sola).

## Desarrollo

```bash
corepack enable
cd frontend   # si todavía no estás acá
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

## Opcional: Nix / direnv

Solo si usás NixOS u otro entorno con Nix. El camino canónico arriba (Node + Corepack) alcanza en Windows, macOS y Linux sin Nix.

```bash
# con direnv + flake.nix en este directorio
direnv allow
pnpm install
pnpm dev
```
