from pydantic import BaseModel
from typing import Optional

class IngestResult(BaseModel):
    document_id: str
    name: str                # NEW
    original_name: str       # NEW
    pages: Optional[int]
    chunks: int
    uploaded_at: str         # NEW (ISO timestamp)
