# had-scanner

Herramienta de accesibilidad para documentos docentes.

## Estructura

```
docs-scanner/
├── frontend/          # Next.js + TypeScript + Tailwind CSS
├── backend/           # FastAPI + Docker
├── docs/              # Documentación y evidencia de investigación
└── .github/           # Configuración de la org
```

## Stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS
- **Backend:** Docker, FastAPI (Python)
- **IA:** Gemini API

## Getting Started (Frontend)

```bash
cd frontend
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Getting Started (Backend)

### Requerimientos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Docker Compose está incluido en las versiones actuales de Docker Desktop.

> **Importante:** Docker Desktop debe estar abierto y ejecutándose antes de utilizar los comandos de Docker.

### Ejecutanto el proyecto

```bash
cd backend
docker compose up --build
```

Documentación de la API [http://localhost:8000/docs](http://localhost:8000/docs).

## Licencia

Interno — e25-innovaLab
