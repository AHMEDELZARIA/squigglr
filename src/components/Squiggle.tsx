/** The wavy line from the presentation: the mark beside the name. */
interface SquiggleProps {
  className?: string;
  colour?: string;
}

export function Squiggle({ className = "", colour = "#5e51b8" }: SquiggleProps) {
  return (
    <svg viewBox="0 0 64 20" className={className} aria-hidden="true" fill="none">
      <path
        d="M3 12 C 9 0, 15 0, 21 10 S 33 20, 39 10 S 51 0, 61 9"
        stroke={colour}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </svg>
  );
}
