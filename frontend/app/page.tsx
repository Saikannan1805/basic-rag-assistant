"use client";

import React, { useState, useEffect, useRef, FormEvent, KeyboardEvent } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  askStream,
  ingestFile,
  ingestUrl as ingestUrlApi,
  getLibrary,
  deleteDocument,
  getDocumentChunks,
  type IngestResult,
  type LibraryItem,
  type DocumentChunk,
} from "@/lib/api";
import {
  getDocumentIds,
  addDocumentId,
  removeDocumentId,
  syncDocumentIds,
  loadConversation,
  saveConversation,
  clearSession,
} from "@/lib/session";

import Citations from "@/components/Citations";
import Confidence from "@/components/Confidence";
import KnowledgePanel from "@/components/KnowledgePanel";
import MarkdownMessage from "@/components/MarkdownMessage";
import PreviewModal from "@/components/PreviewModal";

type UploadStatus = "pending" | "uploading" | "error";

interface UploadItem {
  id: string;
  file: File;
  status: UploadStatus;
  error?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  relevance?: string;
  score?: number;
}

export default function Home() {
  const [messages, setMessages]             = useState<ChatMessage[]>([]);
  const [input, setInput]                   = useState("");
  const [loading, setLoading]               = useState(false);
  const [panelOpen, setPanelOpen]           = useState(false);
  const [isTyping, setIsTyping]             = useState(false);
  const [uploadItems, setUploadItems]       = useState<UploadItem[]>([]);
  const [uploading, setUploading]           = useState(false);
  const [library, setLibrary]               = useState<LibraryItem[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [preview, setPreview]               = useState<{ id: string; name: string } | null>(null);
  const [previewChunks, setPreviewChunks]   = useState<DocumentChunk[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const chatEndRef  = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    setMessages(loadConversation());

    getLibrary()
      .then((all) => {
        const allIds = all.map((d) => d.id);
        syncDocumentIds(allIds);
        const owned = new Set(getDocumentIds());
        const ownedDocs = all.filter((d) => owned.has(d.id));
        setLibrary(ownedDocs);
        setSelectedDocIds(new Set(ownedDocs.map((d) => d.id)));
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      saveConversation(messages);
    }
  }, [messages, loading]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`;
  }, [input]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const query = input.trim();
    const conversation = messages.map((m) => ({ role: m.role, content: m.content }));
    const document_ids = Array.from(selectedDocIds);

    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setInput("");
    setLoading(true);
    setIsTyping(true);

    let firstToken = true;

    try {
      for await (const event of askStream({ query, top_k: 5, threshold: 0.25, conversation, document_ids })) {
        if (event.type === "token") {
          if (firstToken) {
            firstToken = false;
            setIsTyping(false);
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: event.content, citations: [], relevance: undefined, score: undefined },
            ]);
          } else {
            setMessages((prev) => {
              const msgs = [...prev];
              msgs[msgs.length - 1] = {
                ...msgs[msgs.length - 1],
                content: msgs[msgs.length - 1].content + event.content,
              };
              return msgs;
            });
          }
        } else if (event.type === "meta") {
          setMessages((prev) => {
            if (!prev.length) return prev;
            const msgs = [...prev];
            msgs[msgs.length - 1] = {
              ...msgs[msgs.length - 1],
              citations: event.citations,
              relevance: event.relevance,
              score: event.score,
            };
            return msgs;
          });
        } else if (event.type === "error" || event.type === "done") {
          break;
        }
      }

      if (firstToken) {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "I don't know based on the uploaded documents." },
        ]);
      }
    } catch {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onSend(e: FormEvent) {
    e.preventDefault();
    sendMessage();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    const items = Array.from(files).map((file) => ({
      id: uuidv4(),
      file,
      status: "pending" as UploadStatus,
    }));
    setUploadItems((prev) => [...prev, ...items]);
  }

  async function uploadAll() {
    if (uploadItems.length === 0 || uploading) return;

    setUploading(true);
    const snapshot = uploadItems.filter((i) => i.status === "pending");

    for (const item of snapshot) {
      setUploadItems((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: "uploading", error: undefined } : f))
      );

      try {
        const res: IngestResult = await ingestFile(item.file);
        addDocumentId(res.id);
        setSelectedDocIds((prev) => new Set([...prev, res.id]));
        setLibrary((prev) => [
          { id: res.id, name: res.name, meta: res.meta, chunks: res.chunks, uploaded_at: res.uploaded_at },
          ...prev.filter((d) => d.id !== res.id),
        ]);
        setUploadItems((prev) => prev.filter((f) => f.id !== item.id));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload failed";
        setUploadItems((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: "error", error: msg } : f))
        );
      }
    }

    setUploading(false);
  }

  async function handleIngestUrl(url: string) {
    const res = await ingestUrlApi(url);
    addDocumentId(res.id);
    setSelectedDocIds((prev) => new Set([...prev, res.id]));
    setLibrary((prev) => [
      { id: res.id, name: res.name, meta: res.meta, chunks: res.chunks, uploaded_at: res.uploaded_at },
      ...prev.filter((d) => d.id !== res.id),
    ]);
  }

  function toggleDoc(id: string) {
    setSelectedDocIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }

  async function deleteDoc(id: string) {
    try {
      await deleteDocument(id);
      removeDocumentId(id);
      setSelectedDocIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
      setLibrary((prev) => prev.filter((d) => d.id !== id));
    } catch {
      // deletion failed — library state unchanged
    }
  }

  async function openPreview(id: string, name: string) {
    setPreview({ id, name });
    setPreviewChunks([]);
    setPreviewLoading(true);
    try {
      const chunks = await getDocumentChunks(id);
      setPreviewChunks(chunks);
    } finally {
      setPreviewLoading(false);
    }
  }

  function handleClearSession() {
    clearSession();
    setMessages([]);
    setLibrary([]);
    setSelectedDocIds(new Set());
    setUploadItems([]);
  }

  const isEmpty = messages.length === 0 && !isTyping;
  const canAsk  = library.length > 0 && selectedDocIds.size > 0;

  return (
    <main className="relative h-screen bg-[#0D0D0F] text-white flex">

      {/* Mobile top bar */}
      <header className="sm:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-[#0D0D0F]/90 backdrop-blur-xl border-b border-white/10">
        <span className="text-sm font-semibold text-white">RAG Assistant</span>
        <button
          onClick={() => setPanelOpen(true)}
          className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Knowledge Base
          {library.length > 0 && (
            <span className="bg-blue-500/20 text-blue-400 text-[10px] rounded-full px-1.5 py-0.5 font-medium">
              {selectedDocIds.size}/{library.length}
            </span>
          )}
        </button>
      </header>

      <KnowledgePanel
        uploadItems={uploadItems.map((i) => ({
          id: i.id,
          name: i.file.name,
          size: i.file.size,
          status: i.status,
          error: i.error,
        }))}
        onCancelUpload={(id) => setUploadItems((prev) => prev.filter((f) => f.id !== id))}
        uploadAll={uploadAll}
        library={library}
        selectedDocIds={selectedDocIds}
        onToggleDoc={toggleDoc}
        onFileSelect={addFiles}
        onIngestUrl={handleIngestUrl}
        onDeleteDoc={deleteDoc}
        onPreviewDoc={openPreview}
        onClearSession={handleClearSession}
        onClose={() => setPanelOpen(false)}
        isOpen={panelOpen}
        hasDocuments={library.length > 0}
        className={panelOpen ? "max-sm:translate-x-0" : "max-sm:translate-x-full"}
      />

      {/* Chat area */}
      <section
        className={`flex-1 h-full overflow-y-auto sm:mr-[360px] transition-all duration-300 pt-[52px] sm:pt-0 ${panelOpen ? "max-sm:pointer-events-none" : ""}`}
      >
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 pb-28 gap-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600/30 to-purple-600/20 border border-white/10 flex items-center justify-center text-2xl select-none">
              🧠
            </div>

            <div>
              <h1 className="text-xl font-semibold mb-1.5">Ask your documents</h1>
              <p className="text-white/40 text-sm max-w-xs mx-auto leading-relaxed">
                {library.length === 0
                  ? "Upload a file or add a URL first, then ask questions about it."
                  : selectedDocIds.size === 0
                    ? "Select at least one document in the panel to start chatting."
                    : `${selectedDocIds.size} of ${library.length} document${library.length !== 1 ? "s" : ""} active — ask anything.`}
              </p>
            </div>

            {library.length === 0 && (
              <button
                onClick={() => setPanelOpen(true)}
                className="sm:hidden flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-2xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Upload a document
              </button>
            )}
          </div>
        ) : (
          <div className="p-6 pb-36 space-y-6">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5
                    ${msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white/10 text-white/60"}`}
                >
                  {msg.role === "user" ? "You" : "AI"}
                </div>

                <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed
                      ${msg.role === "user"
                        ? "bg-blue-600/20 border border-blue-500/25 text-blue-100 whitespace-pre-wrap"
                        : "bg-white/5 border border-white/10 text-white/90"}`}
                  >
                    {msg.role === "assistant"
                      ? <MarkdownMessage content={msg.content} />
                      : msg.content}
                  </div>

                  {msg.role === "assistant" && !!msg.citations?.length && (
                    <Citations
                      citations={msg.citations}
                      resolveName={(id) => {
                        const doc = library.find((d) => d.id === id);
                        return doc ? doc.name : `doc:${id.slice(0, 8)}…`;
                      }}
                    />
                  )}

                  {msg.role === "assistant" && msg.relevance && (
                    <Confidence value={msg.relevance} score={msg.score} />
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold bg-white/10 text-white/60">
                  AI
                </div>
                <div className="bg-white/5 border border-white/10 px-4 py-3.5 rounded-2xl flex items-center gap-1.5">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}
      </section>

      {preview && (
        <PreviewModal
          name={preview.name}
          chunks={previewChunks}
          loading={previewLoading}
          onClose={() => setPreview(null)}
        />
      )}

      {/* Input bar */}
      <form
        onSubmit={onSend}
        className="fixed bottom-0 left-0 right-0 px-4 py-3 bg-[#0D0D0F]/80 backdrop-blur-xl border-t border-white/10 sm:pr-[376px]"
      >
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            rows={1}
            className="flex-1 bg-white/5 px-4 py-3 rounded-2xl border border-white/10 focus:outline-none focus:border-white/20 resize-none text-sm leading-relaxed placeholder-white/25 min-h-[48px] max-h-32 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder={
              library.length === 0
                ? "Upload a document or add a URL to start…"
                : selectedDocIds.size === 0
                  ? "Select at least one document to start…"
                  : "Ask something…"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={loading || !canAsk}
          />

          <button
            type="submit"
            disabled={loading || !input.trim() || !canAsk}
            className="flex-shrink-0 w-11 h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-35 disabled:cursor-not-allowed transition-all flex items-center justify-center"
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </main>
  );
}
