"use client";

import { useEffect, useRef } from "react";
import { DocumentChunk } from "@/lib/api";

interface Props {
  name: string;
  chunks: DocumentChunk[];
  loading: boolean;
  onClose: () => void;
}

export default function PreviewModal({ name, chunks, loading, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Close when clicking the backdrop
  function onBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose();
  }

  const totalWords = chunks.reduce(
    (sum, c) => sum + c.text.split(/\s+/).length,
    0
  );

  return (
    <div
      ref={overlayRef}
      onClick={onBackdropClick}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-[#111113] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-white/10 gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white truncate">{name}</h2>
            {!loading && (
              <p className="text-[11px] text-white/35 mt-0.5">
                {chunks.length} chunk{chunks.length !== 1 ? "s" : ""} · ~{totalWords.toLocaleString()} words
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-white/35 hover:text-white transition-colors mt-0.5"
            aria-label="Close preview"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-white/30">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white/70 rounded-full animate-spin" />
              <span className="text-sm">Loading document…</span>
            </div>
          ) : chunks.length === 0 ? (
            <p className="text-center text-white/30 text-sm py-16">No content found.</p>
          ) : (
            chunks.map((chunk) => (
              <div key={chunk.chunk_ix} className="group relative">
                {/* Chunk label */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] text-white/25 font-mono">
                    chunk {chunk.chunk_ix + 1}
                  </span>
                  {chunk.page !== null && (
                    <>
                      <span className="text-white/15">·</span>
                      <span className="text-[10px] text-white/25">page {chunk.page}</span>
                    </>
                  )}
                </div>

                {/* Chunk text */}
                <div className="bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-white/75 leading-relaxed whitespace-pre-wrap">
                  {chunk.text}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
