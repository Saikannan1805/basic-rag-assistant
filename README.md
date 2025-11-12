# 🧠 Basic RAG Assistant

### Setup & Run

```bash
git clone https://github.com/Saikannan1805/basic-rag-assistant.git
cd basic-rag-assistant

python3 -m venv .venv
source .venv/bin/activate

pip install -r backend/requirements.txt
```

### In `backend/` folder create `.env` and add:
```ini
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

ALLOWED_ORIGINS=http://localhost:3000
CHUNK_SIZE=1200
CHUNK_OVERLAP=200
TOP_K=8
SIM_THRESHOLD=0.25
EMBED_MODEL=text-embedding-3-small
GEN_MODEL=gpt-4o-mini
USE_FAKE_EMBEDDINGS=1
USE_OFFLINE_ANSWER=1
```

### Run the app
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Open in browser: **http://127.0.0.1:8000/docs**

Upload your files in `/ingest`  
Ask questions in `/ask`

**Example:**
```json
{
  "query": "What are the benefits of inclusive sports programs?",
  "top_k": 3,
  "threshold": 0.25
}
```
