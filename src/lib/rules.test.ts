import { describe, expect, it } from "vitest";
import * as catalogue from "./catalogue";
import type { Evaluate } from "./evaluation";
import { IDENTITY } from "./geometry";
import { improving } from "./improvement";
import { LessonControl } from "./lessonControl";
import { check, choose, chosen, defaults } from "./settings";
import { stroke, strokeOf } from "./testHelpers";
import type { Settings, Stage, Stroke } from "./types";

// As the V&V Plan does for its rule tests, each attempt's completeness and
// result are given directly, so exact boundary values can be set.
type Prepared = number | "inv" | { result: number; complete: false };

function harness(start: Stage = "T", overrides: Partial<Settings> = {}) {
  const settings = { ...defaults(), ...overrides };
  let now = 1_000_000;
  let next: Prepared = 0;

  const evaluate: Evaluate = (_x, _f, stage, _ds, stagePass) => {
    const guidance = stage === "I" ? "independent" : "assisted";
    if (next === "inv") {
      return { class: "invalid", guidance, result: 0, passed: false, problems: [], drawn: 0, onFigure: 0, fit: IDENTITY };
    }
    const result = typeof next === "number" ? next : next.result;
    const complete = typeof next === "number";
    return {
      class: complete ? "complete" : "incomplete",
      guidance,
      result,
      passed: complete && result >= stagePass,
      problems: [],
      drawn: result / 100,
      onFigure: result / 100,
      fit: IDENTITY,
    };
  };

  const control = new LessonControl({ evaluate, now: () => now });
  control.select("square", start, settings);
  control.beginPractice();

  /** One whole attempt: draw, then (if it did not pass) wait out ATTEMPT_IDLE. */
  const attempt = (prepared: Prepared) => {
    next = prepared;
    now += 1000;
    const drawnAt = now;
    const report = control.addStroke(stroke({ x: 0, y: 0 }, { x: 100, y: 0 }));
    if (report.feedback.length > 0) return report;
    now += settings.attemptIdle * 1000;
    return control.tick(drawnAt);
  };
  const attempts = (...list: Prepared[]) => list.map(attempt);

  return { control, settings, attempt, attempts, wait: (s: number) => void (now += s * 1000), time: () => now };
}

describe("progression (FR-LRN-023, I6 to I8)", () => {
  it("a pass moves T to E to I, and a pass at I completes the lesson", () => {
    const h = harness();
    expect(h.control.stage).toBe("T");
    expect(h.attempt(85).feedback).toEqual(["stagePassed"]);
    expect(h.control.stage).toBe("E");
    expect(h.attempt(85).feedback).toEqual(["stagePassed"]);
    expect(h.control.stage).toBe("I");
    expect(h.attempt(85).feedback).toEqual(["lessonComplete"]);
    expect(h.control.status).toBe("ended");
    expect(h.control.ending).toBe("completed");
    expect(h.control.furthest).toBe("I");
    expect(h.control.lastAttempt?.stage).toBe("I");
  });

  it("starts at the stage the adult chose", () => {
    const h = harness("E");
    expect(h.control.stage).toBe("E");
  });

  it("passes at the pass mark and not one point below it", () => {
    for (const mark of [70, 80, 90]) {
      const h = harness("T", { stagePass: mark });
      expect(h.attempt(mark - 1).feedback).toEqual(["keepTrying"]);
      expect(h.control.stage).toBe("T");
      expect(h.attempt(mark).feedback).toEqual(["stagePassed"]);
    }
  });

  it("an incomplete drawing never passes, whatever its result (I3)", () => {
    const h = harness();
    expect(h.attempt({ result: 95, complete: false }).feedback).toEqual(["keepTrying"]);
    expect(h.control.stage).toBe("T");
  });

  it("a failed attempt is followed by a retry at the same stage", () => {
    const h = harness();
    h.attempt(40);
    expect(h.control.status).toBe("active");
    expect(h.control.attempt?.outcome).toBe("open");
    expect(h.control.failed).toBe(1);
  });
});

