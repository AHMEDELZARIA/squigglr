// M04 Guided Lesson Control. The state machine of SRS Section 9.2: which stage
// the child is at, when an attempt counts, and when the lesson moves on,
// offers a go-back suggestion, grants its one extension or ends.
// It has no UI and no timers of its own: the screen calls addStroke at each
// stylus lift and tick twice a second (every TICK_MS = 500 ms).
// In the POC nothing is saved: the lesson lives only while its screen is open.

import { Attempt } from "./attempt";
import * as catalogue from "./catalogue";
import { evaluate as realEvaluate, type Evaluate } from "./evaluation";
import { improving } from "./improvement";
import { copySettings, defaults } from "./settings";
import * as stages from "./stages";
import type { DrawingStage, Ending, Report, Settings, Stage, Stroke } from "./types";

export type Status = "noLesson" | "active" | "suggested" | "ended";

const NOTHING: Report = { feedback: [], problems: [] };

/** What the lesson needs from outside. Tests replace the scoring and the clock. */
export interface Deps {
  /** Gives each attempt's result. Left out, the real scoring is used. */
  evaluate?: Evaluate;
  /** The time in milliseconds. Left out, Date.now is used. */
  now?: () => number;
}

/**
 * The counts that belong to one drawing stage of the lesson. They are kept for
 * each stage, so a stage entered again (after the adult accepts a go-back)
 * continues from where it was (SRS BR-002, Section 9.2).
 */
interface StageCounts {
  failed: number;
  evaluable: number;
  extended: boolean;
  sinceExtension: number;
}

function zeroCounts(): StageCounts {
  return { failed: 0, evaluable: 0, extended: false, sinceExtension: 0 };
}

export class LessonControl {
  // The letters are the MIS names (M04) of the same state variables.
  /** q: whether a lesson is running, waiting on a suggestion, or over. */
  status: Status = "noLesson";
  /** l: the lesson. */
  lessonId = "";
  /** l: the stage the child is at. */
  stage: Stage = "D";
  /** f: the furthest stage reached in this lesson. */
  furthest: Stage = "D";
  /** n_f: failed attempts at this stage. */
  failed = 0;
  /** n_a: counted (evaluable) attempts at this stage. */
  evaluable = 0;
  /** k: failed attempts in a row. Starts again at 0 whenever the stage changes. */
  streak = 0;
  /** H: the results of the counted attempts since this stage was entered. */
  history: number[] = [];
  /** s: whether a go-back suggestion is waiting for the adult. */
  suggestionPending = false;
  /** z: whether this stage's one extension has been granted. */
  extended = false;
  /** x: counted attempts made since the extension was granted. */
  sinceExtension = 0;
  /** set: the adult's values, read once when the lesson starts. */
  settings: Settings;
  /** The attempt in progress, or null between attempts and after the lesson. */
  attempt: Attempt | null = null;
  ending: Ending = "inProgress";
  /** Whether the idle check-in is showing. */
  prompted = false;
  /** The attempt that ended last, for the screen and the demo panel. */
  lastAttempt: Attempt | null = null;

  private startAt: DrawingStage = "T";
  private activityBase = 0;
  /** The counts of the drawing stages the child has left, kept for a return. */
  private savedCounts: Record<DrawingStage, StageCounts> = { T: zeroCounts(), E: zeroCounts(), I: zeroCounts() };
  private evaluate: Evaluate;
  private now: () => number;

  constructor(deps: Deps) {
    // Tests can pass their own scoring and clock; the app uses the real ones.
    if (deps.evaluate !== undefined) {
      this.evaluate = deps.evaluate;
    } else {
      this.evaluate = realEvaluate;
    }
    if (deps.now !== undefined) {
      this.now = deps.now;
    } else {
      this.now = Date.now;
    }
    this.settings = defaults(); // replaced by the adult's values in select()
  }

