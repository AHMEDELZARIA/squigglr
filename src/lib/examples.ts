// Example drawings for the pass mark (BR-008): for a given mark, a complete
// drawing of the figure with as many extra lines as that mark still lets
// through. They are made here, not stored, so they always agree with the
// scoring in evaluation.ts.

import { boundingBox, length } from "./geometry";
import type { Figure, Point, Stroke, TimedPoint } from "./types";

// How the example zigzag is shaped. These only change how the example
// pictures look, not the scoring, so they stay in this file.
/** How long the zigzag is compared with the most the pass mark lets through: a little less, so it passes. */
const SAFETY_MARGIN = 0.94;
/** Half the width of the zigzag, as a share of the figure's shorter side. */
const ZIGZAG_HALF_WIDTH = 0.28;
/** The most rows the zigzag has. */
const ZIGZAG_MAX_ROWS = 7;

/** Turns a list of points into a stroke, giving each point a made-up time (its position in the list). */
function toStroke(points: Point[]): Stroke {
  const timed: TimedPoint[] = points.map((p, i) => ({ x: p.x, y: p.y, t: i }));
  return { points: timed };
}

/**
 * The figure drawn exactly, plus a zigzag in the middle of it that lies off
 * the figure. The zigzag is just short enough that the share of the drawing
 * on the figure stays at the mark.
 */
export function passingExample(figure: Figure, mark: number): Stroke[] {
  const figureLength = figure.parts.reduce((sum, p) => sum + length(p), 0);
  // onFigure = figureLength / (figureLength + extra) >= mark / 100, with a small margin.
  const extra = figureLength * (100 / mark - 1) * SAFETY_MARGIN;

  const box = boundingBox(figure.parts);
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  const half = Math.min(box.maxX - box.minX, box.maxY - box.minY) * ZIGZAG_HALF_WIDTH;
  const rowGap = half / 3;

  const zigzag: Point[] = [{ x: cx - half, y: cy - half }];
  let left = extra;
  let row = 0;
  while (left > 0 && row < ZIGZAG_MAX_ROWS) {
    const y = cy - half + row * rowGap;
    const fromLeft = row % 2 === 0;
    const run = Math.min(left, 2 * half);
    let endX = cx + half - run; // going right to left
    if (fromLeft) {
      endX = cx - half + run;
    }
    zigzag.push({ x: endX, y: y });
    left -= run;
    if (left <= 0) break;
    const drop = Math.min(left, rowGap);
    let sideX = cx - half;
    if (fromLeft) {
      sideX = cx + half;
    }
    zigzag.push({ x: sideX, y: y + drop });
    left -= drop;
    row += 1;
  }

  const strokes: Stroke[] = figure.parts.map(toStroke);
  strokes.push(toStroke(zigzag));
  return strokes;
}
