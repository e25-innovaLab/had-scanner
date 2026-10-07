# Had Scanner - Backend

Backend API for analyzing teaching materials and providing accessibility diagnostics.

## Stack

- Python
- FastAPI
- Uvicorn
- Pydantic
- SQLAlchemy
- Alembic
- PostgreSQL
- Docker

## Run

Make sure [Docker Desktop](https://www.docker.com/products/docker-desktop/) is installed and running.

Start the project for the first time:

```bash
docker compose up --build
```

For subsequent executions:

```bash
docker compose up
```

To run the services in the background:

```bash
docker compose up -d
```

The backend will be available at [http://localhost:8000](http://localhost:8000).

API documentation: [http://localhost:8000/docs](http://localhost:8000/docs).

Health check: [http://localhost:8000/health](http://localhost:8000/health).

### Database migrations

The project uses PostgreSQL and Alembic for database migrations.

After starting the services, apply the existing migrations:

```bash
docker compose run --rm backend alembic upgrade head
```

To create a new migration after modifying the database models:

```bash
docker compose run --rm backend alembic revision --autogenerate -m "description of changes"
```

Then apply it:

```bash
docker compose run --rm backend alembic upgrade head
```

> Do not run `alembic init alembic`, as the Alembic configuration and migration files are already included in the repository.

## Structure

```text
app/
  ai/             AI and Gemini integration
  core/           Application configuration and shared components
  database/       Database connection and session management
  models/         SQLAlchemy database models
  repositories/   Database access and queries
  routers/        API endpoints and route definitions
  rules/          Accessibility rules and analysis logic
  schemas/        Pydantic schemas for API requests and responses
  services/       Application and business logic
  utils/          Shared utility functions
  main.py         FastAPI application and API configuration

alembic/
  versions/       Database migration files
  env.py          Alembic migration configuration

data/             Uploaded files and application data

tests/            Backend tests

docker-compose.yml    Docker services configuration
Dockerfile            Backend Docker image configuration
requirements.txt      Python project dependencies
```

Project documentation and API contracts: `../docs/`.
