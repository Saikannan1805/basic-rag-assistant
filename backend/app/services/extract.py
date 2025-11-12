import io, re, requests
from typing import List, Tuple
from pypdf import PdfReader

def extract_pdf_pages(file_bytes: bytes) -> List[str]:
    """Return a list of per-page texts (keeps page numbers for citations)."""
    reader = PdfReader(io.BytesIO(file_bytes))
    pages: List[str] = []
    for p in reader.pages:
        pages.append(p.extract_text() or "")
    return pages

def extract_text_from_txt(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8", errors="ignore")

def fetch_url_text(url: str) -> str:
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    # ultra-simple HTML->text
    txt = re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>", "", r.text, flags=re.I)
    txt = re.sub(r"<[^>]+>", " ", txt)
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt
