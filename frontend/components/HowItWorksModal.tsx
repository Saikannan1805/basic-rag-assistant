"use client";

const STEPS = [
  {
    number: "1",
    title: "Upload your documents",
    description: "Add PDF or TXT files using the Knowledge Base panel. Your documents are stored privately for this session.",
  },
  {
    number: "2",
    title: "Ask anything",
    description: "Type a question, request a summary, or compare documents. The assistant only answers from what you've uploaded.",
  },
  {
    number: "3",
    title: "Read structured answers",
    description: "Responses include headings, highlights, source citations, and a confidence level based on how well your docs answered the question.",
  },
];

export default function HowItWorksModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-md p-6 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">How it works</h2>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition-colors text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-4">
          {STEPS.map((step) => (
            <div key={step.number} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-white/50 flex items-center justify-center mt-0.5">
                {step.number}
              </span>
              <div>
                <p className="text-sm font-medium text-white/85">{step.title}</p>
                <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <hr className="border-white/8" />

        {/* Footer */}
        <p className="text-[11px] text-white/25 text-center">
          Built with FastAPI · OpenAI · Supabase · Next.js
        </p>
      </div>
    </div>
  );
}
