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
pnpm dev:vite
```

- UI: http://localhost:5173
- **API real:** `VITE_API_BASE_URL` en `.env`, por ejemplo:
  - Render: `https://had-scanner-rk7u.onrender.com`
  - Local: `http://localhost:8000`

Reiniciá Vite si cambiás el `.env`.

## Scripts

| Script | Qué hace |
| --- | --- |
| `pnpm dev:vite` | Solo Vite |
| `pnpm build` | Build de producción |

## Docs

- [`readme/frontend-explicado.md`](./readme/frontend-explicado.md) — arquitectura de pantallas

## Contrato

- **API real:** FastAPI (`/materials`, `/analysis`, …) según `VITE_API_BASE_URL`.

## Opcional: Nix / direnv

Solo si usás NixOS u otro entorno con Nix. El camino canónico arriba (Node + Corepack) alcanza en Windows, macOS y Linux sin Nix.

El `shellHook` del flake exporta `pnpm_config_pm_on_fail=ignore` para usar el pnpm de nixpkgs (Corepack baja un binario que NixOS no ejecuta).

```bash
# con direnv + flake.nix en este directorio
direnv allow
pnpm install
pnpm dev:vite
```

Si ya falló antes por un pnpm en `~/.local/share/pnpm`, borrá esa carpeta una vez y reentrá al directorio.
