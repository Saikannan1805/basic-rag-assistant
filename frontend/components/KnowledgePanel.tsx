"use client";

import React, { useState } from "react";
import { LibraryItem } from "@/lib/api";
import HowItWorksModal from "@/components/HowItWorksModal";

type UploadStatus = "pending" | "uploading" | "error";

interface UploadItem {
  id: string;
  name?: string;
  size?: number;
  status: UploadStatus;
  error?: string;
}

interface Props {
  uploadItems: UploadItem[];
  onCancelUpload: (id: string) => void;
  uploadAll: () => void;
  library: LibraryItem[];
  selectedDocIds: Set<string>;
  onToggleDoc: (id: string) => void;
  onFileSelect: (files: FileList | null) => void;
  onIngestUrl: (url: string) => Promise<void>;
  onDeleteDoc: (id: string) => void;
  onPreviewDoc: (id: string, name: string) => void;
  onClearSession?: () => void;
  onClose?: () => void;
  isOpen?: boolean;
  hasDocuments?: boolean;
  className?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(s: string | null): string {
  if (!s) return "";
  try {
    return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function fileTypeBadge(name: string): string {
  if (name?.startsWith("http://") || name?.startsWith("https://")) return "URL";
  const ext = name?.split(".").pop()?.toUpperCase() ?? "DOC";
  return ["PDF", "TXT"].includes(ext) ? ext : "DOC";
}

function DocCard({
  doc,
  selected,
  onToggle,
  onDelete,
  onPreview,
}: {
  doc: LibraryItem;
  selected: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onPreview: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm) { setConfirm(true); return; }
    setDeleting(true);
    onDelete();
  }

  return (
    <div className={`border rounded-xl p-3 flex items-start gap-3 group transition-colors ${
      selected ? "bg-white/5 border-white/10" : "bg-white/2 border-white/5 opacity-60"
    }`}>
      {/* Selection toggle */}
      <button
        onClick={onToggle}
        className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors mt-1 ${
          selected ? "bg-blue-500 border-blue-500" : "bg-transparent border-white/25 hover:border-white/50"
        }`}
        title={selected ? "Exclude from queries" : "Include in queries"}
      >
        {selected && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="text-[9px] font-bold bg-blue-500/20 text-blue-400 rounded-md px-1.5 py-1 flex-shrink-0 mt-0.5 tracking-wide">
        {fileTypeBadge(doc.name)}
      </div>

      <button
        onClick={onPreview}
        className="min-w-0 flex-1 text-left hover:opacity-80 transition-opacity"
      >
        <div className="truncate text-sm text-white/80 font-medium">{doc.name}</div>
        <div className="text-[11px] text-white/35 mt-0.5 flex items-center gap-1.5">
          {doc.meta?.pages ? <span>{doc.meta.pages}p</span> : null}
          {doc.meta?.pages ? <span>·</span> : null}
          <span>{doc.chunks} chunks</span>
          {doc.uploaded_at && (
            <>
              <span>·</span>
              <span>{formatDate(doc.uploaded_at)}</span>
            </>
          )}
          <span>·</span>
          <span className="text-blue-400/60">preview</span>
        </div>
      </button>

      {/* Delete button */}
      <div className="flex-shrink-0 flex items-center">
        {deleting ? (
          <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        ) : confirm ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDelete}
              className="text-[10px] text-red-400 hover:text-red-300 font-medium transition-colors"
            >
              Delete
            </button>
            <span className="text-white/20">·</span>
            <button
              onClick={() => setConfirm(false)}
              className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            className="opacity-0 group-hover:opacity-100 max-sm:opacity-100 transition-opacity text-white/25 hover:text-red-400 p-0.5"
            aria-label="Delete document"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default function KnowledgePanel({
  uploadItems,
  onCancelUpload,
  uploadAll,
  library,
  selectedDocIds,
  onToggleDoc,
  onFileSelect,
  onIngestUrl,
  onDeleteDoc,
  onPreviewDoc,
  onClearSession,
  onClose,
  isOpen = false,
  hasDocuments = false,
  className = "",
}: Props) {
  const [dragging, setDragging] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState("");

  async function handleIngestUrl() {
    if (!urlInput.trim() || urlLoading) return;
    setUrlLoading(true);
    setUrlError("");
    try {
      await onIngestUrl(urlInput.trim());
      setUrlInput("");
    } catch (e) {
      setUrlError(e instanceof Error ? e.message : "Failed to fetch URL");
    } finally {
      setUrlLoading(false);
    }
  }

  const activeCount = library.filter(d => selectedDocIds.has(d.id)).length;

  return (
    <>
      {showHelp && <HowItWorksModal onClose={() => setShowHelp(false)} />}

      {isOpen && (
        <div
          className="sm:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      <div
        className={`
          fixed top-0 right-0 z-50 h-full text-white flex flex-col
          bg-[#111113] border-l border-white/10
          transition-transform duration-300 ease-out
          w-[360px]
          max-sm:w-full max-sm:left-0 max-sm:border-l-0 max-sm:border-t
          ${className}
        `}
      >
        {/* Sticky header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#111113]">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h2 className="text-sm font-semibold">Knowledge Base</h2>
            {library.length > 0 && (
              <span className="text-[10px] bg-blue-500/20 text-blue-400 rounded-full px-2 py-0.5 font-medium">
                {activeCount}/{library.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="text-[11px] text-white/30 hover:text-white/60 transition-colors"
            >
              How it works?
            </button>
            <button
              onClick={onClose}
              className="sm:hidden text-white/40 hover:text-white transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* File drop zone */}
          <label
            className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl p-7 cursor-pointer transition-all duration-200
              ${dragging
                ? "border-blue-500 bg-blue-500/10"
                : !hasDocuments
                  ? "border-blue-500/50 bg-blue-500/5 animate-pulse hover:animate-none hover:border-blue-400 hover:bg-blue-500/10"
                  : "border-white/15 hover:border-white/30 hover:bg-white/5"
              }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); onFileSelect(e.dataTransfer.files); }}
          >
            <svg
              className={`w-7 h-7 transition-colors ${dragging || !hasDocuments ? "text-blue-400" : "text-white/25"}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className={`text-sm ${!hasDocuments ? "text-white/70" : "text-white/50"}`}>
              {dragging ? "Drop to add" : !hasDocuments ? "Upload to get started" : "Drop files or click to browse"}
            </p>
            <p className="text-xs text-white/25">PDF · TXT</p>
            <input
              type="file"
              multiple
              accept=".pdf,.txt"
              className="hidden"
              onChange={(e) => onFileSelect(e.target.files)}
            />
          </label>

          {/* URL ingest */}
          <div className="space-y-2">
            <p className="text-xs text-white/35 font-medium uppercase tracking-wider">Add from URL</p>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => { setUrlInput(e.target.value); setUrlError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleIngestUrl(); }}
                placeholder="https://..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/20 transition-colors"
              />
              <button
                onClick={handleIngestUrl}
                disabled={!urlInput.trim() || urlLoading}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition-colors flex items-center"
              >
                {urlLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Add"
                )}
              </button>
            </div>
            {urlError && (
              <p className="text-[11px] text-red-400 leading-relaxed">{urlError}</p>
            )}
          </div>

          {/* Upload queue */}
          {uploadItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-white/35 font-medium uppercase tracking-wider">Queue</p>
              {uploadItems.map((u) => (
                <div key={u.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-white/75">{u.name}</div>
                    <div className="text-[11px] text-white/35">{formatSize(u.size || 0)}</div>
                    {u.status === "error" && u.error && (
                      <div className="text-[11px] text-red-400/80 mt-0.5 leading-relaxed">{u.error}</div>
                    )}
                  </div>
                  {u.status === "uploading" ? (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5" />
                  ) : u.status === "error" ? (
                    <span className="text-[11px] text-red-400 flex-shrink-0 mt-0.5">Failed</span>
                  ) : (
                    <button
                      className="text-[11px] text-white/30 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
                      onClick={() => onCancelUpload(u.id)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                className="w-full bg-blue-600 hover:bg-blue-700 transition-colors rounded-xl py-2.5 text-sm font-medium"
                onClick={uploadAll}
              >
                Upload {uploadItems.filter(u => u.status === "pending").length} file{uploadItems.filter(u => u.status === "pending").length !== 1 ? "s" : ""}
              </button>
            </div>
          )}

          {/* Library */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-white/35 font-medium uppercase tracking-wider">Library</p>
              {library.length > 1 && (
                <button
                  onClick={() => {
                    if (activeCount === library.length) {
                      library.forEach(d => { if (selectedDocIds.has(d.id)) onToggleDoc(d.id); });
                    } else {
                      library.forEach(d => { if (!selectedDocIds.has(d.id)) onToggleDoc(d.id); });
                    }
                  }}
                  className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
                >
                  {activeCount === library.length ? "Deselect all" : "Select all"}
                </button>
              )}
            </div>

            {library.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-white/20 text-xs gap-2">
                <svg className="w-9 h-9 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                </svg>
                <span>No documents yet</span>
              </div>
            ) : (
              <div className="space-y-2">
                {library.map((doc) => (
                  <DocCard
                    key={doc.id}
                    doc={doc}
                    selected={selectedDocIds.has(doc.id)}
                    onToggle={() => onToggleDoc(doc.id)}
                    onDelete={() => onDeleteDoc(doc.id)}
                    onPreview={() => onPreviewDoc(doc.id, doc.name)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Clear session */}
          {onClearSession && (
            <div className="pt-2 border-t border-white/5">
              <button
                onClick={onClearSession}
                className="w-full text-xs text-white/25 hover:text-red-400 transition-colors py-2 rounded-xl hover:bg-red-500/5"
              >
                Clear session & history
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
