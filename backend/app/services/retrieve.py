from typing import List, Dict, Any
from app.db.supabase import db

def top_k_chunks(
    query_embedding: List[float],
    k: int = 8,
    threshold: float = 0.25,
) -> List[Dict[str, Any]]:
    # Optional sanity check
    if len(query_embedding) != 1536:
        raise ValueError(f"Expected 1536-dim embedding, got {len(query_embedding)}")

    resp = db.rpc(
        "match_chunks",
        {
            "query_embedding": query_embedding,   # list[float] is OK
            "match_count": k,
            "similarity_threshold": threshold,
        },
    ).execute()

    # Handle RPC errors explicitly
    if getattr(resp, "error", None):
        raise RuntimeError(f"match_chunks RPC failed: {resp.error}")

    return resp.data or []
