// M04 Guided Lesson Control. The state machine of SRS Section 9.2: which stage
// the child is at, when an attempt counts, and when the lesson moves on,
// offers a go-back suggestion, grants its one extension or ends.
// It has no UI and no timers of its own: the screen calls addStroke at each
// stylus lift and tick about once a second.

import { Attempt } from "./attempt";
import * as catalogue from "./catalogue";
import { evaluate as realEvaluate, type Evaluate } from "./evaluation";
import { improving } from "./improvement";
import type { RecordStore } from "./records";
import type { DrawingStage, Ending, Evaluation, Report, Settings, Stage, Stroke } from "./types";

export type Status = "noLesson" | "active" | "suggested" | "ended";

const ORDER: Stage[] = ["D", "T", "E", "I"];
const later = (a: Stage, b: Stage): Stage => (ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b);
const NOTHING: Report = { feedback: [], difficulties: [] };

export interface Deps {
  records: RecordStore;
  /** Tests replace these to give each attempt's result and the time directly. */
  evaluate?: Evaluate;
  now?: () => number;
}

export class LessonControl {
  status: Status = "noLesson"; // q
  lessonId = ""; // l (the lesson)
  learner = ""; // p
  stage: Stage = "D"; // l (the stage)
  furthest: Stage = "D"; // f
  failed = 0; // n_f: failed attempts at this stage
  evaluable = 0; // n_a: counted attempts at this stage
  streak = 0; // k: failed attempts in a row
  history: number[] = []; // H: results of the counted attempts at this stage
  suggestionPending = false; // s
  extended = false; // z
  sinceExtension = 0; // x
  settings!: Settings;
  attempt: Attempt | null = null;
  ending: Ending = "inProgress";
  /** Whether the idle check-in is showing. */
  prompted = false;
  /** The evaluation of the attempt that ended last, for the demo panel. */
  lastFinal: Evaluation | null = null;
  /** How many records could not be saved, for example because the browser's storage is full. */
  unsaved = 0;

  private startAt: DrawingStage = "T";
  private recordId = "";
  private suggestionIndex = 0;
  private activityBase = 0;
  private records: RecordStore;
  private evaluate: Evaluate;
  private now: () => number;

  constructor(deps: Deps) {
    this.records = deps.records;
    this.evaluate = deps.evaluate ?? realEvaluate;
    this.now = deps.now ?? Date.now;
  }

  /**
   * The adult chooses a lesson and its starting stage. The demonstration is
   * always shown first (UC-003 step 1); practice then starts at the chosen stage.
   * The settings are read once, here: a later change applies to the next lesson.
   */
  select(learner: string, lessonId: string, start: Stage, settings: Settings): void {
    catalogue.lesson(lessonId); // throws unknownLesson
    if (this.status === "active" || this.status === "suggested") this.stop();
    this.learner = learner;
    this.lessonId = lessonId;
    this.settings = { ...settings };
    this.startAt = start === "D" ? "T" : start;
    this.stage = "D";
    this.furthest = start;
    this.status = "active";
    this.ending = "inProgress";
    this.lastFinal = null;
    this.attempt = null;
    this.resetStage();
    this.recordId = this.keep(() => this.records.startLesson(learner, lessonId, start)) ?? "";
  }

  /** The child continues after the demonstration. */
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
    this.lastFinal = attempt.last;
    this.save(attempt, "passed");
    this.keep(() => this.records.recordPass(this.recordId, stage));
    this.evaluable += 1;
    this.clearSuggestion("ignored");

