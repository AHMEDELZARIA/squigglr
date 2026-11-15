// M07 Attempt Evaluation. Scores the strokes of an attempt against a lesson's
// figure, exactly as SRS Section 9.2 defines it. Stateless and deterministic.

import { boundingBox, diagonal, distance, fitToBox, length, lengthWithin, toPath } from "./geometry";
import type { Difficulty, DrawingStage, Evaluation, Figure, Path, Stroke } from "./types";

/** Largest distance that counts as "on the figure", in percent of the figure's diagonal. */
export const TRACE_TOL = 5;
/** Share of a required part that must be drawn for the part to count, in percent. */
export const PART_COVER = 90;

export type Evaluate = (
  strokes: Stroke[],
  figure: Figure,
  stage: DrawingStage,
  allowed: Difficulty[],
  stagePass: number,
) => Evaluation;

export function tolerance(figure: Figure): number {
  return (TRACE_TOL / 100) * diagonal(boundingBox(figure.parts));
}

function isValid(strokes: Stroke[], tol: number): boolean {
  if (strokes.length === 0) return false;
  for (const s of strokes) {
    if (s.points.length === 0) return false;
    for (const p of s.points) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
    }
  }
  // A tap or a mark shorter than the tolerance is too little to judge.
  const total = strokes.reduce((sum, s) => sum + length(toPath(s)), 0);
  return total >= tol;
}

export const evaluate: Evaluate = (strokes, figure, stage, allowed, stagePass) => {
  if (figure.parts.length === 0) throw new Error("emptyFigure");
  const guidance = stage === "I" ? "independent" : "assisted";
  const tol = tolerance(figure);

  if (!isValid(strokes, tol)) {
    return { class: "invalid", guidance, result: 0, passed: false, difficulties: [], drawn: 0, onFigure: 0 };
  }

  // With no guide, where and how big the child drew does not matter.
  let drawnPaths: Path[] = strokes.map(toPath);
  if (stage === "I") drawnPaths = fitToBox(drawnPaths, boundingBox(figure.parts));

  const found: Difficulty[] = [];

  // Share of the figure that was drawn, and which required parts are missing.
  let figureLength = 0;
  let figureCovered = 0;
  figure.parts.forEach((part, index) => {
    const partLength = length(part);
    const covered = lengthWithin(part, drawnPaths, tol);
    figureLength += partLength;
    figureCovered += covered;
    if (covered < (PART_COVER / 100) * partLength) found.push({ kind: "missedPart", index });
  });

  figure.endpoints.forEach((endpoint, index) => {
    if (distance(endpoint, drawnPaths) > tol) found.push({ kind: "missedEndpoint", index });
  });

  // Share of what was drawn that lies on the figure.
  const drawnLength = drawnPaths.reduce((sum, p) => sum + length(p), 0);
  const drawnOnFigure = drawnPaths.reduce((sum, p) => sum + lengthWithin(p, figure.parts, tol), 0);

  const drawn = figureCovered / figureLength;
  const onFigure = drawnOnFigure / drawnLength;
  const result = 100 * Math.min(drawn, onFigure);

  const complete = found.length === 0;
  if (100 * onFigure < stagePass) found.push({ kind: "offFigure", index: 0 });

  return {
    class: complete ? "complete" : "incomplete",
    guidance,
    result,
    passed: complete && result >= stagePass,
    // Only the difficulties the team predefined for this stage are reported.
    difficulties: found.filter((d) => allowed.some((a) => a.kind === d.kind && a.index === d.index)),
    drawn,
    onFigure,
  };
};
