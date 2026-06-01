from typing import List, Dict, Any, Optional

from app.services.embed import embed_texts
from app.db.supabase import db


def top_k_chunks(
    query_embedding: List[float],
    k: int = 8,
    threshold: float = 0.25,
    document_ids: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    if len(query_embedding) != 1536:
        raise ValueError(f"Expected 1536-dim embedding, got {len(query_embedding)}")

    fetch_count = k * 4 if document_ids else k
    resp = db.rpc(
        "match_chunks",
        {
            "query_embedding": query_embedding,
            "match_count": fetch_count,
            "similarity_threshold": threshold,
        },
    ).execute()

    if getattr(resp, "error", None):
        raise RuntimeError(f"match_chunks RPC failed: {resp.error}")

    chunks = resp.data or []

    if document_ids:
        id_set = set(document_ids)
        chunks = [c for c in chunks if c.get("document_id") in id_set]

    return chunks[:k]


def retrieve_relevant_chunks(
    query: str,
    top_k: int = 8,
    threshold: float = 0.25,
    document_ids: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    q = (query or "").strip()
    if not q:
        return []

    query_embedding = embed_texts([q])[0]
    return top_k_chunks(
        query_embedding=query_embedding,
        k=top_k,
        threshold=threshold,
        document_ids=document_ids or None,
    )
