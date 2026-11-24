import Link from "next/link";
import { BackIcon } from "./icons";
import { Squiggle } from "./Squiggle";

// The frame every screen sits in. It follows the lo-fi prototype: one
// rounded "tablet" with the heading in the middle, Back on the left.

export const buttonClass =
  "inline-flex items-center gap-2 rounded-2xl border-2 border-edge bg-white px-4 py-2 text-lg font-bold text-ink hover:bg-lavender";

interface FrameProps {
  children: React.ReactNode;
  className?: string;
  /** The name above the frame. Left off the lesson, where the height is needed for drawing. */
  brand?: boolean;
}

export function Frame({
  children,
  className = "",
  brand = true,
}: FrameProps) {
  return (
    <div className="mx-auto max-w-5xl">
      {brand && (
        <div className="mb-3 flex items-center gap-2 px-2 text-xl font-bold">
          Squigglr
          <Squiggle className="w-9" />
        </div>
      )}
      <div className={`relative rounded-[2rem] border border-edge shadow-card bg-white p-5 sm:p-8 ${className}`}>{children}</div>
    </div>
  );
}

interface ScreenProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Where Back goes; no Back button when left out. */
  back?: string;
  /** Shown in the top right corner. */
  right?: React.ReactNode;
  children: React.ReactNode;
}

export function Screen({
  title,
  subtitle,
  back,
  right,
  children,
}: ScreenProps) {
  return (
    <Frame className="min-h-[38rem]">
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
        <div>
          {back && (
            <Link href={back} className={buttonClass}>
              <BackIcon className="h-5 w-5" />
              Back
            </Link>
          )}
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-lg text-muted">{subtitle}</p>}
        </div>
        <div className="flex justify-end">{right}</div>
      </div>
      {children}
    </Frame>
  );
}