    if (stage === "I") {
      this.finish("completed");
      return { feedback: ["lessonComplete"], difficulties: [] };
    }
    this.enterStage(stage === "T" ? "E" : "I");
    return { feedback: ["stagePassed"], difficulties: [] };
  }

  /**
   * Called about once a second with the time of the child's last input.
   * Ends an idle attempt, applies the stopping rules, and handles the
   * lesson's own idle check-in and idle end.
   */
  tick(lastInputAt: number | null): Report {
    if (!this.isRunning()) return NOTHING;
    const now = this.now();
    const lastActivity = Math.max(lastInputAt ?? 0, this.activityBase);
    const idleSeconds = (now - lastActivity) / 1000;

    if (idleSeconds >= this.settings.lessonIdleEnd) {
      this.finish("endedIdle");
      return { feedback: ["lessonEnded"], difficulties: [] };
    }

    const attempt = this.attempt;
    if (attempt !== null) {
      if (attempt.checkIdle(now, lastActivity)) {
        // The drawing stays, and the child is shown what to finish.
        return { feedback: ["fillIn"], difficulties: attempt.missing() };
      }
      if (attempt.outcome === "invalid") {
        // Not saved and not counted (FR-LRN-010, FR-LRN-032).
        this.newAttempt();
        return { feedback: ["notEvaluable"], difficulties: [] };
      }
      if (attempt.outcome === "notPassed") return this.afterFailedAttempt(attempt);
    }

    if (idleSeconds >= this.settings.lessonIdlePrompt) {
      if (!this.prompted) {
        this.prompted = true;
        return { feedback: ["checkIn"], difficulties: [] };
      }
    } else {
      this.prompted = false;
    }
    return NOTHING;
  }

  /** The input was cut off (for example a pointercancel). Kept apart, never counted. */
  interrupt(): void {
    if (!this.isRunning() || this.attempt === null) return;
    if (this.attempt.strokes.length > 0) {
      this.attempt.interrupt(this.now());
      this.save(this.attempt, "interrupted");
    }
    this.newAttempt();
  }

  /** The adult answers a go-back suggestion. Accepting needs an earlier stage. */
  answerSuggestion(accept: boolean, stage?: DrawingStage): void {
    if (!this.suggestionPending) throw new Error("noSuggestion");
    if (!accept) {
      this.clearSuggestion("declined");
      this.streak = 0; // a new suggestion needs a whole new streak
      return;
    }
    if (stage === undefined || ORDER.indexOf(stage) >= ORDER.indexOf(this.stage)) {
      throw new Error("notEarlierStage");
    }
    this.clearSuggestion("accepted", stage);
    this.interruptOpenAttempt();
    this.enterStage(stage);
  }

  /** The adult leaves the lesson. It ends as unfinished. */
  stop(): void {
    if (!this.isRunning()) return;
    this.interruptOpenAttempt();
    this.finish("unfinished");
  }

  // ----- the rules -----

  private afterFailedAttempt(attempt: Attempt): Report {
    const s = this.settings;
    this.lastFinal = attempt.last;
    this.save(attempt, "notPassed");
    this.evaluable += 1;
    this.failed += 1;
    this.streak += 1;
    this.history.push(attempt.last!.result);
    if (this.extended) this.sinceExtension += 1;

    const report: Report = {
      feedback: ["keepTrying"], // the effort is acknowledged first (NFR-UX-016)
      difficulties: attempt.seen.filter((o) => !o.corrected).map((o) => o.difficulty),
    };
    const isImproving = improving(this.history, s.improveWindow);
    const atCap = this.evaluable >= s.attemptLimitMax;

    // The first rule that holds applies, in this order (SRS Table "Guided lesson state transitions").
    const endAtLimit = this.extended
      ? this.sinceExtension >= s.attemptExtension || atCap
      : this.failed >= s.attemptLimit && (!isImproving || atCap);

    if (endAtLimit) {
      this.finish(atCap ? "endedAtMax" : "endedAtLimit");
      report.feedback.push("lessonEnded");
      return report;
    }
    if (!this.extended && this.failed >= s.attemptLimit && isImproving) {
      this.extended = true; // granted once per stage
      this.sinceExtension = 0;
      this.keep(() => this.records.recordExtension(this.recordId));
    } else if (
      this.status === "active" &&
      !this.suggestionPending &&
      (this.stage === "E" || this.stage === "I") &&
      this.streak >= s.difficultyStreak &&
      !isImproving
    ) {
      // The stage does not change; the child keeps practising while it is pending.
      this.suggestionPending = true;
      this.status = "suggested";
      this.suggestionIndex =
        this.keep(() => this.records.offerSuggestion(this.recordId, this.stage as DrawingStage, this.now())) ?? 0;
    }
    this.newAttempt();
    return report;
  }

  // ----- helpers -----

  /**
   * Writes a record. If the write fails (the browser's storage is full, say),
   * the lesson carries on and the failure is counted, so the screen can tell
   * the adult. A child's practice is never stopped by a save.
   */
  private keep<T>(write: () => T): T | undefined {
    try {
      return write();
    } catch {
      this.unsaved += 1;
      return undefined;
    }
  }

  private isRunning(): boolean {
    return this.status === "active" || this.status === "suggested";
  }

  private resetStage(): void {
    this.failed = 0;
    this.evaluable = 0;
    this.streak = 0;
    this.history = [];
    this.suggestionPending = false;
    this.extended = false;
    this.sinceExtension = 0;
    this.prompted = false;
    this.activityBase = this.now();
  }

  private enterStage(stage: DrawingStage): void {
    this.stage = stage;
    this.furthest = later(this.furthest, stage);
    this.resetStage();
    this.newAttempt();
  }

  private newAttempt(): void {
    const stage = this.stage as DrawingStage;
    this.attempt = new Attempt(
      this.lessonId,
      stage,
      catalogue.lesson(this.lessonId).figure,
      catalogue.difficulties(this.lessonId, stage),
      this.settings.stagePass,
      this.settings.attemptIdle,
      this.evaluate,
    );
  }

  private interruptOpenAttempt(): void {
    if (this.attempt !== null && this.attempt.outcome === "open" && this.attempt.strokes.length > 0) {
      this.attempt.interrupt(this.now());
      this.save(this.attempt, "interrupted");
    }
    this.attempt = null;
  }

  private clearSuggestion(response: "accepted" | "declined" | "ignored", stage: DrawingStage | null = null): void {
    if (!this.suggestionPending) return;
    this.keep(() => this.records.answerSuggestion(this.recordId, this.suggestionIndex, response, stage));
    this.suggestionPending = false;
    this.status = "active";
  }

  private save(attempt: Attempt, outcome: "passed" | "notPassed" | "interrupted"): void {
    const record = {
      lesson: attempt.lesson,
      stage: attempt.stage,
      outcome,
      result: outcome === "interrupted" ? null : attempt.last!.result,
      difficulties: attempt.seen,
      settings: this.settings,
      strokes: attempt.strokes, // the actual strokes, never a corrected shape (BR-004)
      endedAt: attempt.endedAt!,
    };
    this.keep(() => this.records.saveAttempt(this.recordId, record));
  }

  private finish(ending: Ending): void {
    this.clearSuggestion("ignored");
    this.status = "ended";
    this.ending = ending;
    this.attempt = null;
    this.keep(() => this.records.endLesson(this.recordId, ending, this.furthest));
  }
}
