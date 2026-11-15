import type { Figure } from "@/lib/types";

/** A lesson's figure as a small drawing, in the pen colour, on a lavender circle. */
export function LessonIcon({ figure, className = "" }: { figure: Figure; className?: string }) {
  return (
    <svg viewBox="0 0 1000 1000" className={className} aria-hidden="true">
      <circle cx={500} cy={500} r={480} fill="#dcd7f5" />
      {figure.parts.map((part, i) => (
        <path
          key={i}
          d={part.map((p, j) => `${j === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")}
          fill="none"
          stroke="#3a4fa0"
          strokeWidth={44}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
