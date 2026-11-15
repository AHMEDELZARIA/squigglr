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

export const PencilIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...line} strokeWidth={2.2}>
    <path d="M4 20l1-4.5L16.5 4a2.1 2.1 0 0 1 3 3L8 18.500z" />
    <path d="M14.5 6l3 3" />
  </svg>
);

export const EraserIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...line} strokeWidth={2.2}>
    <path d="M8.5 19.500L3.5 14.500a1.5 1.5 0 0 1 0-2.100l8.4-8.400a1.5 1.5 0 0 1 2.1 0l6 6a1.5 1.5 0 0 1 0 2.100l-7.4 7.400z" />
    <path d="M8 8l8 8" />
    <path d="M8.5 19.500H21" />
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

// One print for each animal a child can have as their picture. Each is drawn
// in a 20 x 26 box, toes at the top.
const PRINTS: Record<string, React.ReactNode> = {
  // Fox: a narrow dog-like paw with four toes and small claw marks.
  "🦊": (
    <>
      <path d="M10 13c3.4 0 6 2.6 6 5.6 0 2.6-2.4 4.4-6 4.4s-6-1.8-6-4.400c0-3 2.6-5.6 6-5.600z" />
      <ellipse cx="3.6" cy="11" rx="2" ry="2.8" transform="rotate(-18 3.6 11)" />
      <ellipse cx="7.6" cy="7.4" rx="2" ry="3" />
      <ellipse cx="12.4" cy="7.4" rx="2" ry="3" />
      <ellipse cx="16.4" cy="11" rx="2" ry="2.8" transform="rotate(18 16.4 11)" />
      <path d="M7.6 2.800v-2M12.4 2.800v-2M2.6 6.800l-.8-1.800M17.4 6.800l.8-1.8" fill="none" strokeLinecap="round" />
    </>
  ),
  // Panda: a wide bear paw with five round toes.
  "🐼": (
    <>
      <ellipse cx="10" cy="17.5" rx="7.5" ry="6" />
      <circle cx="2.8" cy="10" r="2" />
      <circle cx="6.2" cy="6.6" r="2.2" />
      <circle cx="10" cy="5.4" r="2.3" />
      <circle cx="13.8" cy="6.6" r="2.2" />
      <circle cx="17.2" cy="10" r="2" />
    </>
  ),
  // Frog: a small heel with three long toes that end in round pads.
  "🐸": (
    <>
      <path d="M10 23L3.5 8M10 23V5M10 23l6.5-15" fill="none" strokeWidth={2.6} strokeLinecap="round" />
      <circle cx="3.5" cy="7" r="2.6" />
      <circle cx="10" cy="4" r="2.6" />
      <circle cx="16.5" cy="7" r="2.6" />
      <circle cx="10" cy="22" r="3.2" />
    </>
  ),
  // Lion: a big round cat paw, four toes, no claws showing.
  "🦁": (
    <>
      <path d="M10 12.500c4 0 7.5 2.7 7.5 6.2 0 2.9-3 4.8-7.5 4.800s-7.5-1.9-7.5-4.800c0-3.5 3.5-6.2 7.5-6.200z" />
      <circle cx="3.2" cy="10" r="2.5" />
      <circle cx="7.6" cy="6" r="2.7" />
      <circle cx="12.4" cy="6" r="2.7" />
      <circle cx="16.8" cy="10" r="2.5" />
    </>
  ),
  // Octopus: the round marks of three suckers.
  "🐙": (
    <>
      <circle cx="10" cy="6.5" r="4.5" />
      <circle cx="5" cy="17" r="4" />
      <circle cx="15" cy="18.5" r="3.4" />
    </>
  ),
  // Unicorn: a hoof print, shaped like a horseshoe.
  "🦄": (
    <path d="M3.5 23C1 16 3 4.5 10 4.500S19 16 16.5 23h-3.600c1.8-5.5 1-12.5-2.9-12.500S5.3 17.5 7.1 23z" />
  ),
  // Turtle: a broad foot with short claws along the front.
  "🐢": (
    <>
      <path d="M10 8.500c4.4 0 7.5 3.3 7.5 7.500s-3.1 7.5-7.5 7.5-7.5-3.3-7.5-7.5 3.1-7.5 7.5-7.500z" />
      <path d="M3.6 8.600L2.4 5.200M7.4 6.200L6.8 2.600M12.6 6.200l.6-3.600M16.4 8.600l1.2-3.4" fill="none" strokeWidth={2.2} strokeLinecap="round" />
    </>
  ),
  // Bee: six tiny feet, three on each side.
  "🐝": (
    <>
      <circle cx="5.5" cy="5" r="2.2" />
      <circle cx="14.5" cy="5" r="2.2" />
      <circle cx="4" cy="13" r="2.2" />
      <circle cx="16" cy="13" r="2.2" />
      <circle cx="5.5" cy="21" r="2.2" />
      <circle cx="14.5" cy="21" r="2.2" />
    </>
  ),
};

/** Two prints, one a step ahead of the other: one step of the lesson, filled once the child has reached it. */
function Prints({ avatar, done }: { avatar: string; done: boolean }) {
  const print = PRINTS[avatar] ?? PRINTS["🦊"];
  const colour = done ? BRAND : "#c9cddb";
  return (
    <svg viewBox="0 0 46 34" className="h-10 w-[3.4rem]" aria-hidden="true" fill={colour} stroke={colour} strokeWidth={1.2}>
      <g transform="translate(1 7) rotate(-8 10 13)">{print}</g>
      <g transform="translate(25 1) rotate(8 10 13)">{print}</g>
    </svg>
  );
}

/**
 * Progress through the lesson as a trail of prints: watch, then the three
 * drawing steps. The prints are those of the animal in the child's picture.
 */
export function Footprints({ reached, labels, avatar }: { reached: number; labels: string[]; avatar: string }) {
  return (
    <ol className="flex gap-2" aria-label="Steps of the lesson">
      {labels.map((label, i) => (
        <li key={label} aria-label={label} aria-current={i === reached ? "step" : undefined}>
          <Prints avatar={avatar} done={i <= reached} />
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
