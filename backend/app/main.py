
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.materials import router as materials_router
from app.routers import analysis, proposals, finalization, adaptations, barriers

app = FastAPI(
    title="API de Accesibilidad Docente",
    description="API para el análisis de accesibilidad de materiales educativos.",
    version="0.1.0",
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
app.include_router(adaptations.router)
app.include_router(finalization.router)
app.include_router(barriers.router)
