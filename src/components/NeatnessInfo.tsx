"use client";

import { passingExample } from "@/lib/examples";
import type { Figure } from "@/lib/types";
import { StrokePreview } from "./StrokePreview";

// The "i" pop-up beside Neatness (prototype S3-info). It shows, for each
// choice, an example drawing that still moves the child on (BR-008). The
// examples are made from the scoring itself, so they are always true to it.

export const NEATNESS = [
  { mark: 70, name: "Low", text: "Moves on even with a lot of extra lines. Good when just starting." },
  { mark: 80, name: "Medium", text: "Moves on when most of the lines are on the shape." },
  { mark: 90, name: "High", text: "Moves on only when nearly every line is on the shape. Can feel hard." },
];

interface NeatnessInfoProps {
  figure: Figure;
  avatar: string;
  /** Called when the adult closes the pop-up. */
  onClose: () => void;
}

export function NeatnessInfo({ figure, avatar, onClose }: NeatnessInfoProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-label="Neatness">
      <div className="max-h-full w-full max-w-3xl overflow-auto rounded-3xl border border-edge shadow-card bg-white p-6 sm:p-8">
        <h2 className="text-3xl font-bold">Neatness</h2>
        <p className="mt-2 text-lg">
          How neat {avatar}&apos;s drawing has to be before the lesson moves on to the next step. Every part of the
          shape always has to be drawn. Neatness sets how many lines may lie away from the shape.
        </p>
        <p className="mt-4 font-bold text-muted">The messiest drawing that still moves on:</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {NEATNESS.map(({ mark, name, text }) => (
            <div key={mark} className="text-center">
              <div className="flex justify-center">
                <StrokePreview strokes={passingExample(figure, mark)} figure={figure} size="lg" />
              </div>
              <p className="mt-2 text-xl font-bold">
                {name}
                {mark === 80 && " (recommended)"}
              </p>
              <p className="text-muted">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-2xl border-2 border-edge bg-white px-8 py-2 text-xl font-bold hover:bg-lavender"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
