"use client";

type Props = {
  citations: string[];
  resolveName: (id: string) => string;
};

export default function Citations({ citations, resolveName }: Props) {
  if (!citations?.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1">
      <span className="text-[10px] text-white/30">Sources:</span>
      {citations.map((cid) => (
        <span
          key={cid}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-[11px] text-white/55 whitespace-nowrap"
        >
          <svg
            className="w-2.5 h-2.5 flex-shrink-0 text-white/30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {resolveName(cid)}
        </span>
      ))}
    </div>
  );
}
