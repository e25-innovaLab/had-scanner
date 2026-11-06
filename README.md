# had-scanner

Herramienta de accesibilidad para documentos docentes (VERA).

## Estructura

```
had-scanner/
├── frontend/          # Vite + React + TypeScript + Tailwind (migración en curso)
├── backend/           # FastAPI + Docker
├── docs/              # Documentación y evidencia de investigación
└── .github/           # Configuración de la org
```

## Stack

- **Frontend:** Vite, React, TypeScript, React Router, Tailwind CSS, pnpm  
  El código en `main` aún puede incluir el Next.js legacy. La implementación vigente está en la rama `feat/frontend-flujo-vera` hasta el merge.
- **Backend:** Docker, FastAPI (Python)
- **IA:** Gemini API (planificado; el front usa mock local por ahora)

## Getting Started (Frontend)

Requisitos: [Node.js](https://nodejs.org/) 20+ y pnpm vía Corepack (viene con Node). No uses npm/yarn.

Mientras no se mergee el Vite a `main`, usá la rama del flujo VERA:

```bash
git fetch origin
git checkout feat/frontend-flujo-vera
cd frontend
corepack enable
pnpm install
pnpm dev
```

- UI: [http://localhost:5173](http://localhost:5173)
- Mock API: [http://localhost:3001](http://localhost:3001) (proxied como `/api` desde Vite)

No uses el frontend Next de `main` (`npm run dev` / puerto 3000).

## Getting Started (Backend)

## Deployed Demo

The backend is deployed and available for testing.

- **API Base URL:** https://had-scanner.onrender.com
- **Swagger UI:** https://had-scanner.onrender.com/docs#/
- **Health Check:** https://had-scanner.onrender.com/health

Use the Swagger UI to explore the available endpoints, review request and response schemas, and execute API requests.

**Note:** The service is hosted on Render and may take a few moments to respond to the first request if it has been inactive.

---

### Requerimientos para ejecutar en local

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Compose incluido)

> **Importante:** Docker Desktop debe estar abierto antes de usar los comandos de Docker.

### Ejecutando el proyecto (en local)

```bash
cd backend
docker compose up --build
```

Documentación de la API: [http://localhost:8000/docs](http://localhost:8000/docs).

Hoy el backend cubre upload/listado de materiales; el flujo completo de análisis en el front corre contra el mock hasta integrar FastAPI.

## Licencia

Interno — e25-innovaLab
