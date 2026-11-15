// M06 Attempt. One attempt at one drawing stage: it collects strokes, has
// them evaluated at every stylus lift, and decides when it has ended.

import type { Evaluate } from "./evaluation";
import type { Difficulty, DrawingStage, Evaluation, Figure, Observed, Stroke } from "./types";

export type Outcome = "open" | "passed" | "notPassed" | "invalid" | "interrupted";

const same = (a: Difficulty, b: Difficulty) => a.kind === b.kind && a.index === b.index;

export class Attempt {
  strokes: Stroke[] = [];
  /** The evaluation after the most recent stylus lift. */
  last: Evaluation | null = null;
  /** Every difficulty seen so far. A correction marks it; it is never removed. */
  seen: Observed[] = [];
  outcome: Outcome = "open";
  endedAt: number | null = null;

  constructor(
    readonly lesson: string,
    readonly stage: DrawingStage,
    private figure: Figure,
    private allowed: Difficulty[],
    private stagePass: number,
    /** Seconds. */
    private attemptIdle: number,
    private evaluate: Evaluate,
  ) {}

  /** Called at each stylus lift. Evaluates all strokes so far; a pass ends the attempt at once. */
  addStroke(stroke: Stroke, now: number): void {
    this.replaceStrokes([...this.strokes, stroke], now);
  }

  /**
   * The drawing as it stands after the child has drawn or rubbed something
   * out. It is evaluated like any other stylus lift. With nothing left on
   * the page, the attempt is simply open again.
   */
  replaceStrokes(strokes: Stroke[], now: number): void {
    if (this.outcome !== "open") throw new Error("attemptEnded");
    this.strokes = strokes;
    if (strokes.length === 0) {
      this.last = null;
      return;
    }
    this.last = this.evaluate(this.strokes, this.figure, this.stage, this.allowed, this.stagePass);
    // Something drawn off the figure is noted at every lift. A missed part or
    // endpoint, or a drawing that is still small, is not: the child may simply
    // not have finished yet.
    this.note(this.last.difficulties.filter((d) => d.kind === "offFigure"), ["offFigure"]);
    if (this.last.passed) this.end("passed", now);
  }

  /** Ends an open attempt that has strokes once attemptIdle has passed since the last input. */
  checkIdle(now: number, lastInputAt: number): void {
    if (this.outcome !== "open" || this.strokes.length === 0 || this.last === null) return;
    if (now - lastInputAt < this.attemptIdle * 1000) return;
    if (this.last.class === "invalid") {
      this.end("invalid", now);
      return;
    }
    this.note(this.last.difficulties, ["missedPart", "missedEndpoint", "offFigure", "tooSmall"]);
    this.end("notPassed", now);
  }

  /** Ends the attempt with no result, keeping its strokes and difficulties. */
  interrupt(now: number): void {
    if (this.outcome !== "open") throw new Error("attemptEnded");
    this.last = null;
    this.end("interrupted", now);
  }

  private end(outcome: Outcome, now: number): void {
    this.outcome = outcome;
    this.endedAt = now;
  }

  private note(observedNow: Difficulty[], kinds: Difficulty["kind"][]): void {
    for (const entry of this.seen) {
      if (kinds.includes(entry.difficulty.kind)) {
        entry.corrected = !observedNow.some((d) => same(d, entry.difficulty));
      }
    }
    for (const d of observedNow) {
      if (!this.seen.some((entry) => same(entry.difficulty, d))) {
        this.seen.push({ difficulty: d, corrected: false });
      }
    }
  }
}
