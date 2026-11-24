// Types shared between modules (MIS Table "Types shared between modules").
// Everything here is plain data, so it can be saved as JSON.

/** A position on the drawing area, in drawing units (the area is 1000 x 1000). */
export interface Point {
  x: number;
  y: number;
}

/** A line through the points, in order. The parts of a figure are paths. */
export type Path = Point[];

/**
 * A position on the drawing area together with when it was drawn.
 * `t` is the time in milliseconds (from Date.now()). No rule reads it yet;
 * it is saved so an attempt keeps a full record of how the child drew
 * (speed, pauses, a replay), not only the final shape.
 */
export interface TimedPoint {
  x: number;
  y: number;
  t: number;
}

/** One stylus contact, from touching down to lifting: its points in the order drawn. */
export interface Stroke {
  points: TimedPoint[];
}

/** D = demonstration, T = trace the outline, E = endpoints only, I = independent. */
export type Stage = "D" | "T" | "E" | "I";
export type DrawingStage = "T" | "E" | "I";

export interface Figure {
  parts: Path[];
  endpoints: Point[];
}

/** What is shown to guide the child at a drawing stage. */
export interface Guide {
  outline: Path[];
  endpoints: Point[];
}

export type DrawingProblemKind = "missedPart" | "missedEndpoint" | "offFigure" | "tooSmall" | "stretched";

/**
 * One drawing problem: a specific thing the scoring found wrong in a drawing,
 * which tells the child what to fix. It is not a level of difficulty.
 * The SRS calls this a "difficulty" (BR-007, the predefined list).
 * `index` says which part or endpoint, so the screen can make that exact part
 * glow; it is 0 for the kinds that are about the whole drawing.
 */
export interface DrawingProblem {
  kind: DrawingProblemKind;
  index: number;
}

/** A problem seen during an attempt, and whether the child fixed it later. */
export interface Observed {
  problem: DrawingProblem;
  corrected: boolean;
}

export type EvalClass = "complete" | "incomplete" | "invalid";
export type Guidance = "assisted" | "independent";

export interface Evaluation {
  class: EvalClass;
  guidance: Guidance;
  /** Stage result, 0 to 100. */
  result: number;
  passed: boolean;
  problems: DrawingProblem[];
  /** The two shares behind the result, kept for the demo panel. */
  drawn: number;
  onFigure: number;
  /** How the drawing was laid over the figure before it was scored. */
  fit: Fit;
}

/** Maps a point of the drawing onto the figure: scale it, then move it by (dx, dy). */
export interface Fit {
  scale: number;
  dx: number;
  dy: number;
}

/** The nine adult-set values of one learner (BR-008). Times are in seconds. */
export interface Settings {
  stagePass: number;
  failStreak: number;
  attemptLimit: number;
  improveWindow: number;
  attemptExtension: number;
  attemptLimitMax: number;
  attemptIdle: number;
  lessonIdlePrompt: number;
  lessonIdleEnd: number;
}

export type SettingName = keyof Settings;

export type FeedbackKind =
  | "stagePassed"
  | "lessonComplete"
  | "keepTrying"
  | "fillIn"
  | "notEvaluable"
  | "checkIn"
  | "lessonEnded";

/** What the child is told after an event, in the order it is given. */
export interface Report {
  feedback: FeedbackKind[];
  problems: DrawingProblem[];
}

export interface Learner {
  id: string;
  avatar: string;
  createdAt: number;
}

export type RecordOutcome = "passed" | "notPassed" | "interrupted";

export interface AttemptRecord {
  id: string;
  lessonRecordId: string;
  lesson: string;
  stage: DrawingStage;
  outcome: RecordOutcome;
  /** Absent for an interrupted attempt. */
  result: number | null;
  problems: Observed[];
  settings: Settings;
  strokes: Stroke[];
  endedAt: number;
}

export type Ending =
  | "inProgress"
  | "completed"
  | "endedAtLimit"
  | "endedAtMax"
  | "endedIdle"
  | "unfinished";

export type SuggestionResponse = "pending" | "accepted" | "declined" | "ignored";

export interface Suggestion {
  from: DrawingStage;
  offeredAt: number;
  response: SuggestionResponse;
  /** The earlier stage the adult chose, or null if not accepted. */
  stage: DrawingStage | null;
}

export interface LessonRecord {
  id: string;
  learner: string;
  lesson: string;
  start: Stage;
  furthest: Stage;
  passes: Record<DrawingStage, number>;
  extensions: number;
  ending: Ending;
  suggestions: Suggestion[];
  startedAt: number;
}
