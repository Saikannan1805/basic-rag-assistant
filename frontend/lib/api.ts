export type ConversationTurn = { role: "user" | "assistant"; content: string };

export type AskRequest = {
  query: string;
  top_k?: number;
  threshold?: number;
  conversation?: ConversationTurn[];
  document_ids?: string[];
};

export type AskStreamEvent =
  | { type: "meta"; citations: string[]; relevance: string; score: number }
  | { type: "token"; content: string }
  | { type: "error"; message: string }
  | { type: "done" };

export type IngestResult = {
  id: string;
  name: string;
  meta: { pages: number | null };
  chunks: number;
  uploaded_at: string | null;
};

export type LibraryItem = {
  id: string;
  name: string;
  meta: { pages: number | null };
  chunks: number;
  uploaded_at: string | null;
};

export type DocumentChunk = {
  chunk_ix: number;
  page: number | null;
  text: string;
};

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export async function ingestFile(file: File): Promise<IngestResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE}/ingest`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function ingestUrl(url: string): Promise<IngestResult> {
  const fd = new FormData();
  fd.append("url", url);
  const res = await fetch(`${BASE}/ingest`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getLibrary(): Promise<LibraryItem[]> {
  const res = await fetch(`${BASE}/library`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${BASE}/library/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

export async function getDocumentChunks(id: string): Promise<DocumentChunk[]> {
  const res = await fetch(`${BASE}/library/${id}/chunks`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function* askStream(body: AskRequest): AsyncGenerator<AskStreamEvent> {
  const res = await fetch(`${BASE}/ask/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (!payload) continue;
      if (payload === "[DONE]") { yield { type: "done" }; return; }
      try {
        yield JSON.parse(payload) as AskStreamEvent;
      } catch { /* partial chunk — skip */ }
    }
  }
}
