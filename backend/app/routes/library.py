from fastapi import APIRouter, HTTPException
from app.db.supabase import get_client

router = APIRouter()

@router.get("")
def list_documents():
    sb = get_client()
    try:
        res = (
            sb.table("documents")
            .select("id,name,source_type,meta,created_at,uploaded_at,chunks")
            .order("uploaded_at", desc=True)
            .execute()
        )
        return res.data
    except Exception as e:
        raise HTTPException(500, f"Failed to load library: {e}")


@router.get("/{doc_id}/chunks")
def get_document_chunks(doc_id: str):
    sb = get_client()
    try:
        res = (
            sb.table("chunks")
            .select("chunk_ix,page,text")
            .eq("document_id", doc_id)
            .order("chunk_ix")
            .execute()
        )
        return res.data
    except Exception as e:
        raise HTTPException(500, f"Failed to load chunks: {e}")


@router.delete("/{doc_id}")
def delete_document(doc_id: str):
    sb = get_client()
    try:
        # chunks are removed automatically via ON DELETE CASCADE
        sb.table("documents").delete().eq("id", doc_id).execute()
        return {"deleted": doc_id}
    except Exception as e:
        raise HTTPException(500, f"Failed to delete document: {e}")
