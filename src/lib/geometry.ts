// M20 Geometry. Pure functions on points and paths. Nothing here knows about
// the canvas, the browser or a drawing library.

import { MEASURE_STEP } from "./constants";
import type { Fit, Path, Point, Stroke } from "./types";

export interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function toPath(stroke: Stroke): Path {
  return stroke.points.map((p) => ({ x: p.x, y: p.y })); // the same points without their times
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
 * `others`. The path is cut into pieces no longer than MEASURE_STEP units; a piece counts
 * when its midpoint is within d.
 */
export function lengthWithin(path: Path, others: Path[], d: number): number {
  const step = MEASURE_STEP;
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

/** The longer of the box's width and height. */
export function longerSide(box: Box): number {
  return Math.max(box.maxX - box.minX, box.maxY - box.minY);
}

/**
 * Lays paths over a target box by width and height separately: the left edge
 * of `box` goes to the target's left edge, its right edge to the target's
 * right edge, and the same for top and bottom. Unlike boxFit, this can
 * stretch a drawing, for example a rectangle into a square.
 */
export function stretchOnto(paths: Path[], box: Box, target: Box): Path[] {
  const sx = (target.maxX - target.minX) / (box.maxX - box.minX);
  const sy = (target.maxY - target.minY) / (box.maxY - box.minY);
  return paths.map((path) =>
    path.map((p) => ({
      x: target.minX + (p.x - box.minX) * sx,
      y: target.minY + (p.y - box.minY) * sy,
    })),
  );
}

export function diagonal(box: Box): number {
  return Math.hypot(box.maxX - box.minX, box.maxY - box.minY);
}

/** The move and uniform scale that lay `box` over `target`: centres together, longer sides equal. */
export function boxFit(box: Box, target: Box): Fit {
  const longer = longerSide(box);
  let scale = 1; // a single point cannot be scaled; it is only moved
  if (longer > 0) {
    scale = longerSide(target) / longer;
  }
  return {
    scale: scale,
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

export function apply(fit: Fit, p: Point): Point {
  return { x: p.x * fit.scale + fit.dx, y: p.y * fit.scale + fit.dy };
}
export function applyAll(fit: Fit, paths: Path[]): Path[] {
  return paths.map((path) => path.map((p) => apply(fit, p)));
}
/** The Fit that undoes `fit`. */
export function inverse(fit: Fit): Fit {
  return { scale: 1 / fit.scale, dx: -fit.dx / fit.scale, dy: -fit.dy / fit.scale };
}

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

/** The smallest distance between any point of path a and any line of path b. */
function pathGap(a: Path, b: Path): number {
  let best = Infinity;
  for (const p of a) {
    const d = distance(p, [b]);
    if (d < best) {
      best = d;
    }
  }
  return best;
}

/**
 * Splits the strokes into groups of strokes that touch or nearly touch.
 * Two strokes are in the same group when they come within `gap` units of
 * each other, directly or through other strokes of the group. For example a
 * square drawn as four separate sides is one group, and a line drawn far away
 * from it is a second group.
 *
 * Returns the groups, each a list of paths.
 */
export function strokeGroups(paths: Path[], gap: number): Path[][] {
  // groupOf[i] is the group number of stroke i. Every stroke starts alone.
  const groupOf: number[] = [];
  for (let i = 0; i < paths.length; i++) {
    groupOf.push(i);
  }

  // Join two groups: every stroke of group `from` moves to group `to`.
  const join = (from: number, to: number) => {
    for (let i = 0; i < groupOf.length; i++) {
      if (groupOf[i] === from) {
        groupOf[i] = to;
      }
    }
  };

  for (let i = 0; i < paths.length; i++) {
    for (let j = i + 1; j < paths.length; j++) {
      const close = pathGap(paths[i], paths[j]) <= gap || pathGap(paths[j], paths[i]) <= gap;
      if (close && groupOf[i] !== groupOf[j]) {
        join(groupOf[j], groupOf[i]);
      }
    }
  }

  // Collect the strokes of each group number into a list.
  const byNumber = new Map<number, Path[]>();
  for (let i = 0; i < paths.length; i++) {
    const number = groupOf[i];
    let group = byNumber.get(number);
    if (group === undefined) {
      group = [];
      byNumber.set(number, group);
    }
    group.push(paths[i]);
  }
  return Array.from(byNumber.values());
}

/** The group with the most line in it (the longest total length). */
export function biggestGroup(groups: Path[][]): Path[] {
  let best: Path[] = [];
  let bestLength = -1;
  for (const group of groups) {
    let total = 0;
    for (const path of group) {
      total += length(path);
    }
    if (total > bestLength) {
      best = group;
      bestLength = total;
    }
  }
  return best;
}
