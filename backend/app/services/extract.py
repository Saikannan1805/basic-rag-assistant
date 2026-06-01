import io, re, requests
import fitz   # PyMuPDF
from typing import List

def extract_pdf_pages(file_bytes: bytes) -> List[str]:
    """Extract per-page text safely and fast using PyMuPDF."""
    pages: List[str] = []
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        for page in doc:
            text = page.get_text("text") or ""
            pages.append(text)
        return pages
    except Exception as e:
        raise RuntimeError(f"PDF extraction failed: {e}")

def extract_text_from_txt(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8", errors="ignore")

def fetch_url_text(url: str) -> str:
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    txt = re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>", "", r.text, flags=re.I)
    txt = re.sub(r"<[^>]+>", " ", txt)
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt
