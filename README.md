Create a virtual environment:

python3 -m venv .venv
source .venv/bin/activate   # (Mac/Linux)
# or
.\.venv\Scripts\activate    # (Windows)

Install dependencies:

pip install -r backend/requirements.txt

Running the backend :

cd backend
uvicorn app.main:app --reload --port 8000

you'll see :

INFO:     Uvicorn running on http://127.0.0.1:8000

Add /docs after the link. (i.e) http://127.0.0.1:8000/docs

