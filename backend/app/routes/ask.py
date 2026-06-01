import json
import re
from typing import List, Dict, Tuple
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.retrieve import retrieve_relevant_chunks
from app.services.synthesize import synthesize_answer, synthesize_stream

router = APIRouter()

_SUMMARIZE_RE = re.compile(
    r"^\s*(summarize|summarise|give\s+(me\s+)?a\s+summary(\s+of)?|explain|describe)\b",
    re.IGNORECASE,
)
_FILENAME_RE = re.compile(
    r"\S+\.(txt|pdf|doc|docx|csv|json|py|js|ts|md)\b", re.IGNORECASE
)

def _prepare_retrieval(query: str, req_top_k: int, req_threshold: float) -> Tuple[str, int, float]:
    """Returns (retrieval_query, top_k, threshold) adjusted for query intent."""
    is_summary = bool(_SUMMARIZE_RE.match(query))
    retrieval_q = _FILENAME_RE.sub("", query).strip()
    if is_summary:
        retrieval_q = _SUMMARIZE_RE.sub("", retrieval_q).strip()
    if not retrieval_q or len(retrieval_q.split()) < 2:
        retrieval_q = "main content key points overview summary"
    if is_summary:
        return retrieval_q, 15, 0.1
    return retrieval_q, req_top_k, req_threshold


def _compute_relevance(chunks: List[Dict]) -> Tuple[str, float]:
    if not chunks:
        return "low", 0.0
    sims = [c.get("similarity", 0.0) for c in chunks]
    avg_sim = sum(sims) / len(sims)
    if avg_sim >= 0.82 and len(chunks) >= 2:
        level = "strong"
    elif avg_sim >= 0.72:
        level = "partial"
    else:
        level = "low"
    return level, round(avg_sim, 4)

class AskRequest(BaseModel):
    query: str
    top_k: int = 5
    threshold: float = 0.2
    conversation: List[Dict[str, str]] = []
    document_ids: List[str] = []

@router.post("")
async def ask(req: AskRequest):
    retrieval_query, top_k, threshold = _prepare_retrieval(req.query, req.top_k, req.threshold)
    try:
        chunks = retrieve_relevant_chunks(
            query=retrieval_query,
            top_k=top_k,
            threshold=threshold,
            document_ids=req.document_ids or None,
        )
    except Exception as e:
        raise HTTPException(500, f"Retrieval failed: {e}")

    try:
        answer = synthesize_answer(req.query, chunks, conversation=req.conversation)
    except Exception as e:
        raise HTTPException(500, f"Generation failed: {e}")

    relevance, score = _compute_relevance(chunks)

    citations = []
    seen = set()
    for c in chunks:
        did = c.get("document_id")
        if did and did not in seen:
            seen.add(did)
            citations.append(did)

    return {
        "answer": answer,
        "citations": citations,
        "relevance": relevance,
        "score": score,
    }


@router.post("/stream")
async def ask_stream(req: AskRequest):
    retrieval_query, top_k, threshold = _prepare_retrieval(req.query, req.top_k, req.threshold)
    try:
        chunks = retrieve_relevant_chunks(
            query=retrieval_query,
            top_k=top_k,
            threshold=threshold,
            document_ids=req.document_ids or None,
        )
    except Exception as e:
        async def error_gen():
            yield f"data: {json.dumps({'type': 'error', 'message': f'Retrieval failed: {e}'})}\n\n"
        return StreamingResponse(error_gen(), media_type="text/event-stream")

    relevance, score = _compute_relevance(chunks)

    citations = []
    seen = set()
    for c in chunks:
        did = c.get("document_id")
        if did and did not in seen:
            seen.add(did)
            citations.append(did)

    async def event_gen():
        full_answer: list[str] = []
        try:
            async for token in synthesize_stream(req.query, chunks, conversation=req.conversation):
                full_answer.append(token)
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            return

        answer_text = "".join(full_answer).lower()
        final_relevance = relevance
        final_score = score
        if "i don't know" in answer_text or "don't have" in answer_text:
            final_relevance = "not_found"
            final_score = 0.0

        yield f"data: {json.dumps({'type': 'meta', 'citations': citations, 'relevance': final_relevance, 'score': final_score})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream")
