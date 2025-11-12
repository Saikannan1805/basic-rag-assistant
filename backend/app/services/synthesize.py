from __future__ import annotations
import os
from typing import List, Dict, Any
from openai import OpenAI

# --- Environment setup ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is not set. Add it to your .env")

# Allow fallback to GEN_MODEL if defined
OPENAI_MODEL = os.getenv("OPENAI_MODEL", os.getenv("GEN_MODEL", "gpt-4o-mini"))

client = OpenAI(api_key=OPENAI_API_KEY)

# --- System Prompt ---
SYSTEM_PROMPT = (
    "You are a precise assistant that answers ONLY using the provided context. "
    "If the answer is not in the context, reply exactly: "
    "'I don't know based on the uploaded documents.' "
    "Write concise, factual answers. Include bracketed citations like [doc:ID] "
    "whenever a statement comes from a specific chunk."
)


# --- Context Formatting ---
def _format_context_for_llm(chunks: List[Dict[str, Any]], max_chunks: int = 8) -> str:
    lines = []
    for c in chunks[:max_chunks]:
        doc = str(c.get("document_id", "unknown"))
        # ✅ Fix: use 'text' or 'content' depending on which one exists
        txt = str(c.get("text") or c.get("content") or "").strip()
        if not txt:
            continue
        lines.append(f"- [doc:{doc}] {txt}")
    return "\n".join(lines) if lines else "(no content)"


# --- OpenAI Call ---
def synthesize_answer(question: str, contexts: List[Dict[str, Any]]) -> str:
    context_text = _format_context_for_llm(contexts)
    user_prompt = (
        f"Context chunks:\n{context_text}\n\n"
        f"Question: {question}\n\n"
        "Instructions:\n"
        "- Use only the context above. Do not invent facts.\n"
        "- Cite statements with [doc:ID] drawn from the bullets.\n"
        "- Keep it short and clear."
    )

    resp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        max_tokens=400,
    )
    return resp.choices[0].message.content.strip()