describe("attempts that do not count", () => {
  it("invalid input is not counted", () => {
    const h = harness();
    expect(h.attempt("inv").feedback).toEqual(["notEvaluable"]);
    expect(h.control.failed).toBe(0);
    expect(h.control.evaluable).toBe(0);
  });

  it("an interrupted attempt is not counted", () => {
    const h = harness();
    h.control.addStroke(stroke({ x: 0, y: 0 }, { x: 100, y: 0 }));
    h.control.interrupt();
    expect(h.control.failed).toBe(0);
    expect(h.control.evaluable).toBe(0);
    expect(h.control.lastAttempt?.outcome).toBe("interrupted");
    expect(h.control.stage).toBe("T");
  });

  it("a stylus lift alone does not end an attempt that has not passed", () => {
    const h = harness();
    h.control.addStroke(stroke({ x: 0, y: 0 }, { x: 100, y: 0 }));
    h.wait(h.settings.attemptIdle - 1);
    expect(h.control.tick(h.time() - (h.settings.attemptIdle - 1) * 1000).feedback).toEqual([]);
    expect(h.control.failed).toBe(0);
  });
});

describe("a chance to finish what is missing", () => {
  // The real scoring is used here, with a square drawn one side at a time.
  const sides = catalogue.lesson("square").figure.parts.map(strokeOf);
  const stray = stroke({ x: 400, y: 450 }, { x: 600, y: 550 });

  function lesson() {
    const settings = defaults();
    let now = 1_000_000;
    let lastInput = now;
    const control = new LessonControl({ now: () => now });
    control.select("square", "T", settings);
    control.beginPractice();
    return {
      control,
      draw: (s: Stroke) => {
        now += 1000;
        lastInput = now;
        return control.addStroke(s);
      },
      /** Waits out the pause that ends an attempt, then lets the lesson look. */
      pause: () => {
        now += settings.attemptIdle * 1000;
        return control.tick(lastInput);
      },
    };
  }

  it("after the pause, a drawing with a side missing is kept and the child is shown what to finish", () => {
    const l = lesson();
    sides.slice(0, 3).forEach(l.draw);
    const report = l.pause();
    expect(report.feedback).toEqual(["fillIn"]);
    expect(report.problems).toEqual([{ kind: "missedPart", index: 3 }]);
    expect(l.control.attempt?.outcome).toBe("open");
    expect(l.control.attempt?.strokes).toHaveLength(3);
    expect(l.control.failed).toBe(0);
    expect(l.control.lastAttempt).toBeNull();
  });

  it("finishing the missing side passes, as one attempt, with the side recorded as corrected", () => {
    const l = lesson();
    sides.slice(0, 3).forEach(l.draw);
    l.pause();
    expect(l.draw(sides[3]).feedback).toEqual(["stagePassed"]);
    expect(l.control.stage).toBe("E");
    const passed = l.control.lastAttempt;
    expect(passed).toMatchObject({ outcome: "passed", stage: "T" });
    expect(passed?.strokes).toHaveLength(4);
    expect(passed?.seen).toEqual([
      { problem: { kind: "missedPart", index: 3 }, corrected: true },
    ]);
  });

  it("if nothing is drawn after the hint, the attempt ends at the next pause and counts as one failed attempt", () => {
    const l = lesson();
    sides.slice(0, 3).forEach(l.draw);
    l.pause();
    expect(l.pause().feedback).toEqual(["keepTrying"]);
    expect(l.control.failed).toBe(1);
    expect(l.control.attempt?.strokes).toHaveLength(0);
    expect(l.control.lastAttempt?.outcome).toBe("notPassed");
    expect(l.control.lastAttempt?.seen).toEqual([
      { problem: { kind: "missedPart", index: 3 }, corrected: false },
    ]);
  });

  it("gives a second hint if the child drew but the side is still missing, and then ends the attempt", () => {
    const l = lesson();
    sides.slice(0, 3).forEach(l.draw);
    expect(l.pause().feedback).toEqual(["fillIn"]);
    l.draw(stray);
    expect(l.pause().feedback).toEqual(["fillIn"]);
    l.draw(stray);
    expect(l.pause().feedback).toEqual(["keepTrying"]); // two hints is the most
    expect(l.control.failed).toBe(1);
    expect(l.control.evaluable).toBe(1);
  });

  it("gives no hint when nothing is missing: a complete drawing with too many stray lines just ends", () => {
    const l = lesson();
    l.draw(stroke({ x: 300, y: 300 }, { x: 700, y: 700 }, { x: 300, y: 700 }, { x: 700, y: 300 }));
    sides.forEach(l.draw);
    expect(l.control.attempt?.last?.class).toBe("complete");
    expect(l.pause().feedback).toEqual(["keepTrying"]);
    expect(l.control.failed).toBe(1);
  });
});

