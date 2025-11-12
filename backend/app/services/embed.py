import os
import time
import random
from typing import List

EMBED_DIM = 1536
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-small")
USE_FAKE = os.getenv("USE_FAKE_EMBEDDINGS", "0") == "1"

# Only import OpenAI if we actually need it (so missing key won't crash in dev)
client = None
if not USE_FAKE:
    try:
        from openai import OpenAI
        client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    except Exception:
        # If there's any issue importing/creating client, fall back to fake vectors
        USE_FAKE = True


def _fake_vectors(n: int, dim: int = EMBED_DIM) -> List[List[float]]:
    rnd = random.Random(42)  # deterministic across runs
    return [[rnd.random() for _ in range(dim)] for _ in range(n)]


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Return a vector per input text. Uses fake vectors in dev mode."""
    if USE_FAKE:
        return _fake_vectors(len(texts))

    out: List[List[float]] = []
    batch = 128
    for i in range(0, len(texts), batch):
        chunk = texts[i : i + batch]
        # simple retry loop for transient network errors
        for attempt in range(5):
            try:
                resp = client.embeddings.create(model=EMBED_MODEL, input=chunk)
                out.extend([d.embedding for d in resp.data])
                break
            except Exception:
                time.sleep(0.8 * (attempt + 1))
                if attempt == 4:
                    raise
    return out


def embed_one(text: str) -> List[float]:
    return embed_texts([text])[0]
