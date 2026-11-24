// M06 Attempt. One attempt at one drawing stage: it collects strokes, has
// them evaluated at every stylus lift, and decides when it has ended.

import { MAX_HINTS } from "./constants";
import type { Evaluate } from "./evaluation";
import type { DrawingProblem, DrawingStage, Evaluation, Figure, Observed, Stroke } from "./types";

export type Outcome = "open" | "passed" | "notPassed" | "invalid" | "interrupted";


const same = (a: DrawingProblem, b: DrawingProblem) => a.kind === b.kind && a.index === b.index;

export class Attempt {
  strokes: Stroke[] = [];
  /** The evaluation after the most recent stylus lift. */
  last: Evaluation | null = null;
  /** Every problem seen so far. A correction marks it; it is never removed. */
  seen: Observed[] = [];
  outcome: Outcome = "open";
  endedAt: number | null = null;
  /** How many times the child has been shown what is missing in this attempt. */
  hints = 0;
  private hintAt = 0;
  private strokesAtHint = 0;

  constructor(
    readonly lesson: string,
    readonly stage: DrawingStage,
    private figure: Figure,
    private allowed: DrawingProblem[],
    private stagePass: number,
    /** Seconds. */
    private attemptIdle: number,
    private evaluate: Evaluate,
  ) {}

  /** Called at each stylus lift. Evaluates all strokes so far; a pass ends the attempt at once. */
  addStroke(stroke: Stroke, now: number): void {
    if (this.outcome !== "open") throw new Error("attemptEnded");
    this.strokes.push(stroke);
    this.last = this.evaluate(this.strokes, this.figure, this.stage, this.allowed, this.stagePass);
    // Something drawn off the figure is noted at every lift. A missed part or
    // endpoint, or a drawing that is still small, is not: the child may simply
    // not have finished yet.
    // With no guide the drawing is laid over the figure as a whole, so a
    // half-finished one looks off the figure until it is done. There, nothing
    // is noted until the attempt ends.
    if (this.stage !== "I") {
      this.note(
        this.last.problems.filter((d) => d.kind === "offFigure"),
        ["offFigure"],
      );
    }
    // After a hint, what was missing and is now drawn is marked corrected.
    if (this.hints > 0) this.note(this.missing(), ["missedPart", "missedEndpoint"]);
    if (this.last.passed) this.end("passed", now);
  }

  /**
   * Called twice a second (every TICK_MS = 500 ms). Once attemptIdle has passed with no input,
   * an attempt that has not passed either gets a hint or ends.
   *
   * A hint: if a part or an endpoint is missing, the child is shown where,
   * the drawing stays, and the pause starts again, so they can finish it. The
   * attempt gives at most MAX_HINTS, and a second one only if the child drew
   * something after the first. Otherwise the attempt ends as not passed.
   *
   * Returns true when a hint was just given.
   */
  checkIdle(now: number, lastInputAt: number): boolean {
    if (this.outcome !== "open" || this.strokes.length === 0 || this.last === null) return false;
    if (now - Math.max(lastInputAt, this.hintAt) < this.attemptIdle * 1000) return false;
    if (this.last.class === "invalid") {
      this.end("invalid", now);
      return false;
    }
    const drewSinceHint = this.strokes.length > this.strokesAtHint;
    if (this.missing().length > 0 && this.hints < MAX_HINTS && (this.hints === 0 || drewSinceHint)) {
      this.hints += 1;
      this.hintAt = now;
      this.strokesAtHint = this.strokes.length;
      // What is missing is now on record. If the child fills it in, it is marked corrected, not removed.
      this.note(this.missing(), ["missedPart", "missedEndpoint"]);
      return true;
    }
    this.note(this.last.problems, ["missedPart", "missedEndpoint", "offFigure", "tooSmall", "stretched"]);
    this.end("notPassed", now);
    return false;
  }

  /** The parts and endpoints the drawing still lacks: what the child could finish. */
  missing(): DrawingProblem[] {
    if (this.last === null) {
      return []; // nothing drawn yet
    }
    return this.last.problems.filter((d) => d.kind === "missedPart" || d.kind === "missedEndpoint");
  }

  /** Ends the attempt with no result, keeping its strokes and problems. */
  interrupt(now: number): void {
    if (this.outcome !== "open") throw new Error("attemptEnded");
    this.last = null;
    this.end("interrupted", now);
  }

  private end(outcome: Outcome, now: number): void {
    this.outcome = outcome;
    this.endedAt = now;
  }

  private note(observedNow: DrawingProblem[], kinds: DrawingProblem["kind"][]): void {
    for (const entry of this.seen) {
      if (kinds.includes(entry.problem.kind)) {
        entry.corrected = !observedNow.some((d) => same(d, entry.problem));
      }
    }
    for (const d of observedNow) {
      if (!this.seen.some((entry) => same(entry.problem, d))) {
        this.seen.push({ problem: d, corrected: false });
      }
    }
  }
}
