from __future__ import annotations
import os
from typing import AsyncGenerator, List, Dict, Any, Optional
from openai import OpenAI, AsyncOpenAI

# --- Environment setup ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is not set. Add it to your .env")

# Allow fallback to GEN_MODEL if defined
OPENAI_MODEL = os.getenv("OPENAI_MODEL", os.getenv("GEN_MODEL", "gpt-4o-mini"))

client = OpenAI(api_key=OPENAI_API_KEY)
async_client = AsyncOpenAI(api_key=OPENAI_API_KEY)


# --- System Prompt ---
SYSTEM_PROMPT = (
    "You are a precise assistant that answers ONLY using the provided context chunks "
    "from the user's uploaded documents.\n\n"
    "Rules:\n"
    "1. You may use conversation history for coherence and understanding.\n"
    "2. Factual answers MUST be taken strictly from context chunks.\n"
    "3. If the answer is not found in the context, say: "
    "'I don't know based on the uploaded documents.'\n"
    "4. Cite statements with [doc:ID] using the bullet list's IDs.\n\n"
    "Formatting rules (always follow these):\n"
    "5. Start with a one-sentence summary of the answer.\n"
    "6. Use ## for main section headings (e.g. ## Focus Areas).\n"
    "7. Use **bold** to highlight key names, tools, technologies, and important terms.\n"
    "8. Use bullet points for lists; use nested bullets (indented with two spaces) for sub-points.\n"
    "9. Keep each bullet concise — one idea per bullet.\n"
    "10. Add a blank line between sections for readability.\n"
    "11. Do not use more than 3 heading levels. Avoid walls of text."
)


# --- Format retrieved chunks ---
def _format_context_for_llm(chunks: List[Dict[str, Any]], max_chunks: int = 8) -> str:
    lines = []
    for c in chunks[:max_chunks]:
        doc = str(c.get("document_id", "unknown"))
        txt = str(c.get("text") or c.get("content") or "").strip()
        if not txt:
            continue
        lines.append(f"- [doc:{doc}] {txt}")
    return "\n".join(lines) if lines else "(no content)"


# --- Main generation function ---
def synthesize_answer(
    question: str,
    contexts: List[Dict[str, Any]],
    conversation: Optional[List[Dict[str, str]]] = None
) -> str:

    # Format the retrieved chunks as context
    context_text = _format_context_for_llm(contexts)

    # Build message list for OpenAI
    messages = []

    # SYSTEM message first
    messages.append({"role": "system", "content": SYSTEM_PROMPT})

    # Add conversation history (user + assistant messages)
    if conversation:
        for turn in conversation:
            messages.append({"role": turn["role"], "content": turn["content"]})

    messages.append({
        "role": "user",
        "content": (
            f"Context chunks:\n{context_text}\n\n"
            f"Question: {question}\n\n"
            "ONLY use the context above. If the answer is not there, say: "
            "'I don't know based on the uploaded documents.'\n\n"
            "Format your response in markdown:\n"
            "- Start with a one-sentence summary\n"
            "- Use ## for each main section heading\n"
            "- Use **bold** for names, tools, and key terms\n"
            "- Use bullet points ONLY for genuinely enumerable items (3 or more parallel items)\n"
            "- For explanations or comparisons under a heading, write a short paragraph instead of bullets\n"
            "- If you must nest, keep it to one level deep — avoid bullet-inside-bullet for every thought"
        ),
    })

    resp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=messages,
        temperature=0.2,
        max_tokens=800,
    )

    return resp.choices[0].message.content.strip()


async def synthesize_stream(
    question: str,
    contexts: List[Dict[str, Any]],
    conversation: Optional[List[Dict[str, str]]] = None,
) -> AsyncGenerator[str, None]:
    """Async generator that yields answer tokens one at a time."""
    context_text = _format_context_for_llm(contexts)

    messages: List[Dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]

    if conversation:
        for turn in conversation:
            messages.append({"role": turn["role"], "content": turn["content"]})

    messages.append({
        "role": "user",
        "content": (
            f"Context chunks:\n{context_text}\n\n"
            f"Question: {question}\n\n"
            "ONLY use the context above. If the answer is not there, say: "
            "'I don't know based on the uploaded documents.'\n\n"
            "Format your response in markdown:\n"
            "- Start with a one-sentence summary\n"
            "- Use ## for each main section heading\n"
            "- Use **bold** for names, tools, and key terms\n"
            "- Use bullet points ONLY for genuinely enumerable items (3 or more parallel items)\n"
            "- For explanations or comparisons under a heading, write a short paragraph instead of bullets\n"
            "- If you must nest, keep it to one level deep — avoid bullet-inside-bullet for every thought"
        ),
    })

    stream = await async_client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=messages,
        temperature=0.2,
        max_tokens=800,
        stream=True,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta
