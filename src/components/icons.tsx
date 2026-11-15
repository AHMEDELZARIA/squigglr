// The small pictures used across the screens. They follow the lo-fi
// prototype (footprints, helper, practice sticker, the grown-ups lock) and
// are drawn here so they take the app's colours.

import type { DrawingStage, Figure } from "@/lib/types";

const INK = "#23304a";
const BRAND = "#5e51b8";

type IconProps = { className?: string };

const line = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const LockIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...line}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export const BackIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...line}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const PlayIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" fill="currentColor" />
  </svg>
);

export const BookIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...line}>
    <rect x="3" y="5" width="8" height="14" rx="1" />
    <rect x="13" y="5" width="8" height="14" rx="1" />
  </svg>
);

export const RestartIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...line} strokeWidth={2.4}>
    <path d="M4 12a8 8 0 1 0 2.6-5.9" />
    <path d="M4 4v5h5" />
  </svg>
);

export const DoorIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...line} strokeWidth={2.4}>
    <path d="M6 20V4h8v16" />
    <path d="M14 6l4 1.5v9L14 18" />
    <path d="M3 20h18" />
    <circle cx="11.2" cy="12" r="0.6" fill="currentColor" />
  </svg>
);

/** The helper who speaks to the child: a friendly round face with an antenna. */
export const Helper = ({ className }: IconProps) => (
  <svg viewBox="0 0 72 84" className={className} aria-hidden="true">
    <line x1="36" y1="6" x2="36" y2="18" stroke={INK} strokeWidth={3} strokeLinecap="round" />
    <circle cx="36" cy="6" r="4" fill={BRAND} />
    <circle cx="36" cy="50" r="30" fill="#f2f0fc" stroke={INK} strokeWidth={3} />
    <circle cx="26" cy="45" r="3.5" fill={INK} />
    <circle cx="46" cy="45" r="3.5" fill={INK} />
    <path d="M24 58 Q36 69 48 58" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
  </svg>
);

/** A pair of footprints: one step of the lesson, filled once the child has reached it. */
function Feet({ done }: { done: boolean }) {
  const fill = done ? BRAND : "#ffffff";
  const foot = (x: number, y: number) => (
    <g transform={`translate(${x} ${y})`} fill={fill} stroke={done ? BRAND : INK} strokeWidth={1.6}>
      <ellipse cx="8" cy="19" rx="6" ry="9" />
      <circle cx="3.5" cy="6" r="2" />
      <circle cx="8" cy="4" r="2" />
      <circle cx="12.5" cy="6" r="2" />
    </g>
  );
  return (
    <svg viewBox="0 0 40 36" className="h-9 w-10" aria-hidden="true">
      {foot(2, 0)}
      {foot(22, 6)}
    </svg>
  );
}

/** Progress through the lesson as footprints: watch, then the three drawing steps. */
export function Footprints({ reached, labels }: { reached: number; labels: string[] }) {
  return (
    <ol className="flex gap-3" aria-label="Steps of the lesson">
      {labels.map((label, i) => (
        <li key={label} aria-label={label} aria-current={i === reached ? "step" : undefined}>
          <Feet done={i <= reached} />
        </li>
      ))}
    </ol>
  );
}

/** The practice sticker: given for practising, whatever the result. */
export const Sticker = ({ className }: IconProps) => (
  <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
    <circle cx="60" cy="60" r="55" fill="#fdf8e6" stroke={INK} strokeWidth={3} strokeDasharray="9 8" />
    <path
      d="M60 22l11.2 23.4 25.6 3.4-18.7 17.8 4.6 25.4L60 79.8 37.3 92l4.6-25.4-18.7-17.8 25.6-3.4z"
      fill="#fbf0c4"
      stroke={INK}
      strokeWidth={3}
      strokeLinejoin="round"
    />
    <circle cx="53" cy="56" r="2.6" fill={INK} />
    <circle cx="67" cy="56" r="2.6" fill={INK} />
    <path d="M52 65 Q60 72 68 65" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
  </svg>
);

const d = (points: { x: number; y: number }[]) =>
  points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

/** What the child sees at a drawing stage, as a small picture: the dotted outline, the dots, or a blank page. */
export function StageGuide({ figure, stage, className }: { figure: Figure; stage: DrawingStage; className?: string }) {
  return (
    <svg viewBox="0 0 1000 1000" className={className} aria-hidden="true">
      {stage === "I" && (
        <rect x="150" y="150" width="700" height="700" rx="90" fill="#ffffff" stroke="#e1e4ec" strokeWidth={28} />
      )}
      {stage === "T" &&
        figure.parts.map((part, i) => (
          <path key={i} d={d(part)} fill="none" stroke="#8e84d6" strokeWidth={36} strokeLinecap="round" strokeDasharray="4 78" />
        ))}
      {stage === "E" && figure.endpoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={56} fill="#8e84d6" />)}
    </svg>
  );
}
