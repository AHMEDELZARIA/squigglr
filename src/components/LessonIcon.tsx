import type { Figure } from "@/lib/types";

/** A lesson's figure as a small drawing, in the pen colour. */
interface LessonIconProps {
  figure: Figure;
  className?: string;
}

export function LessonIcon({ figure, className = "" }: LessonIconProps) {
  return (
    <svg viewBox="0 0 1000 1000" className={className} aria-hidden="true">
      {figure.parts.map((part, i) => (
        <path
          key={i}
          d={part.map((p, j) => `${j === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")}
          fill="none"
          stroke="#3a4fa0"
          strokeWidth={40}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
