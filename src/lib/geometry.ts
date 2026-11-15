// M20 Geometry. Pure functions on points and paths. Nothing here knows about
// the canvas, the browser or a drawing library.

import type { Fit, Path, Point, Stroke } from "./types";

export interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function toPath(stroke: Stroke): Path {
  return stroke.points.map(({ x, y }) => ({ x, y }));
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Length of a path; 0 for a path with fewer than two points. */
export function length(path: Path): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += dist(path[i - 1], path[i]);
  return total;
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/** Smallest distance from p to any of the paths. Infinity if there is no point. */
export function distance(p: Point, paths: Path[]): number {
  let best = Infinity;
  for (const path of paths) {
    if (path.length === 1) best = Math.min(best, dist(p, path[0]));
    for (let i = 1; i < path.length; i++) {
      best = Math.min(best, distanceToSegment(p, path[i - 1], path[i]));
    }
  }
  return best;
}

/**
 * Length of the parts of `path` that are within distance d of a path in
 * `others`. The path is cut into pieces no longer than `step`; a piece counts
 * when its midpoint is within d.
 */
export function lengthWithin(path: Path, others: Path[], d: number, step = 4): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const segLen = dist(a, b);
    if (segLen === 0) continue;
    const pieces = Math.max(1, Math.ceil(segLen / step));
    const pieceLen = segLen / pieces;
    for (let j = 0; j < pieces; j++) {
      const t = (j + 0.5) / pieces;
      const mid = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      if (distance(mid, others) <= d) total += pieceLen;
    }
  }
  return total;
}

export function boundingBox(paths: Path[]): Box {
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const path of paths) {
    for (const p of path) {
      box.minX = Math.min(box.minX, p.x);
      box.minY = Math.min(box.minY, p.y);
      box.maxX = Math.max(box.maxX, p.x);
      box.maxY = Math.max(box.maxY, p.y);
    }
  }
  return box;
}

export function diagonal(box: Box): number {
  return Math.hypot(box.maxX - box.minX, box.maxY - box.minY);
}

/** The move and uniform scale that lay `box` over `target`: centres together, longer sides equal. */
export function boxFit(box: Box, target: Box): Fit {
  const longer = Math.max(box.maxX - box.minX, box.maxY - box.minY);
  const targetLonger = Math.max(target.maxX - target.minX, target.maxY - target.minY);
  const scale = longer > 0 ? targetLonger / longer : 1;
  return {
    scale,
    dx: (target.minX + target.maxX) / 2 - ((box.minX + box.maxX) / 2) * scale,
    dy: (target.minY + target.maxY) / 2 - ((box.minY + box.maxY) / 2) * scale,
  };
}

/**
 * The bounding box of the bulk of the points: on each side, the outermost
 * `trim` share of the points is left out. A short stray mark, or a line that
 * runs on past a corner, then no longer stretches the box.
 */
export function trimmedBox(points: Point[], trim: number): Box {
  const xs = points.map((p) => p.x).sort((a, b) => a - b);
  const ys = points.map((p) => p.y).sort((a, b) => a - b);
  const at = (sorted: number[], share: number) => sorted[Math.round(share * (sorted.length - 1))];
  return { minX: at(xs, trim), minY: at(ys, trim), maxX: at(xs, 1 - trim), maxY: at(ys, 1 - trim) };
}

export const IDENTITY: Fit = { scale: 1, dx: 0, dy: 0 };

export const apply = (fit: Fit, p: Point): Point => ({ x: p.x * fit.scale + fit.dx, y: p.y * fit.scale + fit.dy });
export const applyAll = (fit: Fit, paths: Path[]): Path[] => paths.map((path) => path.map((p) => apply(fit, p)));
/** The Fit that undoes `fit`. */
export const inverse = (fit: Fit): Fit => ({ scale: 1 / fit.scale, dx: -fit.dx / fit.scale, dy: -fit.dy / fit.scale });

/** Points along the paths, no more than `step` apart. */
export function sample(paths: Path[], step: number): Point[] {
  const out: Point[] = [];
  for (const path of paths) {
    if (path.length === 1) out.push(path[0]);
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1];
      const b = path[i];
      const pieces = Math.max(1, Math.ceil(dist(a, b) / step));
      for (let j = i === 1 ? 0 : 1; j <= pieces; j++) {
        out.push({ x: a.x + ((b.x - a.x) * j) / pieces, y: a.y + ((b.y - a.y) * j) / pieces });
      }
    }
  }
  return out;
}