  /**
   * The adult chooses a lesson and its starting stage. The demonstration is
   * always shown first (UC-003 step 1); practice then starts at the chosen stage.
   * The settings are read once, here: a later change applies to the next lesson.
   */
  select(lessonId: string, start: Stage, settings: Settings): void {
    catalogue.lesson(lessonId); // throws unknownLesson
    if (this.isRunning()) {
      this.stop();
    }
    this.lessonId = lessonId;
    this.settings = copySettings(settings); // a copy, so a later change on screen does not reach this lesson
    if (start === "D") {
      this.startAt = "T";
    } else {
      this.startAt = start;
    }
    this.stage = "D";
    this.furthest = start;
    this.status = "active";
    this.ending = "inProgress";
    this.lastAttempt = null;
    this.attempt = null;
    this.savedCounts = { T: zeroCounts(), E: zeroCounts(), I: zeroCounts() };
    this.loadCounts(zeroCounts());
    this.resetForNewStage();
  }

  /** The demonstration has played: practice starts at the chosen stage. */
  beginPractice(): void {
    if (this.status !== "active" || this.stage !== "D") throw new Error("notAtDemonstration");
    this.enterStage(this.startAt);
  }

  /** A finished stroke. A pass ends the attempt here, at the stylus lift. */
  addStroke(stroke: Stroke): Report {
    if (!this.isRunning() || this.attempt === null) throw new Error("noAttempt");
    const attempt = this.attempt;
    attempt.addStroke(stroke, this.now());
    if (attempt.outcome !== "passed") return NOTHING;

    const stage = attempt.stage;
    this.lastAttempt = attempt;
    this.evaluable += 1;
    this.suggestionPending = false; // a pass answers a pending suggestion: it is no longer needed
    this.status = "active";

    const nextStage = stages.next(stage);
    if (nextStage === null) {
      this.finish("completed");
      return { feedback: ["lessonComplete"], problems: [] };
    }
    this.enterStage(nextStage);
    return { feedback: ["stagePassed"], problems: [] };
  }

  /**
   * Called twice a second (every TICK_MS = 500 ms) with the time of the child's last input.
   * Ends an idle attempt, applies the stopping rules, and handles the
   * lesson's own idle check-in and idle end.
   */
  tick(lastInputAt: number | null): Report {
    if (!this.isRunning()) return NOTHING;
    const now = this.now();
    let lastInput = 0;
    if (lastInputAt !== null) {
      lastInput = lastInputAt;
    }
    const lastActivity = Math.max(lastInput, this.activityBase);
    const idleSeconds = (now - lastActivity) / 1000;

    if (idleSeconds >= this.settings.lessonIdleEnd) {
      this.finish("endedIdle");
      return { feedback: ["lessonEnded"], problems: [] };
    }

    const attempt = this.attempt;
    if (attempt !== null) {
      if (attempt.checkIdle(now, lastActivity)) {
        // The drawing stays, and the child is shown what to finish.
        return { feedback: ["fillIn"], problems: attempt.missing() };
      }
      if (attempt.outcome === "invalid") {
        // Not counted (FR-LRN-010, FR-LRN-032).
        this.newAttempt();
        return { feedback: ["notEvaluable"], problems: [] };
      }
      if (attempt.outcome === "notPassed") return this.afterFailedAttempt(attempt);
    }

    if (idleSeconds >= this.settings.lessonIdlePrompt) {
      if (!this.prompted) {
        this.prompted = true;
        return { feedback: ["checkIn"], problems: [] };
      }
    } else {
      this.prompted = false;
    }
    return NOTHING;
  }

  /** The input was cut off (for example a pointercancel). The attempt is dropped and not counted. */
  interrupt(): void {
    if (!this.isRunning() || this.attempt === null) return;
    if (this.attempt.strokes.length > 0) {
      this.attempt.interrupt(this.now());
      this.lastAttempt = this.attempt;
    }
    this.newAttempt();
  }

  /** The adult answers a go-back suggestion. Accepting needs an earlier stage. */
  answerSuggestion(accept: boolean, stage: DrawingStage | null): void {
    if (!this.suggestionPending) throw new Error("noSuggestion");
    if (!accept) {
      this.suggestionPending = false;
      this.status = "active";
      this.streak = 0; // a new suggestion needs a whole new streak
      return;
    }
    if (stage === null || stages.position(stage) >= stages.position(this.stage)) {
      throw new Error("notEarlierStage");
    }
    this.suggestionPending = false;
    this.status = "active";
    this.dropOpenAttempt();
    this.enterStage(stage);
  }

