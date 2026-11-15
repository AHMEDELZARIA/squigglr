/** The wavy line from the presentation: the mark beside the name and on each page title. */
export function Squiggle({ className = "", colour = "#5e51b8" }: { className?: string; colour?: string }) {
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

/** A page title in the style of a slide: serif heading, grey subtitle, squiggle on the right. */
export function PageTitle({ title, subtitle }: { title: React.ReactNode; subtitle: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-muted">{subtitle}</p>
      </div>
      <Squiggle className="mt-2 hidden w-16 shrink-0 sm:block" />
    </div>
  );
}
