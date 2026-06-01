# RAG Assistant

Upload a PDF, TXT file, or any URL — then chat with it. Get answers straight from your documents, with citations and a confidence score on every response.

**Live demo:** https://rag-assist-system.vercel.app
**API docs:** https://basic-rag-assistant.onrender.com/docs

---

## What it does

1. **Upload** a document or paste a URL
2. **Ask** anything about it in the chat
3. **Get** a streamed answer with the exact sources it used

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Python, FastAPI |
| AI | OpenAI (embeddings + GPT-4o-mini) |
| Database | Supabase (PostgreSQL + pgvector) |
| Deployment | Vercel (frontend), Render (backend) |

---

## Run locally

### 1. Backend

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `backend/.env` file:

```ini
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ALLOWED_ORIGINS=http://localhost:3000
```

Start the server:

```bash
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
```

Create a `frontend/.env.local` file:

```ini
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000
```

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## API endpoints

| Method | Endpoint | What it does |
|---|---|---|
| POST | `/ingest` | Upload a file or URL |
| POST | `/ask/stream` | Ask a question (streamed response) |
| GET | `/library` | List all uploaded documents |
| GET | `/library/{id}/chunks` | View chunks for a document |
| DELETE | `/library/{id}` | Delete a document |