  /** The adult leaves the lesson. It ends as unfinished. */
  stop(): void {
    if (!this.isRunning()) return;
    this.dropOpenAttempt();
    this.finish("unfinished");
  }

  // ----- the rules -----

  private afterFailedAttempt(attempt: Attempt): Report {
    const s = this.settings;
    const evaluation = attempt.last;
    if (evaluation === null) throw new Error("notEvaluated"); // an attempt that did not pass was evaluated
    this.lastAttempt = attempt;
    this.evaluable += 1;
    this.failed += 1;
    this.streak += 1;
    this.history.push(evaluation.result);
    if (this.extended) {
      this.sinceExtension += 1;
    }

    const notCorrected = attempt.seen.filter((o) => !o.corrected);
    const report: Report = {
      feedback: ["keepTrying"], // the effort is acknowledged first (NFR-UX-016)
      problems: notCorrected.map((o) => o.problem),
    };
    const isImproving = improving(this.history, s.improveWindow);
    const atCap = this.evaluable >= s.attemptLimitMax;

    // The first rule that holds applies, in this order (SRS Table "Guided lesson state transitions").
    let endAtLimit: boolean;
    if (this.extended) {
      endAtLimit = this.sinceExtension >= s.attemptExtension || atCap;
    } else {
      endAtLimit = this.failed >= s.attemptLimit && (!isImproving || atCap);
    }

    if (endAtLimit) {
      if (atCap) {
        this.finish("endedAtMax");
      } else {
        this.finish("endedAtLimit");
      }
      report.feedback.push("lessonEnded");
      return report;
    }
    if (!this.extended && this.failed >= s.attemptLimit && isImproving) {
      this.extended = true; // granted once per stage
      this.sinceExtension = 0;
    } else if (this.status === "active" && !this.suggestionPending && this.canSuggest() && this.streak >= s.failStreak && !isImproving) {
      // The stage does not change; the child keeps practising while it is pending.
      this.suggestionPending = true;
      this.status = "suggested";
    }
    this.newAttempt();
    return report;
  }

  /** A go-back can only be suggested where there is an earlier drawing stage to go back to. */
  private canSuggest(): boolean {
    if (this.stage === "D") {
      return false;
    }
    return stages.earlier(this.stage).length > 0;
  }

  // ----- helpers -----

  private isRunning(): boolean {
    return this.status === "active" || this.status === "suggested";
  }

  /** The streak, the history and the idle clocks start again whenever the stage changes. */
  private resetForNewStage(): void {
    this.streak = 0;
    this.history = [];
    this.suggestionPending = false;
    this.prompted = false;
    this.activityBase = this.now();
  }

  private enterStage(stage: DrawingStage): void {
    // Keep the counts of the stage being left, and pick up those of the stage entered.
    if (this.stage !== "D") {
      this.savedCounts[this.stage] = {
        failed: this.failed,
        evaluable: this.evaluable,
        extended: this.extended,
        sinceExtension: this.sinceExtension,
      };
    }
    this.stage = stage;
    this.furthest = stages.later(this.furthest, stage);
    this.loadCounts(this.savedCounts[stage]);
    this.resetForNewStage();
    this.newAttempt();
  }

  private loadCounts(counts: StageCounts): void {
    this.failed = counts.failed;
    this.evaluable = counts.evaluable;
    this.extended = counts.extended;
    this.sinceExtension = counts.sinceExtension;
  }

  private newAttempt(): void {
    if (this.stage === "D") throw new Error("notAtDrawingStage");
    const stage = this.stage;
    this.attempt = new Attempt({
      stage: stage,
      figure: catalogue.lesson(this.lessonId).figure,
      allowed: catalogue.problems(this.lessonId, stage),
      stagePass: this.settings.stagePass,
      attemptIdle: this.settings.attemptIdle,
      evaluate: this.evaluate,
    });
  }

  /** Drops an attempt in progress, for example when the adult leaves. It is not counted. */
  private dropOpenAttempt(): void {
    if (this.attempt !== null && this.attempt.outcome === "open" && this.attempt.strokes.length > 0) {
      this.attempt.interrupt(this.now());
    }
    this.attempt = null;
  }

  private finish(ending: Ending): void {
    this.suggestionPending = false;
    this.status = "ended";
    this.ending = ending;
    this.attempt = null;
  }
}
