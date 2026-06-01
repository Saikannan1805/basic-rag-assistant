# Basic RAG Assistant

A full-stack RAG (Retrieval-Augmented Generation) app. Upload PDFs, TXT files, or paste a URL — then ask questions and get answers grounded in your documents, with source citations and a confidence indicator.

**Stack:** FastAPI · OpenAI · Supabase (pgvector) · Next.js 14

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- A [Supabase](https://supabase.com) project with `pgvector` enabled and the `documents` / `chunks` tables set up
- An OpenAI API key

---

## Backend

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```ini
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

ALLOWED_ORIGINS=http://localhost:3000
CHUNK_SIZE=1200
CHUNK_OVERLAP=200
TOP_K=8
SIM_THRESHOLD=0.25
EMBED_MODEL=text-embedding-3-small
GEN_MODEL=gpt-4o-mini

# Set to 1 to skip real OpenAI calls during local development
USE_FAKE_EMBEDDINGS=0
USE_OFFLINE_ANSWER=0
```

Start the server:

```bash
uvicorn app.main:app --reload --port 8000
```

API docs available at `http://127.0.0.1:8000/docs`

---

## Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```ini
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000
```

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## How it works

1. **Ingest** — Upload a PDF/TXT or paste a URL. The backend extracts text, splits it into overlapping chunks, embeds each chunk with OpenAI, and stores everything in Supabase.
2. **Retrieve** — When you ask a question, the query is embedded and the top-K most similar chunks are fetched via cosine similarity (`match_chunks` RPC).
3. **Synthesize** — The retrieved chunks are passed to GPT-4o-mini along with your conversation history to produce a streamed answer with citations and a relevance score.

---

## API reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/ingest` | Upload a file (`file`) or URL (`url` form field) |
| `POST` | `/ask` | Non-streaming answer |
| `POST` | `/ask/stream` | Server-sent events stream |
| `GET`  | `/library` | List ingested documents |
| `GET`  | `/library/{id}/chunks` | View raw chunks for a document |
| `DELETE` | `/library/{id}` | Delete a document and its chunks |
