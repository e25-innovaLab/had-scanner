
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.session import SessionLocal
from app.repositories import analysis_repository
from app.routers.materials import router as materials_router
from app.routers import analysis, proposals, finalization, adaptations, barriers

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Al arrancar, las tareas en background de la instancia anterior ya murieron.
    db = SessionLocal()
    try:
        count = analysis_repository.fail_interrupted_analyses(db=db)
        if count:
            logger.warning(
                "Marked %s interrupted analyses as failed on startup",
                count,
            )
    except Exception:
        logger.exception("Could not clean up interrupted analyses on startup")
    finally:
        db.close()
    yield


app = FastAPI(
    title="API de Accesibilidad Docente",
    description="API para el análisis de accesibilidad de materiales educativos.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://had-scanner.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "status": "ok"
    }


app.include_router(materials_router)
app.include_router(analysis.router)
app.include_router(analysis.analysis_by_id_router)
app.include_router(proposals.router)
app.include_router(finalization.router)
app.include_router(adaptations.router)
app.include_router(barriers.router)
