import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Basic RAG Assistant", version="0.1.0")

origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/healthz")
def healthz():
    return {"ok": True}

from app.routes.ingest import router as ingest_router
from app.routes.ask import router as ask_router

app.include_router(ingest_router, prefix="/ingest", tags=["ingest"])
app.include_router(ask_router, prefix="/ask", tags=["ask"])
