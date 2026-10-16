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

```bash
cd frontend
pnpm install
pnpm dev
```

- UI: [http://localhost:5173](http://localhost:5173)
- Mock API: [http://localhost:3001](http://localhost:3001) (proxied como `/api` desde Vite)

Más detalle: [`frontend/README.md`](./frontend/README.md) y [`frontend/docs/`](./frontend/docs/).

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

Hoy el backend cubre upload/listado de materiales; el flujo completo de análisis en el front corre contra el mock hasta integrar FastAPI.

## Licencia

Interno — e25-innovaLab
