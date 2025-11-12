from pydantic import BaseModel, Field
from typing import List, Optional

class IngestUrl(BaseModel):
    url: str
    name: Optional[str] = None

class IngestResult(BaseModel):
    document_id: str
    chunks: int
    pages: int | None = None

class AskRequest(BaseModel):
    query: str
    top_k: int = Field(default=8, ge=1, le=20)
    threshold: float = Field(default=0.25, ge=0.0, le=1.0)

class Citation(BaseModel):
    doc: str
    page: int | None = None
    snippet: str

class AskResponse(BaseModel):
    answer: str
    citations: List[Citation]
    confidence: str  # high | medium | low
