"use client";

import React, { useContext } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

// Tracks how deep we are inside nested lists
const ListDepth = React.createContext(0);

const components: Components = {
  p: ({ children }) => (
    <p className="mb-3 last:mb-0 leading-relaxed text-white/85 pl-3">{children}</p>
  ),

  // Top-level list: clean, no built-in bullet dots
  // Nested list: indented + left border, no dots
  ul: ({ children }) => {
    const depth = useContext(ListDepth);
    return (
      <ListDepth.Provider value={depth + 1}>
        {depth === 0 ? (
          <ul className="mb-3 last:mb-0 space-y-1.5 list-none pl-3">{children}</ul>
        ) : (
          <ul className="mt-2 ml-2 pl-3 border-l-2 border-white/25 space-y-1 list-none">
            {children}
          </ul>
        )}
      </ListDepth.Provider>
    );
  },

  ol: ({ children }) => {
    const depth = useContext(ListDepth);
    return (
      <ListDepth.Provider value={depth + 1}>
        {depth === 0 ? (
          <ol className="mb-3 last:mb-0 space-y-1.5 list-none pl-3">
            {children}
          </ol>
        ) : (
          <ol className="mt-2 ml-2 pl-3 border-l-2 border-white/25 space-y-1 list-none">
            {children}
          </ol>
        )}
      </ListDepth.Provider>
    );
  },

  li: ({ children }) => {
    const depth = useContext(ListDepth);
    // depth === 1 → direct child of top-level list → show muted dot
    // depth >= 2 → nested → no dot, just text
    if (depth === 1) {
      return (
        <li className="flex items-baseline gap-2 leading-relaxed text-white/82 list-none">
          <span className="text-white/25 text-sm flex-shrink-0 select-none mt-px">·</span>
          <div className="flex-1 min-w-0">{children}</div>
        </li>
      );
    }
    return (
      <li className="leading-relaxed text-white/60 list-none pl-1">{children}</li>
    );
  },

  h1: ({ children }) => (
    <h1 className="mt-5 mb-2 first:mt-0 text-base font-bold text-white border-l-2 border-blue-500 pl-3">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-4 mb-2 first:mt-0 text-sm font-semibold text-white border-l-2 border-blue-500/60 pl-3">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-3 mb-1.5 first:mt-0 text-sm font-medium text-white/80 pl-1">
      {children}
    </h3>
  ),

  strong: ({ children }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-white/70">{children}</em>
  ),

  code: ({ children, className }) => {
    const isBlock = className?.startsWith("language-");
    if (isBlock) {
      return (
        <code className="block w-full overflow-x-auto rounded-lg bg-black/40 px-4 py-3 font-mono text-xs leading-relaxed text-emerald-300">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-emerald-300">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-3 mt-1 last:mb-0">{children}</pre>
  ),

  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-white/20 pl-3 text-white/55 italic last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-white/10" />,

  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 underline underline-offset-2 hover:text-blue-300"
    >
      {children}
    </a>
  ),

  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-white/10 bg-white/5 px-3 py-2 text-left font-semibold text-white/80">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-white/10 px-3 py-2 text-white/65">{children}</td>
  ),
};

const DOC_REF = /\[doc:[a-f0-9-]+\]/gi;

export default function MarkdownMessage({ content }: { content: string }) {
  const clean = content.replace(DOC_REF, "").trimEnd();
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {clean}
    </ReactMarkdown>
  );
}
