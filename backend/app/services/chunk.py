from typing import List, Tuple

def split_text(text: str, size: int = 1200, overlap: int = 200) -> List[str]:
    tokens = text.split()
    chunks: List[str] = []
    i = 0
    while i < len(tokens):
        piece = tokens[i:i+size]
        if not piece:
            break
        chunks.append(" ".join(piece))
        i += max(1, size - overlap)
    return chunks

def split_pdf_pages_to_chunks(pages: List[str], size: int = 1200, overlap: int = 200) -> List[Tuple[int, str]]:
    """Return (page_no, chunk_text) preserving page numbers (1-based)."""
    out: List[Tuple[int, str]] = []
    for i, page_text in enumerate(pages, start=1):
        for ch in split_text(page_text, size=size, overlap=overlap):
            out.append((i, ch))
    return out
