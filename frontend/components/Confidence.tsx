"use client";

type Props = {
  value: string;
  score?: number;
};

const CONFIG: Record<string, { filled: number; barColor: string; textColor: string; label: string }> = {
  strong:    { filled: 3, barColor: "bg-green-500",  textColor: "text-green-400",  label: "Strong match" },
  partial:   { filled: 2, barColor: "bg-yellow-500", textColor: "text-yellow-400", label: "Partial match" },
  low:       { filled: 1, barColor: "bg-red-500",    textColor: "text-red-400",    label: "Low relevance" },
  not_found: { filled: 0, barColor: "bg-red-500",    textColor: "text-white/30",   label: "Not found in document" },
};

export default function Confidence({ value }: Props) {
  const { filled, barColor, textColor, label } = CONFIG[value] ?? CONFIG.low;

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`h-1 w-4 rounded-full ${n <= filled ? barColor : "bg-white/15"}`} />
        ))}
      </div>
      <span className={`text-[10px] ${textColor}`}>{label}</span>
    </div>
  );
}