/**
 * Nudges a Fit so that the drawing lies more closely over the figure. Each
 * round pairs every drawn point with its nearest figure point, and every
 * figure point with its nearest drawn point, leaves out pairs further apart
 * than `reach`, and solves for the scale and move that bring the pairs
 * closest together.
 *
 * It is only a nudge: the scale may change by at most `maxScale` (1.05 is 5%)
 * and the drawing may move by at most `maxShift`. Without those limits the
 * search could shrink a square until it sat inside a circle's tolerance.
 */
export function refineFit(
  drawn: Point[],
  figure: Point[],
  start: Fit,
  reach: number,
  maxScale: number,
  maxShift: number,
): Fit {
  if (drawn.length === 0) return start;
  const centre = {
    x: drawn.reduce((sum, p) => sum + p.x, 0) / drawn.length,
    y: drawn.reduce((sum, p) => sum + p.y, 0) / drawn.length,
  };
  const home = apply(start, centre);
  const nearest = (p: Point, among: Point[]) => {
    let index = 0;
    let d = Infinity;
    for (let i = 0; i < among.length; i++) {
      const di = dist(p, among[i]);
      if (di < d) {
        d = di;
        index = i;
      }
    }
    return { index, d };
  };

  let fit = start;
  for (let round = 0; round < 10; round++) {
    const moved = drawn.map((p) => apply(fit, p));
    const from: Point[] = [];
    const to: Point[] = [];
    moved.forEach((q, i) => {
      const n = nearest(q, figure);
      if (n.d <= reach) {
        from.push(drawn[i]);
        to.push(figure[n.index]);
      }
    });
    figure.forEach((f) => {
      const n = nearest(f, moved);
      if (n.d <= reach) {
        from.push(drawn[n.index]);
        to.push(f);
      }
    });
    if (from.length < 3) break;

    const mean = (ps: Point[]) => ({
      x: ps.reduce((sum, p) => sum + p.x, 0) / ps.length,
      y: ps.reduce((sum, p) => sum + p.y, 0) / ps.length,
    });
    const a = mean(from);
    const b = mean(to);
    let num = 0;
    let den = 0;
    for (let i = 0; i < from.length; i++) {
      num += (from[i].x - a.x) * (to[i].x - b.x) + (from[i].y - a.y) * (to[i].y - b.y);
      den += (from[i].x - a.x) ** 2 + (from[i].y - a.y) ** 2;
    }
    if (den === 0) break;
    const scale = Math.min(start.scale * maxScale, Math.max(start.scale / maxScale, num / den));
    let next: Fit = { scale, dx: b.x - scale * a.x, dy: b.y - scale * a.y };
    // Keep the drawing's centre within maxShift of where the starting fit put it.
    const at = apply(next, centre);
    const moved2 = dist(at, home);
    if (moved2 > maxShift) {
      const k = maxShift / moved2;
      const target = { x: home.x + (at.x - home.x) * k, y: home.y + (at.y - home.y) * k };
      next = { scale, dx: target.x - scale * centre.x, dy: target.y - scale * centre.y };
    }
    fit = next;
  }
  return fit;
}

/**
 * Rubs out everything within `radius` of `centre`. A stroke that is cut
 * through becomes two strokes; what is left of a stroke keeps its points
 * and times.
 */
export function erase(strokes: Stroke[], centre: Point, radius: number): Stroke[] {
  const out: Stroke[] = [];
  for (const stroke of strokes) {
    // Add points along long gaps, so a stroke cannot slip through between two of its points.
    const dense: Stroke["points"] = [];
    stroke.points.forEach((p, i) => {
      if (i > 0) {
        const a = stroke.points[i - 1];
        const pieces = Math.ceil(dist(a, p) / (radius / 2));
        for (let j = 1; j < pieces; j++) {
          const k = j / pieces;
          dense.push({ x: a.x + (p.x - a.x) * k, y: a.y + (p.y - a.y) * k, t: a.t + (p.t - a.t) * k });
        }
      }
      dense.push(p);
    });
    if (!dense.some((p) => dist(p, centre) <= radius)) {
      out.push(stroke); // untouched: keep the stroke exactly as it was drawn
      continue;
    }
    let run: Stroke["points"] = [];
    for (const p of dense) {
      if (dist(p, centre) > radius) run.push(p);
      else {
        if (run.length > 1) out.push({ points: run });
        run = [];
      }
    }
    if (run.length > 1) out.push({ points: run });
  }
  return out;
}
