import { v4 as uuidv4 } from "uuid";
import type { ConversationTurn } from "./api";

const SESSION_ID_KEY   = "rag_session_id";
const DOC_IDS_KEY      = "rag_doc_ids";
const CONVERSATION_KEY = "rag_conversation";

// ── Session ID ──────────────────────────────────────────────────────────────

export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

// ── Owned document IDs ───────────────────────────────────────────────────────

export function getDocumentIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DOC_IDS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addDocumentId(id: string): void {
  const ids = getDocumentIds();
  if (!ids.includes(id)) {
    localStorage.setItem(DOC_IDS_KEY, JSON.stringify([...ids, id]));
  }
}

export function removeDocumentId(id: string): void {
  const ids = getDocumentIds().filter((d) => d !== id);
  localStorage.setItem(DOC_IDS_KEY, JSON.stringify(ids));
}

export function syncDocumentIds(supabaseIds: string[]): void {
  const owned = getDocumentIds().filter((id) => supabaseIds.includes(id));
  localStorage.setItem(DOC_IDS_KEY, JSON.stringify(owned));
}

// ── Conversation history ─────────────────────────────────────────────────────

export type SavedMessage = {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  relevance?: string;
  score?: number;
};

export function loadConversation(): SavedMessage[] {
  try {
    return JSON.parse(localStorage.getItem(CONVERSATION_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveConversation(messages: SavedMessage[]): void {
  localStorage.setItem(CONVERSATION_KEY, JSON.stringify(messages));
}

// ── Clear everything ─────────────────────────────────────────────────────────

export function clearSession(): void {
  localStorage.removeItem(SESSION_ID_KEY);
  localStorage.removeItem(DOC_IDS_KEY);
  localStorage.removeItem(CONVERSATION_KEY);
}