describe("stopping rules (FR-LRN-019 to FR-LRN-021)", () => {
  it("ends the lesson at ATTEMPT_LIMIT when the child is not improving", () => {
    const h = harness();
    const reports = h.attempts(40, 40, 40, 40, 40, 40, 40, 40);
    expect(reports[6].feedback).toEqual(["keepTrying"]);
    expect(reports[7].feedback).toEqual(["keepTrying", "lessonEnded"]);
    expect(h.control.ending).toBe("endedAtLimit");
    expect(h.control.furthest).toBe("T");
    expect(h.control.evaluable).toBe(8);
  });

  it("grants one extension when improving at the limit, then ends", () => {
    const h = harness();
    h.attempts(40, 40, 40, 40, 40, 40, 50, 50); // last two average 50, the two before 40
    expect(h.control.status).toBe("active");
    expect(h.control.extended).toBe(true);
    h.attempt(60);
    expect(h.control.status).toBe("active");
    h.attempt(60); // ATTEMPT_EXTENSION (2) used up
    expect(h.control.status).toBe("ended");
    expect(h.control.ending).toBe("endedAtMax"); // 10 attempts is also ATTEMPT_LIMIT_MAX
    expect(h.control.evaluable).toBe(10);
  });

  it("a pass during the extension still moves on", () => {
    const h = harness();
    h.attempts(40, 40, 40, 40, 40, 40, 50, 50);
    expect(h.attempt(85).feedback).toEqual(["stagePassed"]);
    expect(h.control.stage).toBe("E");
    expect(h.control.extended).toBe(false);
  });

  it("never goes past ATTEMPT_LIMIT_MAX (I5)", () => {
    const h = harness("T", { attemptLimit: 8, attemptLimitMax: 8 });
    h.attempts(40, 40, 40, 40, 40, 40, 50, 50); // improving, but already at the cap
    expect(h.control.status).toBe("ended");
    expect(h.control.ending).toBe("endedAtMax");
    expect(h.control.extended).toBe(false);
  });

  it("uses the adult's limit", () => {
    const h = harness("T", { attemptLimit: 6 });
    h.attempts(40, 40, 40, 40, 40, 40);
    expect(h.control.status).toBe("ended");
  });
});

