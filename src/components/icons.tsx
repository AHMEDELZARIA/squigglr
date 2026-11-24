// The small pictures used across the screens. They follow the lo-fi
// prototype (the trail of prints, the helper, the sticker, the grown-ups lock) and
// are drawn here so they take the app's colours.

import type { DrawingStage, Figure, Point } from "@/lib/types";

const INK = "#23304a";
const BRAND = "#5e51b8";

interface IconProps {
  className?: string;
}

const line = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

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

/** A paw print: a round pad and four toes. */
const PRINT = (
  <>
    <ellipse cx="10" cy="18" rx="6" ry="5.5" />
    <circle cx="3.6" cy="10.5" r="2.3" />
    <circle cx="7.8" cy="6.5" r="2.3" />
    <circle cx="12.2" cy="6.5" r="2.3" />
    <circle cx="16.4" cy="10.5" r="2.3" />
  </>
);

interface StepProps {
  /** Whether this step has been reached (coloured) or not yet (grey). */
  done: boolean;
}

/**
 * One step of the trail: a left and a right print, toes pointing the way the
 * trail goes, the second a pace ahead of the first.
 */
function Step(props: StepProps) {
  const print = PRINT;
  let colour = "#c9cddb"; // grey: not reached yet
  if (props.done) {
    colour = BRAND;
  }
  // A print is drawn toes-up in a 20 x 26 box. Turned a quarter turn, its toes point right.
  const walking = (x: number, y: number) => `translate(${x + 26} ${y}) rotate(90)`;
  return (
    <svg
      viewBox="0 0 56 44"
      className="h-14 w-[4.5rem]"
      aria-hidden="true"
      fill={colour}
      stroke={colour}
      strokeWidth={1.2}
    >
      <g transform={walking(0, 0)}>{print}</g>
      <g transform={walking(28, 22)}>{print}</g>
    </svg>
  );
}

/**
 * Progress through the lesson as a trail of prints walking across the
 * screen: watch, then the three drawing steps. The step just reached grows for a moment,
 * so the child sees the trail move on.
 */
interface FootprintsProps {
  /** The index of the step the child has reached: 0 watch, 1 trace, 2 dots, 3 on their own. */
  reached: number;
  labels: string[];
}

export function Footprints({ reached, labels }: FootprintsProps) {
  return (
    <ol className="flex" aria-label="Steps of the lesson">
      {labels.map((label, i) => (
        <li
          key={i === reached ? `${label}-now-${reached}` : label}
          aria-label={label}
          aria-current={i === reached ? "step" : undefined}
          className={i === reached && reached > 0 ? "pop" : undefined}
        >
          <Step done={i <= reached} />
        </li>
      ))}
    </ol>
  );
}

/** The practice sticker: given at the end of a lesson for practising, whatever the result. */
export const Sticker = ({ className }: IconProps) => (
  <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
    <circle cx="60" cy="60" r="55" fill="#fdf8e6" stroke={INK} strokeWidth={2.5} strokeDasharray="9 8" />
    <path
      d="M60 22l11.2 23.4 25.6 3.4-18.7 17.8 4.6 25.4L60 79.8 37.3 92l4.6-25.4-18.7-17.8 25.6-3.4z"
      fill="#fbf0c4"
      stroke={INK}
      strokeWidth={2.5}
      strokeLinejoin="round"
    />
    <circle cx="53" cy="56" r="2.6" fill={INK} />
    <circle cx="67" cy="56" r="2.6" fill={INK} />
    <path d="M52 65 Q60 72 68 65" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
  </svg>
);

/** Turns a list of points into SVG path text: "M x y" for the first point, then "L x y" for each next one. */
function d(points: Point[]): string {
  const parts = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
  return parts.join(" ");
}

/** What the child sees at a drawing stage, as a small picture: the dotted outline, the dots, or a blank page. */
interface StageGuideProps {
  figure: Figure;
  stage: DrawingStage;
  className?: string;
}

export function StageGuide({ figure, stage, className }: StageGuideProps) {
  return (
    <svg viewBox="0 0 1000 1000" className={className} aria-hidden="true">
      {stage === "I" && (
        <rect x="150" y="150" width="700" height="700" rx="90" fill="#ffffff" stroke="#e1e4ec" strokeWidth={28} />
      )}
      {stage === "T" &&
        figure.parts.map((part, i) => (
          <path
            key={i}
            d={d(part)}
            fill="none"
            stroke="#8e84d6"
            strokeWidth={36}
            strokeLinecap="round"
            strokeDasharray="4 78"
          />
        ))}
      {stage === "E" && figure.endpoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={56} fill="#8e84d6" />)}
    </svg>
  );
}
