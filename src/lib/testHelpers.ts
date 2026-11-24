// Helpers for the unit tests: prepared strokes.

import type { Path, Point, Stroke, TimedPoint } from "./types";

/** A stroke through the given points, with extra points every 10 units, like real input. */
export function stroke(...points: Point[]): Stroke {
  const out: TimedPoint[] = [];
  points.forEach((p, i) => {
    if (i === 0) {
      out.push({ x: p.x, y: p.y, t: 0 });
      return;
    }
    const a = points[i - 1];
    const n = Math.max(1, Math.ceil(Math.hypot(p.x - a.x, p.y - a.y) / 10));
    for (let j = 1; j <= n; j++) {
      out.push({ x: a.x + ((p.x - a.x) * j) / n, y: a.y + ((p.y - a.y) * j) / n, t: out.length });
    }
  });
  return { points: out };
}

export const strokeOf = (path: Path): Stroke => stroke(...path);

/** A closed square drawn in one stroke, moved by (dx, dy) and scaled about its centre. */
export function squareStroke(dx = 0, dy = 0, scale = 1): Stroke {
  const c = (v: number) => 500 + (v - 500) * scale;
  const p = (x: number, y: number) => ({ x: c(x) + dx, y: c(y) + dy });
  return stroke(p(250, 250), p(750, 250), p(750, 750), p(250, 750), p(250, 250));
}
