# had-scanner

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
- **IA:** Gemini API (planificado; el front usa mock local por ahora)

## Getting Started (Frontend)

Requisitos: [Node.js](https://nodejs.org/) 20+ y pnpm vía Corepack (viene con Node). No uses npm/yarn.

```bash
corepack enable
cd frontend
pnpm install
pnpm dev
```

- UI: [http://localhost:5173](http://localhost:5173)
- Mock API: [http://localhost:3001](http://localhost:3001) (proxied como `/api` desde Vite)

Más detalle: [`frontend/README.md`](./frontend/README.md) y [`frontend/docs/`](./frontend/docs/). Nix/direnv es opcional y solo para quien lo use.

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

El camino **API real** (PDF) usa FastAPI async; el camino **Demo** del front sigue contra el mock local (texto/archivo).

## Deployed Demo

The backend is deployed and available for testing.

- **API Base URL:** https://had-scanner.onrender.com
- **Swagger UI:** https://had-scanner.onrender.com/docs#/
- **Health Check:** https://had-scanner.onrender.com/health

Use the Swagger UI to explore the available endpoints, review request and response schemas, and execute API requests.

**Note:** The service is hosted on Render and may take a few moments to respond to the first request if it has been inactive.

## Licencia

Interno — e25-innovaLab
