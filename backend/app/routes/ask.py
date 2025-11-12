from __future__ import annotations
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from app.services.embed import embed_one
from app.services.retrieve import top_k_chunks
from app.services.synthesize import synthesize_answer

router = APIRouter()

class AskRequest(BaseModel):
    query: str
    top_k: int = 5
    threshold: float = 0.25

class AskResponse(BaseModel):
    answer: str
    citations: List[str]
    confidence: str

def _extract_citations(text: str) -> List[str]:
    import re
    ids = re.findall(r"\[doc:([^\]\s]+)\]", text)
    seen, out = set(), []
    for cid in ids:
        if cid not in seen:
            seen.add(cid)
            out.append(cid)
    return out

def _confidence_from_sims(matches: List[Dict[str, Any]]) -> str:
    if not matches:
        return "low"
    mx = max(float(m.get("similarity", 0.0)) for m in matches)
    if mx >= 0.80:
        return "high"
    if mx >= 0.55:
        return "medium"
    return "low"

@router.post("", response_model=AskResponse)
def ask(body: AskRequest) -> AskResponse:
    try:
        q_emb = embed_one(body.query)
        hits = top_k_chunks(q_emb, k=body.top_k, threshold=body.threshold)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retrieval failed: {e}")

    try:
        answer_text = synthesize_answer(body.query, hits)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {e}")

    citations = _extract_citations(answer_text)
    cleaned = answer_text
    for cid in citations:
        cleaned = cleaned.replace(f"[doc:{cid}]", "").strip()

    confidence = _confidence_from_sims(hits)
    return AskResponse(answer=cleaned, citations=citations, confidence=confidence)
