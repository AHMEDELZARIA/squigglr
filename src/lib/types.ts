// Types shared between modules (MIS Table "Types shared between modules").
// Everything here is plain data, so it can be saved as JSON.

/** A position on the drawing area, in drawing units (the area is 1000 x 1000). */
export interface Point {
  x: number;
  y: number;
}

/** A line through the points, in order. The parts of a figure are paths. */
export type Path = Point[];

/** One stylus contact: its points in the order drawn, each with its time (ms). */
export interface Stroke {
  points: (Point & { t: number })[];
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

export type DifficultyKind = "missedPart" | "missedEndpoint" | "offFigure" | "tooSmall" | "stretched";

/** One predefined difficulty (BR-007). `index` is the part or endpoint; 0 for the kinds that are about the whole drawing. */
export interface Difficulty {
  kind: DifficultyKind;
  index: number;
}

/** A difficulty seen during an attempt, and whether the child fixed it later. */
export interface Observed {
  difficulty: Difficulty;
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
  difficulties: Difficulty[];
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
  difficultyStreak: number;
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
  | "notEvaluable"
  | "checkIn"
  | "lessonEnded";

/** What the child is told after an event, in the order it is given. */
export interface Report {
  feedback: FeedbackKind[];
  difficulties: Difficulty[];
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
  difficulties: Observed[];
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
