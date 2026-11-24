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
  longerSide,
  refineFit,
  sample,
  stretchOnto,
  strokeGroups,
  toPath,
  trimmedBox,
  type Box,
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
import type { DrawingProblem, DrawingStage, EvalClass, Evaluation, Figure, Fit, Guidance, Path, Point, Stroke } from "./types";

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
    if (covered < (PART_COVER / 100) * partLength) found.push({ kind: "missedPart", index: index });
  });

  figure.endpoints.forEach((endpoint, index) => {
    if (distance(endpoint, paths) > tol) found.push({ kind: "missedEndpoint", index: index });
  });

  // Share of what was drawn that lies on the figure.
  const drawnLength = paths.reduce((sum, p) => sum + length(p), 0);
  const drawnOnFigure = paths.reduce((sum, p) => sum + lengthWithin(p, figure.parts, tol), 0);

  const drawn = figureCovered / figureLength;
  const onFigure = drawnOnFigure / drawnLength;
  return { found, drawn, onFigure, result: 100 * Math.min(drawn, onFigure) };
}

/** Whether score `a` is better than score `b`: fewer missing parts first, then a higher result. */
function better(a: Score, b: Score): boolean {
  if (a.found.length !== b.found.length) {
    return a.found.length < b.found.length;
  }
  return a.result > b.result;
}

/** A way of laying the drawing over the figure, with the score it gives. */
interface ScoredFit {
  fit: Fit;
  score: Score;
}

/**
 * With no guide, where and how big the child drew does not matter: the whole
 * drawing is moved and uniformly scaled onto the figure before it is scored.
 * Four ways of laying it over the figure are tried, and the one that scores
 * best is kept:
 *  1. by its bounding box, exactly as the SRS states it;
 *  2. by its trimmed box (the box of the bulk of the drawing), so that a
 *     short stray mark or a line that runs on past a corner does not throw
 *     everything off;
 *  3. the second, nudged a little (at most 5% in size and one tolerance in
 *     position) towards the closest fit;
 *  4. by the box of the biggest group of strokes only, so that a long line or
 *     a second shape drawn away from the main drawing does not stretch the
 *     box. The other strokes are still scored, so they still count as off the
 *     shape. This fit only wins when it finds fewer missing parts (or as
 *     many, with a higher result), so it changes nothing else.
 */
function bestFit(drawing: Path[], points: Point[], figure: Figure, tol: number): ScoredFit {
  const figureBox = boundingBox(figure.parts);
  const byBulk = boxFit(trimmedBox(points, TRIM_SHARE / 100), figureBox);
  const candidates: Fit[] = [
    boxFit(boundingBox(drawing), figureBox),
    byBulk,
    refineFit(points, sample(figure.parts, SAMPLE_STEP), byBulk, NUDGE_REACH * tol, NUDGE_MAX_SCALE, tol),
  ];
  const gap = (GROUP_GAP / 100) * longerSide(boundingBox(drawing));
  const groups = strokeGroups(drawing, gap);
  if (groups.length > 1) {
    candidates.push(boxFit(boundingBox(biggestGroup(groups)), figureBox));
  }

  let best: ScoredFit = { fit: candidates[0], score: score(applyAll(candidates[0], drawing), figure, tol) };
  for (let i = 1; i < candidates.length; i++) {
    const other = score(applyAll(candidates[i], drawing), figure, tol);
    if (better(other, best.score)) {
      best = { fit: candidates[i], score: other };
    }
  }
  return best;
}

/**
 * If parts seem to be missing, checks whether the drawing is the right shape
 * pulled out of proportion, such as a rectangle for a square. Laid over the
 * figure by width and height separately, such a drawing has every part.
 * Returns the score of the stretched drawing if it has every part, or null.
 */
