# backend/app/db/supabase.py
import os
from typing import cast
from dotenv import load_dotenv
from supabase import create_client, Client

# Load env in dev so uvicorn picks them up
load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Create the Supabase client once and export it
db: Client = cast(Client, create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY))

# Backwards-compatible alias (some files may import `sb`)
sb = db

def get_client():
    return db
