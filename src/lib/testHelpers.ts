// Helpers for the unit tests: prepared strokes and an in-memory record store.

import type { RecordStore } from "./records";
import type { AttemptRecord, Ending, Path, Point, Stage, Stroke, Suggestion } from "./types";

/** A stroke through the given points, with extra points every 10 units, like real input. */
export function stroke(...points: Point[]): Stroke {
  const out: Stroke["points"] = [];
  points.forEach((p, i) => {
    if (i === 0) return void out.push({ ...p, t: 0 });
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

export interface MemoryRecords extends RecordStore {
  attempts: Omit<AttemptRecord, "id" | "lessonRecordId">[];
  suggestions: Suggestion[];
  extensions: number;
  ending: Ending;
  furthest: Stage;
}

export function memoryRecords(): MemoryRecords {
  const m: MemoryRecords = {
    attempts: [],
    suggestions: [],
    extensions: 0,
    ending: "inProgress",
    furthest: "D",
    startLesson: () => "r1",
    saveAttempt: (_r, a) => void m.attempts.push(a),
    recordPass: () => {},
    recordExtension: () => void (m.extensions += 1),
    offerSuggestion: (_r, from, at) => m.suggestions.push({ from, offeredAt: at, response: "pending", stage: null }) - 1,
    answerSuggestion: (_r, i, response, stage) => void Object.assign(m.suggestions[i], { response, stage }),
    endLesson: (_r, ending, furthest) => void Object.assign(m, { ending, furthest }),
  };
  return m;
}
