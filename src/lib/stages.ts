// The stages of a lesson, in order, with their names. Every other file reads
// the order and the names from here, so a stage is renamed, or a new one
// added, in this one place.

import type { DrawingStage, Stage } from "./types";

/** One stage of a lesson, as the screens show it. */
export interface StageInfo {
  id: Stage;
  /** The step number the adult sees: 0 for the demonstration, then 1, 2 and 3. */
  number: number;
  name: string;
}

/** Every stage, in the order a lesson goes through them. */
export const STAGES: StageInfo[] = [
  { id: "D", number: 0, name: "Watch" },
  { id: "T", number: 1, name: "Full outline" },
  { id: "E", number: 2, name: "Endpoints only" },
  { id: "I", number: 3, name: "On my own" },
];

/** The stages where the child draws, in order (every stage except the demonstration). */
export const DRAWING_STAGES: DrawingStage[] = ["T", "E", "I"];

/** The position of a stage in the lesson: 0 for the demonstration, 3 for the last. */
export function position(stage: Stage): number {
  for (let i = 0; i < STAGES.length; i++) {
    if (STAGES[i].id === stage) {
      return i;
    }
  }
  throw new Error("unknownStage");
}

export function info(stage: Stage): StageInfo {
  return STAGES[position(stage)];
}

/** Of two stages, the one further into the lesson. */
export function later(a: Stage, b: Stage): Stage {
  if (position(a) >= position(b)) {
    return a;
  }
  return b;
}

/** The drawing stage after this one, or null after the last. */
export function next(stage: DrawingStage): DrawingStage | null {
  const index = DRAWING_STAGES.indexOf(stage);
  if (index === DRAWING_STAGES.length - 1) {
    return null;
  }
  return DRAWING_STAGES[index + 1];
}

/** The drawing stages before this one, first stage first. Empty for the first drawing stage. */
export function earlier(stage: DrawingStage): DrawingStage[] {
  return DRAWING_STAGES.slice(0, DRAWING_STAGES.indexOf(stage));
}
