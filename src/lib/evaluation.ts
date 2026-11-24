// M07 Attempt Evaluation. Scores the strokes of an attempt against a lesson's
// figure, as SRS Section 9.2 defines it. Stateless and deterministic.

import {
  IDENTITY,
  applyAll,
  biggestGroup,
  boundingBox,
  boxFit,
  diagonal,
  distance,
  length,
  lengthWithin,
  refineFit,
  sample,
  strokeGroups,
  toPath,
  trimmedBox,
} from "./geometry";
import {
  GROUP_GAP,
  MIN_DRAW_SCALE,
  NUDGE_MAX_SCALE,
  NUDGE_REACH,
  PART_COVER,
  SAMPLE_STEP,
  TRACE_TOL,
  TRIM_SHARE,
} from "./constants";
import type { DrawingProblem, DrawingStage, Evaluation, Figure, Fit, Path, Stroke } from "./types";

export type Evaluate = (
  strokes: Stroke[],
  figure: Figure,
  stage: DrawingStage,
  allowed: DrawingProblem[],
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

interface Score {
  found: DrawingProblem[];
  drawn: number;
  onFigure: number;
  result: number;
}

/** Scores paths that already lie where they are to be compared with the figure. */
function score(paths: Path[], figure: Figure, tol: number): Score {
  const found: DrawingProblem[] = [];

  // Share of the figure that was drawn, and which required parts are missing.
  let figureLength = 0;
  let figureCovered = 0;
  figure.parts.forEach((part, index) => {
    const partLength = length(part);
    const covered = lengthWithin(part, paths, tol);
    figureLength += partLength;
    figureCovered += covered;
    if (covered < (PART_COVER / 100) * partLength) found.push({ kind: "missedPart", index });
  });

  figure.endpoints.forEach((endpoint, index) => {
    if (distance(endpoint, paths) > tol) found.push({ kind: "missedEndpoint", index });
  });

  // Share of what was drawn that lies on the figure.
  const drawnLength = paths.reduce((sum, p) => sum + length(p), 0);
  const drawnOnFigure = paths.reduce((sum, p) => sum + lengthWithin(p, figure.parts, tol), 0);

  const drawn = figureCovered / figureLength;
  const onFigure = drawnOnFigure / drawnLength;
  return { found, drawn, onFigure, result: 100 * Math.min(drawn, onFigure) };
}

export const evaluate: Evaluate = (strokes, figure, stage, allowed, stagePass) => {
  if (figure.parts.length === 0) throw new Error("emptyFigure");
  const guidance = stage === "I" ? "independent" : "assisted";
  const tol = tolerance(figure);

  if (!isValid(strokes, tol)) {
    return {
      class: "invalid",
      guidance,
      result: 0,
      passed: false,
      problems: [],
      drawn: 0,
      onFigure: 0,
      fit: IDENTITY,
    };
  }

  const original = strokes.map(toPath);
  let fit: Fit = IDENTITY;
  let best = score(original, figure, tol);
  let tooSmall = false;
  let stretched = false;

  if (stage === "I") {
    // With no guide, where and how big the child drew does not matter: the
    // whole drawing is moved and uniformly scaled onto the figure before it
    // is scored. Four ways of laying it over the figure are tried, and the
    // one that scores best is kept:
    //  1. by its bounding box, exactly as the SRS states it;
    //  2. by the box of the bulk of the drawing, so that a short stray mark or
    //     a line that runs on past a corner does not throw everything off;
    //  3. the second, nudged a little (at most 5% in size and one tolerance
    //     in position) towards the closest fit.
    //  4. by the box of the biggest group of strokes only, so that a long line
    //     or a second shape drawn away from the main drawing does not stretch
    //     the box. The other strokes are still scored, so they still count as
    //     off the shape. This fit only wins when it finds fewer missing parts
    //     (or as many, with a higher result), so it changes nothing else.
    const figureBox = boundingBox(figure.parts);
    const points = sample(original, SAMPLE_STEP);
    const byBulk = boxFit(trimmedBox(points, TRIM_SHARE / 100), figureBox);
    const candidates = [
      boxFit(boundingBox(original), figureBox),
      byBulk,
      refineFit(points, sample(figure.parts, SAMPLE_STEP), byBulk, NUDGE_REACH * tol, NUDGE_MAX_SCALE, tol),
    ];
    const wholeBox = boundingBox(original);
    const wholeLonger = Math.max(wholeBox.maxX - wholeBox.minX, wholeBox.maxY - wholeBox.minY);
    const groups = strokeGroups(original, (GROUP_GAP / 100) * wholeLonger);
    if (groups.length > 1) {
      candidates.push(boxFit(boundingBox(biggestGroup(groups)), figureBox));
    }
    const better = (a: Score, b: Score) =>
      a.found.length !== b.found.length ? a.found.length < b.found.length : a.result > b.result;

    fit = candidates[0];
    best = score(applyAll(fit, original), figure, tol);
    for (const candidate of candidates.slice(1)) {
      const other = score(applyAll(candidate, original), figure, tol);
      if (better(other, best)) {
        fit = candidate;
        best = other;
      }
    }

    // If parts seem to be missing, check whether the drawing is the right
    // shape pulled out of proportion, such as a rectangle for a square. Laid
    // over the figure by width and height separately, such a drawing has
    // every part. Then nothing is missing: the drawing is stretched, and the
    // child is told that, not shown a glow beside lines they did draw.
    if (best.found.length > 0) {
      for (const box of [trimmedBox(points, TRIM_SHARE / 100), boundingBox(original)]) {
        const w = box.maxX - box.minX;
        const h = box.maxY - box.minY;
        if (w === 0 || h === 0) continue;
        const sx = (figureBox.maxX - figureBox.minX) / w;
        const sy = (figureBox.maxY - figureBox.minY) / h;
        const pulled = original.map((path) =>
          path.map((p) => ({
            x: figureBox.minX + (p.x - box.minX) * sx,
            y: figureBox.minY + (p.y - box.minY) * sy,
          })),
        );
        const asPulled = score(pulled, figure, tol);
        if (asPulled.found.length === 0) {
          stretched = true;
          best = { ...best, found: [], onFigure: asPulled.onFigure };
          break;
        }
      }
    }

    // It must still be a real drawing of the shape, not a speck.
    const box = boundingBox(original);
    const longer = Math.max(box.maxX - box.minX, box.maxY - box.minY);
    const figureLonger = Math.max(figureBox.maxX - figureBox.minX, figureBox.maxY - figureBox.minY);
    tooSmall = longer < (MIN_DRAW_SCALE / 100) * figureLonger;
  }

  const found = [...best.found];
  const complete = found.length === 0 && !tooSmall && !stretched;
  if (stretched) found.push({ kind: "stretched", index: 0 });
  if (tooSmall) found.push({ kind: "tooSmall", index: 0 });
  if (100 * best.onFigure < stagePass) found.push({ kind: "offFigure", index: 0 });

  return {
    class: complete ? "complete" : "incomplete",
    guidance,
    result: best.result,
    passed: complete && best.result >= stagePass,
    // Only the problems the team predefined for this stage are reported.
    problems: found.filter((d) => allowed.some((a) => a.kind === d.kind && a.index === d.index)),
    drawn: best.drawn,
    onFigure: best.onFigure,
    fit,
  };
};
