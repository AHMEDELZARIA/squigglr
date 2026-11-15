// Example drawings for the pass mark (BR-008): for a given mark, a complete
// drawing of the figure with as many extra lines as that mark still lets
// through. They are made here, not stored, so they always agree with the
// scoring in evaluation.ts.

import { boundingBox, length } from "./geometry";
import type { Figure, Stroke } from "./types";

const toStroke = (points: { x: number; y: number }[]): Stroke => ({
  points: points.map((p, i) => ({ ...p, t: i })),
});

/**
 * The figure drawn exactly, plus a zigzag in the middle of it that lies off
 * the figure. The zigzag is just short enough that the share of the drawing
 * on the figure stays at the mark.
 */
export function passingExample(figure: Figure, mark: number): Stroke[] {
  const figureLength = figure.parts.reduce((sum, p) => sum + length(p), 0);
  // onFigure = figureLength / (figureLength + extra) >= mark / 100, with a small margin.
  const extra = figureLength * (100 / mark - 1) * 0.94;

  const box = boundingBox(figure.parts);
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  const half = Math.min(box.maxX - box.minX, box.maxY - box.minY) * 0.28;
  const rowGap = half / 3;

  const zigzag = [{ x: cx - half, y: cy - half }];
  let left = extra;
  let row = 0;
  while (left > 0 && row < 7) {
    const y = cy - half + row * rowGap;
    const fromLeft = row % 2 === 0;
    const run = Math.min(left, 2 * half);
    zigzag.push({ x: fromLeft ? cx - half + run : cx + half - run, y });
    left -= run;
    if (left <= 0) break;
    const drop = Math.min(left, rowGap);
    zigzag.push({ x: fromLeft ? cx + half : cx - half, y: y + drop });
    left -= drop;
    row += 1;
  }

  return [...figure.parts.map(toStroke), toStroke(zigzag)];
}
