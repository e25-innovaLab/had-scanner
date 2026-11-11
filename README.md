# had-scanner - VERA

Herramienta de accesibilidad para documentos docentes (VERA).

## Estructura

```
had-scanner/
├── frontend/          # Vite + React + TypeScript + Tailwind
├── backend/           # FastAPI + Docker
├── docs/              # Documentación y evidencia de investigación
└── .github/           # Configuración de la org
```

## Stack

- **Frontend:** Vite, React, TypeScript, React Router, Tailwind CSS
- **Backend:** Docker, FastAPI (Python)
- **IA:** Gemini API (vía backend FastAPI)

## Getting Started (Frontend)

Requisitos: [Node.js](https://nodejs.org/) 20+ y pnpm vía Corepack (viene con Node). No uses npm/yarn.

```bash
corepack enable
cd frontend
pnpm install
pnpm dev:vite
```

- UI: [http://localhost:5173](http://localhost:5173)
- **Demo (mock):** corre en el browser (localStorage). No hace falta el Express en `:3001`.
- **API real (local o Render):** creá `frontend/.env` con, por ejemplo:
  `VITE_API_BASE_URL=https://had-scanner-rk7u.onrender.com`
  (o `http://localhost:8000` si levantás el backend local).

`pnpm dev` también arranca un mock Express opcional en `:3001` (proxy Vite `/api`); el camino Demo del SPA ya no depende de él.

Más detalle: [`frontend/README.md`](./frontend/README.md) y [`frontend/readme/`](./frontend/readme/). Nix/direnv es opcional y solo para quien lo use.

## Getting Started (Backend)

### Requerimientos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Compose incluido)

> **Importante:** Docker Desktop debe estar abierto antes de usar los comandos de Docker.

### Ejecutando el proyecto

```bash
cd backend
docker compose up --build
```

Documentación de la API: [http://localhost:8000/docs](http://localhost:8000/docs).

El camino **API real** (PDF) usa FastAPI async; el camino **Demo** del front usa el mock in-browser (texto/archivo).

## Deployed Demo

The backend is deployed and available for testing.

- **API Base URL:** https://had-scanner-rk7u.onrender.com
- **Swagger UI:** https://had-scanner-rk7u.onrender.com/docs#/
- **Health Check:** https://had-scanner-rk7u.onrender.com/health

Use the Swagger UI to explore the available endpoints, review request and response schemas, and execute API requests.

**Note:** The service is hosted on Render and may take a few moments to respond to the first request if it has been inactive.

## Licencia

Interno — e25-innovaLab
