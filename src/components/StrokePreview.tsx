import type { Figure, Stroke } from "@/lib/types";

const d = (points: { x: number; y: number }[]) =>
  points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

const SIZES = { sm: "h-24 w-24", md: "h-28 w-28", lg: "h-44 w-44" };

/** A saved attempt, redrawn from its actual strokes, with the lesson's figure faintly behind it. */
export function StrokePreview({
  strokes,
  figure,
  size = "md",
}: {
  strokes: Stroke[];
  figure: Figure;
  size?: keyof typeof SIZES;
}) {
  return (
    <svg viewBox="0 0 1000 1000" className={`shrink-0 rounded-2xl border-2 border-edge bg-white ${SIZES[size]}`}>
      {figure.parts.map((part, i) => (
        <path key={`f${i}`} d={d(part)} fill="none" stroke="#dcd7f5" strokeWidth={30} strokeLinecap="round" />
      ))}
      {strokes.map((s, i) => (
        <path
          key={i}
          d={d(s.points)}
          fill="none"
          stroke="#3a4fa0"
          strokeWidth={26}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
