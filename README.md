# had-scanner - VERA

Herramienta de accesibilidad para materiales educativos docentes (VERA).

## Estructura

```
had-scanner/
├── frontend/          # Vite + React + TypeScript + Tailwind
├── backend/           # FastAPI + Docker
├── docs/              # arquitectura, deploy, demo
└── .github/           # Configuración de la org
```

Documentación: [`docs/architecture.md`](./docs/architecture.md) · [`docs/deploy.md`](./docs/deploy.md)

## Stack

- **Frontend:** Vite, React, TypeScript, React Router, Tailwind CSS
- **Backend:** Docker, FastAPI (Python)
- **IA:** Gemini API (vía backend FastAPI)

## Primeros pasos (Frontend)

Requisitos: [Node.js](https://nodejs.org/) 20+ y pnpm vía Corepack (viene con Node). No uses npm/yarn.

```bash
corepack enable
cd frontend
pnpm install
pnpm dev:vite
```

- UI: [http://localhost:5173](http://localhost:5173)
- Creá `frontend/.env` con la API, por ejemplo:
  `VITE_API_BASE_URL=https://had-scanner-rk7u.onrender.com`
  (o `http://localhost:8000` si levantás el backend local).

Más detalle: [`frontend/README.md`](./frontend/README.md) y [`frontend/readme/`](./frontend/readme/). Nix/direnv es opcional y solo para quien lo use.

## Primeros pasos (Backend)

### Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Compose incluido)

> **Importante:** Docker Desktop debe estar abierto antes de usar los comandos de Docker.

### Cómo levantar el proyecto

```bash
cd backend
docker compose up --build
```

Documentación de la API: [http://localhost:8000/docs](http://localhost:8000/docs).

## Demo desplegada

El backend está desplegado y disponible para pruebas.

- **URL base de la API:** https://had-scanner-rk7u.onrender.com
- **Swagger UI:** https://had-scanner-rk7u.onrender.com/docs#/
- **Health check:** https://had-scanner-rk7u.onrender.com/health

Usá el Swagger UI para explorar los endpoints, revisar esquemas de request/response y ejecutar pedidos.

**Nota:** El servicio está en Render y puede tardar unos segundos en responder al primer request si estuvo inactivo.

## Demo de producto

[Recorrido de ~60 s](./docs/vera-demoday.webm)

## Licencia

Interno — e25-innovaLab
