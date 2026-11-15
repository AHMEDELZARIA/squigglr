// M05 Lesson Catalogue. Lessons are data: adding a lesson means adding an
// entry to LESSONS, with no change to the rules (NFR-MAINT-001).
// The drawing area is 1000 x 1000 units, whatever the size of the screen.

import type { Difficulty, DrawingStage, Figure, Guide, Path, Point } from "./types";

export interface Lesson {
  id: string;
  name: string;
  category: "line" | "shape" | "simpleDrawing";
  /** The required parts, in the order the demonstration draws them, and the required endpoints. */
  figure: Figure;
}

/** A quarter of a circle as a path of short straight pieces. Angles in degrees, clockwise from the top. */
function arc(cx: number, cy: number, r: number, from: number, to: number, pieces = 16): Path {
  const path: Path = [];
  for (let i = 0; i <= pieces; i++) {
    const a = ((from + ((to - from) * i) / pieces) * Math.PI) / 180;
    path.push({ x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) });
  }
  return path;
}

const corners: Point[] = [
  { x: 250, y: 250 },
  { x: 750, y: 250 },
  { x: 750, y: 750 },
  { x: 250, y: 750 },
];

export const LESSONS: Lesson[] = [
  {
    id: "square",
    name: "Square",
    category: "shape",
    // Four sides; four corners (SRS Table "Initial lesson catalogue").
    figure: {
      parts: corners.map((c, i) => [c, corners[(i + 1) % 4]]),
      endpoints: corners,
    },
  },
  {
    id: "circle",
    name: "Circle",
    category: "shape",
    // Four quarter arcs, which together close the circle. The SRS lists no
    // endpoints for the circle, which would leave the endpoints-only stage
    // with nothing to show, so the POC uses the four points where the arcs meet.
    figure: {
      parts: [0, 90, 180, 270].map((a) => arc(500, 500, 250, a, a + 90)),
      endpoints: [0, 90, 180, 270].map((a) => arc(500, 500, 250, a, a, 1)[0]),
    },
  },
];

export function lesson(id: string): Lesson {
  const found = LESSONS.find((l) => l.id === id);
  if (!found) throw new Error("unknownLesson");
  return found;
}

/** The whole figure as the outline at T, only the endpoints at E, nothing at I. */
export function guide(id: string, stage: DrawingStage): Guide {
  const { figure } = lesson(id);
  if (stage === "T") return { outline: figure.parts, endpoints: [] };
  if (stage === "E") return { outline: [], endpoints: figure.endpoints };
  return { outline: [], endpoints: [] };
}

/**
 * The predefined difficulties of a stage: any missed part, any missed
 * endpoint, or drawing off the figure. With no guide, a drawing can also be
 * too small.
 */
export function difficulties(id: string, stage: DrawingStage): Difficulty[] {
  const { figure } = lesson(id);
  const all: Difficulty[] = [
    ...figure.parts.map((_, index): Difficulty => ({ kind: "missedPart", index })),
    ...figure.endpoints.map((_, index): Difficulty => ({ kind: "missedEndpoint", index })),
    { kind: "offFigure", index: 0 },
  ];
  if (stage === "I") all.push({ kind: "tooSmall", index: 0 });
  return all;
}