describe("go-back suggestion (FR-LRN-019, FR-LRN-033 to FR-LRN-036)", () => {
  it("is offered after FAIL_STREAK failures in a row at E, and changes nothing by itself", () => {
    const h = harness("E");
    h.attempts(40, 40, 40);
    expect(h.control.status).toBe("active");
    h.attempt(40);
    expect(h.control.status).toBe("suggested");
    expect(h.control.stage).toBe("E");
    expect(h.control.suggestionPending).toBe(true);
    h.attempt(40); // practice continues, and the suggestion still waits
    expect(h.control.status).toBe("suggested");
  });

  it("is never offered at T, which has no earlier drawing stage", () => {
    const h = harness("T");
    h.attempts(40, 40, 40, 40, 40);
    expect(h.control.status).toBe("active");
    expect(h.control.suggestionPending).toBe(false);
  });

  it("is held back while the child is improving", () => {
    const h = harness("E");
    h.attempts(30, 30, 40, 40); // last two average 10 above the two before
    expect(h.control.status).toBe("active");
  });

  it("declining keeps the stage and needs a whole new streak", () => {
    const h = harness("E");
    h.attempts(40, 40, 40, 40);
    h.control.answerSuggestion(false, null);
    expect(h.control.status).toBe("active");
    expect(h.control.stage).toBe("E");
    expect(h.control.failed).toBe(4); // the counts are kept
    h.attempts(40, 40, 40);
    expect(h.control.status).toBe("active");
  });

  it("accepting moves to the earlier stage the adult chose and keeps the furthest stage", () => {
    const h = harness("I");
    h.attempts(40, 40, 40, 40);
    expect(() => h.control.answerSuggestion(true, "I")).toThrow("notEarlierStage");
    h.control.answerSuggestion(true, "T");
    expect(h.control.stage).toBe("T");
    expect(h.control.failed).toBe(0); // T was never practised in this lesson
    expect(h.control.furthest).toBe("I");
    expect(h.control.suggestionPending).toBe(false);
  });

  it("a stage entered again keeps the counts it had (SRS BR-002, Section 9.2)", () => {
    const h = harness("E");
    h.attempts(40, 40, 40, 40); // 4 failed at E, suggestion offered
    h.control.answerSuggestion(true, "T");
    expect(h.control.failed).toBe(0);
    h.attempt(85); // pass at T: back to E
    expect(h.control.stage).toBe("E");
    expect(h.control.failed).toBe(4); // E's earlier failures still count towards its limit
    expect(h.control.evaluable).toBe(4);
    expect(h.control.streak).toBe(0); // the streak starts again
    expect(h.control.history).toEqual([]); // and so do the results compared for improving
    h.attempts(40, 40, 40);
    expect(h.control.status).not.toBe("ended");
    h.attempt(40); // the 8th failure at E: ATTEMPT_LIMIT
    expect(h.control.ending).toBe("endedAtLimit");
  });

  it("a pass clears a pending suggestion", () => {
    const h = harness("E");
    h.attempts(40, 40, 40, 40);
    h.attempt(85);
    expect(h.control.stage).toBe("I");
    expect(h.control.suggestionPending).toBe(false);
    expect(h.control.status).toBe("active");
  });

  it("uses the adult's streak", () => {
    const h = harness("E", { failStreak: 3 });
    h.attempts(40, 40, 40);
    expect(h.control.status).toBe("suggested");
  });
});

describe("lesson idle (SAF-RAY-009)", () => {
  it("shows a check-in, then ends the lesson", () => {
    const h = harness();
    h.wait(h.settings.lessonIdlePrompt);
    expect(h.control.tick(null).feedback).toEqual(["checkIn"]);
    expect(h.control.tick(null).feedback).toEqual([]); // shown once
    h.wait(h.settings.lessonIdleEnd);
    expect(h.control.tick(null).feedback).toEqual(["lessonEnded"]);
    expect(h.control.ending).toBe("endedIdle");
  });
});

describe("improving", () => {
  it("is false without 2 x window results", () => {
    expect(improving([10, 90, 90], 2)).toBe(false);
  });
  it("needs a rise of at least IMPROVE_MARGIN", () => {
    expect(improving([40, 40, 44, 44], 2)).toBe(false);
    expect(improving([40, 40, 45, 45], 2)).toBe(true);
    expect(improving([40, 45], 1)).toBe(true);
  });
});

describe("settings check (BR-008)", () => {
  it("accepts the defaults, which are the middle of each range", () => {
    expect(check(defaults())).toEqual([]);
    expect(defaults()).toMatchObject({ stagePass: 80, failStreak: 4, attemptLimit: 8, attemptLimitMax: 10 });
  });
  it("rejects a value outside its range", () => {
    expect(check({ ...defaults(), stagePass: 69 })).toEqual(["stagePass"]);
    expect(check({ ...defaults(), stagePass: 91 })).toEqual(["stagePass"]);
    expect(check({ ...defaults(), improveWindow: 1.5 })).toEqual(["improveWindow"]);
  });
  it("keeps the adult's values for the next lesson, as a copy", () => {
    const values = { ...defaults(), stagePass: 90 };
    choose(values);
    values.stagePass = 70; // a later change on screen does not reach what was chosen
    expect(chosen().stagePass).toBe(90);
    expect(() => choose({ ...defaults(), stagePass: 95 })).toThrow("invalidSettings");
    choose(defaults());
  });

  it("gives both values of a broken rule", () => {
    expect(check({ ...defaults(), attemptLimit: 10, attemptLimitMax: 8 }).sort()).toEqual([
      "attemptLimit",
      "attemptLimitMax",
    ]);
  });
});
