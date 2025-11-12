# backend/app/routes/ingest.py
import os
from typing import Optional, List, Dict
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.models.dto import IngestResult
from app.services.extract import extract_pdf_pages, extract_text_from_txt, fetch_url_text
from app.services.chunk import split_text, split_pdf_pages_to_chunks
from app.services.embed import embed_texts
from app.db.supabase import get_client

router = APIRouter()

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1200"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "200"))
if CHUNK_OVERLAP >= CHUNK_SIZE:
    raise RuntimeError("CHUNK_OVERLAP must be < CHUNK_SIZE")

@router.post("", response_model=IngestResult)
async def ingest(
    file: Optional[UploadFile] = File(default=None),
    url: Optional[str] = Form(default=None),
    name: Optional[str] = Form(default=None),
):
    if not file and not url:
        raise HTTPException(status_code=400, detail="Provide a file OR a URL.")
    if file and url:
        raise HTTPException(status_code=400, detail="Provide only one of file OR URL.")

    sb = get_client()

    pages: Optional[int] = None
    doc_name = name or (url if url else (file.filename if file else "document"))
    source_type = "url" if url else None

    # ---- extract
    chunks_texts: List[str] = []
    chunk_pages: List[Optional[int]] = []

    if url:
        text = fetch_url_text(url) or ""
        if not text.strip():
            raise HTTPException(status_code=422, detail="No text extracted from URL.")
        source_type = "url"
        for ch in split_text(text, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
            chunks_texts.append(ch); chunk_pages.append(None)
    else:
        content = await file.read()
        fname = file.filename.lower()
        ctype = (file.content_type or "").lower()

        if fname.endswith(".pdf") or "pdf" in ctype:
            source_type = "pdf"
            page_texts = extract_pdf_pages(content)
            pages = len(page_texts)
            for pno, ch in split_pdf_pages_to_chunks(page_texts, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
                chunks_texts.append(ch); chunk_pages.append(pno)

        elif fname.endswith(".txt") or "text/plain" in ctype:
            source_type = "txt"
            text = extract_text_from_txt(content) or ""
            if not text.strip():
                raise HTTPException(status_code=422, detail="Empty TXT file.")
            for ch in split_text(text, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
                chunks_texts.append(ch); chunk_pages.append(None)
        else:
            raise HTTPException(status_code=400, detail="Only PDF or TXT supported.")

    if not chunks_texts:
        raise HTTPException(status_code=422, detail="No text extracted.")

    # ---- embed
    embeddings: List[List[float]] = embed_texts(chunks_texts)
    if any(len(e) != 1536 for e in embeddings):
        raise HTTPException(status_code=500, detail="Embedding dimension mismatch (expected 1536).")

    # ---- create document
    try:
        doc_ins = sb.table("documents").insert({
            "name": doc_name,
            "source_type": source_type,
            "meta": {"pages": pages}
        }).execute()
        document_id = doc_ins.data[0]["id"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create document: {e}")

    # ---- insert chunks (batched)
    rows: List[Dict] = []
    for i, (txt, emb, pno) in enumerate(zip(chunks_texts, embeddings, chunk_pages)):
        rows.append({
            "document_id": document_id,
            "page": pno,
            "chunk_ix": i,
            "text": txt,
            "embedding": emb,   # list[float] → pgvector
        })

    try:
        for i in range(0, len(rows), 500):
            sb.table("chunks").insert(rows[i:i+500]).execute()
    except Exception as e:
        # rollback doc on failure to avoid orphans
        try:
            sb.table("documents").delete().eq("id", document_id).execute()
        finally:
            raise HTTPException(status_code=500, detail=f"Failed to insert chunks: {e}")

    return IngestResult(document_id=document_id, chunks=len(rows), pages=pages)
