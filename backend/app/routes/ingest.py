import os
from typing import Optional, List, Dict
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.services.extract import extract_pdf_pages, extract_text_from_txt, fetch_url_text
from app.services.chunk import split_text, split_pdf_pages_to_chunks
from app.services.embed import embed_texts
from app.db.supabase import get_client

router = APIRouter()

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1200"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "200"))
if CHUNK_OVERLAP >= CHUNK_SIZE:
    raise RuntimeError("CHUNK_OVERLAP must be < CHUNK_SIZE")

@router.post("")
async def ingest(
    file: Optional[UploadFile] = File(default=None),
    url: Optional[str] = Form(default=None),
):
    if not file and not url:
        raise HTTPException(400, "Provide a file OR a URL")
    if file and url:
        raise HTTPException(400, "Provide only one of file OR URL")

    sb = get_client()

    pages = None
    source_type = "url" if url else None
    original_name = file.filename if file else url

    chunks_texts = []
    chunk_pages = []

    if url:
        text = fetch_url_text(url)
        if not text.strip():
            raise HTTPException(422, "No text extracted from URL")

        for ch in split_text(text, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
            chunks_texts.append(ch)
            chunk_pages.append(None)

    else:
        content = await file.read()
        fname = file.filename.lower()
        ctype = (file.content_type or "").lower()

        if fname.endswith(".pdf") or "pdf" in ctype:
            source_type = "pdf"
            page_texts = extract_pdf_pages(content)
            pages = len(page_texts)

            for pno, ch in split_pdf_pages_to_chunks(page_texts, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
                chunks_texts.append(ch)
                chunk_pages.append(pno)

        elif fname.endswith(".txt") or "text/plain" in ctype:
            source_type = "txt"
            text = extract_text_from_txt(content)

            for ch in split_text(text, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
                chunks_texts.append(ch)
                chunk_pages.append(None)

        else:
            raise HTTPException(400, "Only PDF or TXT supported")

    if not chunks_texts:
        raise HTTPException(422, "No text extracted.")

    embeddings = embed_texts(chunks_texts)
    if any(len(e) != 1536 for e in embeddings):
        raise HTTPException(500, "Embedding dimension mismatch")

    # Insert document
    try:
        doc_ins = (
            sb.table("documents")
            .insert({
                "name": original_name,
                "original_name": original_name,
                "source_type": source_type,
                "uploaded_at": "now()",
                "meta": {"pages": pages},
                "chunks": len(chunks_texts),
            })
            .execute()
        )
        document_id = doc_ins.data[0]["id"]
    except Exception as e:
        raise HTTPException(500, f"Failed to create document: {e}")

    rows = []
    for i, (txt, emb, pno) in enumerate(zip(chunks_texts, embeddings, chunk_pages)):
        rows.append({
            "document_id": document_id,
            "page": pno,
            "chunk_ix": i,
            "text": txt,
            "embedding": emb,
        })

    try:
        for i in range(0, len(rows), 500):
            sb.table("chunks").insert(rows[i:i+500]).execute()
    except Exception as e:
        sb.table("documents").delete().eq("id", document_id).execute()
        raise HTTPException(500, f"Failed to insert chunks: {e}")

    return {
        "id": document_id,
        "name": original_name,
        "meta": {"pages": pages},
        "chunks": len(rows),
        "uploaded_at": doc_ins.data[0].get("uploaded_at"),
    }
