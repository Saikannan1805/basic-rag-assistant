import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.ask import router as ask_router
from app.routes.ingest import router as ingest_router
from app.routes.library import router as library_router

app = FastAPI()

allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ask_router, prefix="/ask")
app.include_router(ingest_router, prefix="/ingest")
app.include_router(library_router, prefix="/library")
