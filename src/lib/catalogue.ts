// M05 Lesson Catalogue. Lessons are data: adding a lesson means adding an
// entry to LESSONS, with no change to the rules (NFR-MAINT-001).
// The drawing area is 1000 x 1000 units, whatever the size of the screen.

import { ARC_PIECES } from "./constants";
import type { DrawingProblem, DrawingStage, Figure, Guide, Path, Point } from "./types";

/** The kinds of lesson in the SRS catalogue. The POC has shapes only. */
export type LessonCategory = "line" | "shape" | "simpleDrawing";

export interface Lesson {
  id: string;
  name: string;
  category: LessonCategory;
  /** The required parts, in the order the demonstration draws them, and the required endpoints. */
  figure: Figure;
}

/**
 * The point on a circle at an angle, in degrees clockwise from the top
 * (0 is the top, 90 the right, 180 the bottom, 270 the left).
 */
function pointOnCircle(centre: Point, radius: number, angle: number): Point {
  const radians = (angle * Math.PI) / 180;
  return { x: centre.x + radius * Math.sin(radians), y: centre.y - radius * Math.cos(radians) };
}

/** A piece of a circle, from one angle to another, as ARC_PIECES short straight lines. */
function arc(centre: Point, radius: number, from: number, to: number): Path {
  const path: Path = [];
  for (let i = 0; i <= ARC_PIECES; i++) {
    const angle = from + ((to - from) * i) / ARC_PIECES;
    path.push(pointOnCircle(centre, radius, angle));
  }
  return path;
}

/**
 * A circle as four quarter arcs, drawn clockwise from the top. The four
 * points where the arcs meet (top, right, bottom, left) are its dots.
 * The SRS lists no endpoints for the circle, which would leave the
 * endpoints-only stage with nothing to show, so these four are used.
 */
function circle(centre: Point, radius: number): Figure {
  const quarters = [0, 90, 180, 270];
  const parts: Path[] = quarters.map((start) => arc(centre, radius, start, start + 90));
  const endpoints: Point[] = quarters.map((angle) => pointOnCircle(centre, radius, angle));
  return { parts: parts, endpoints: endpoints };
}

/**
 * A closed shape with straight sides, such as a square or a triangle. Each
 * side runs from one corner to the next, and the last corner joins back to
 * the first. The corners are also the dots shown at the endpoints-only stage.
 */
function polygon(corners: Point[]): Figure {
  const parts: Path[] = [];
  for (let i = 0; i < corners.length; i++) {
    const next = corners[(i + 1) % corners.length]; // after the last corner comes the first
    parts.push([corners[i], next]);
  }
  return { parts: parts, endpoints: corners };
}

export const LESSONS: Lesson[] = [
  {
    id: "square",
    name: "Square",
    category: "shape",
    // Four sides; four corners (SRS Table "Initial lesson catalogue").
    // Clockwise from the top left corner.
    figure: polygon([
      { x: 250, y: 250 },
      { x: 750, y: 250 },
      { x: 750, y: 750 },
      { x: 250, y: 750 },
    ]),
  },
  {
    id: "circle",
    name: "Circle",
    category: "shape",
    // Four quarter arcs; the four points where they meet are the dots.
    figure: circle({ x: 500, y: 500 }, 250),
  },
];

export function lesson(id: string): Lesson {
  for (const entry of LESSONS) {
    if (entry.id === id) {
      return entry;
    }
  }
  throw new Error("unknownLesson");
}

/** The whole figure as the outline at T, only the endpoints at E, nothing at I. */
export function guide(id: string, stage: DrawingStage): Guide {
  const figure = lesson(id).figure;
  if (stage === "T") return { outline: figure.parts, endpoints: [] };
  if (stage === "E") return { outline: [], endpoints: figure.endpoints };
  return { outline: [], endpoints: [] };
}

/**
 * The predefined problems of a stage: any missed part, any missed
 * endpoint, or drawing off the figure. With no guide, a drawing can also be
 * too small, or stretched (the right shape, but too wide or too tall).
 */
export function problems(id: string, stage: DrawingStage): DrawingProblem[] {
  const figure = lesson(id).figure;
  const all: DrawingProblem[] = [];
  for (let index = 0; index < figure.parts.length; index++) {
    all.push({ kind: "missedPart", index: index });
  }
  for (let index = 0; index < figure.endpoints.length; index++) {
    all.push({ kind: "missedEndpoint", index: index });
  }
  all.push({ kind: "offFigure", index: 0 });
  if (stage === "I") {
    all.push({ kind: "tooSmall", index: 0 });
    all.push({ kind: "stretched", index: 0 });
  }
  return all;
}