function stretchedScore(drawing: Path[], points: Point[], figure: Figure, tol: number): Score | null {
  const figureBox = boundingBox(figure.parts);
  const boxes: Box[] = [trimmedBox(points, TRIM_SHARE / 100), boundingBox(drawing)];
  for (const box of boxes) {
    const flat = box.maxX - box.minX === 0 || box.maxY - box.minY === 0;
    if (flat) {
      continue; // a straight line cannot be stretched into a shape
    }
    const asPulled = score(stretchOnto(drawing, box, figureBox), figure, tol);
    if (asPulled.found.length === 0) {
      return asPulled;
    }
  }
  return null;
}

/** With no guide, a drawing smaller than MIN_DRAW_SCALE of the figure is a speck, not a drawing of the shape. */
function isTooSmall(drawing: Path[], figure: Figure): boolean {
  const longer = longerSide(boundingBox(drawing));
  const figureLonger = longerSide(boundingBox(figure.parts));
  return longer < (MIN_DRAW_SCALE / 100) * figureLonger;
}

/** The result for input too small or broken to judge. */
function invalidEvaluation(guidance: Guidance): Evaluation {
  return { class: "invalid", guidance: guidance, result: 0, passed: false, problems: [], drawn: 0, onFigure: 0, fit: IDENTITY };
}

/**
 * Scores an attempt, in five steps:
 *  1. input too small or broken to judge is "invalid";
 *  2. with a guide, the drawing is scored where it is;
 *     with no guide, it is first laid over the figure by the best fit;
 *  3. with no guide, a drawing with parts missing may be a stretched version of the shape;
 *  4. with no guide, a drawing may be too small;
 *  5. the problems found are listed, and the attempt passes if it is complete
 *     and its result reaches the pass mark.
 */
export const evaluate: Evaluate = (strokes, figure, stage, allowed, stagePass) => {
  if (figure.parts.length === 0) throw new Error("emptyFigure");
  let guidance: Guidance = "assisted";
  if (stage === "I") {
    guidance = "independent";
  }
  const tol = tolerance(figure);

  // 1. Something to judge?
  if (!isValid(strokes, tol)) {
    return invalidEvaluation(guidance);
  }

  // 2. Score the drawing: where it is, or laid over the figure.
  const drawing = strokes.map(toPath);
  let fit: Fit = IDENTITY;
  let best = score(drawing, figure, tol);
  let stretched = false;
  let tooSmall = false;
  if (stage === "I") {
    const points = sample(drawing, SAMPLE_STEP);
    const chosen = bestFit(drawing, points, figure, tol);
    fit = chosen.fit;
    best = chosen.score;

    // 3. Parts missing only because the shape is pulled out of proportion?
    if (best.found.length > 0) {
      const asPulled = stretchedScore(drawing, points, figure, tol);
      if (asPulled !== null) {
        stretched = true;
        // Nothing is missing: the child is told "stretched", not shown a glow beside lines they did draw.
        best = { found: [], drawn: best.drawn, onFigure: asPulled.onFigure, result: best.result };
      }
    }

    // 4. Big enough to be a drawing of the shape?
    tooSmall = isTooSmall(drawing, figure);
  }

  // 5. The problems, and the verdict.
  const found: DrawingProblem[] = best.found.slice();
  const complete = found.length === 0 && !tooSmall && !stretched;
  if (stretched) {
    found.push({ kind: "stretched", index: 0 });
  }
  if (tooSmall) {
    found.push({ kind: "tooSmall", index: 0 });
  }
  if (100 * best.onFigure < stagePass) {
    found.push({ kind: "offFigure", index: 0 });
  }
  // Only the problems the team predefined for this stage are reported.
  const reported = found.filter((d) => allowed.some((a) => a.kind === d.kind && a.index === d.index));

  let evalClass: EvalClass = "incomplete";
  if (complete) {
    evalClass = "complete";
  }
  return {
    class: evalClass,
    guidance: guidance,
    result: best.result,
    passed: complete && best.result >= stagePass,
    problems: reported,
    drawn: best.drawn,
    onFigure: best.onFigure,
    fit: fit,
  };
};
