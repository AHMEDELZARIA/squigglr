import { describe, expect, it } from "vitest";
import type { Evaluate } from "./evaluation";
import { IDENTITY } from "./geometry";
import { improving } from "./improvement";
import { LessonControl } from "./lessonControl";
import { check, defaults, load, save } from "./settings";
import * as storage from "./storage";
import { lessonRecords, records as realRecords } from "./records";
import { memoryRecords, stroke } from "./testHelpers";
import type { Settings, Stage } from "./types";

// As the V&V Plan does for its rule tests, each attempt's completeness and
// result are given directly, so exact boundary values can be set.
type Prepared = number | "inv" | { result: number; complete: false };

function harness(start: Stage = "T", overrides: Partial<Settings> = {}) {
  const settings = { ...defaults(), ...overrides };
  const records = memoryRecords();
  let now = 1_000_000;
  let next: Prepared = 0;

  const evaluate: Evaluate = (_x, _f, stage, _ds, stagePass) => {
    const guidance = stage === "I" ? "independent" : "assisted";
    if (next === "inv") {
      return { class: "invalid", guidance, result: 0, passed: false, difficulties: [], drawn: 0, onFigure: 0, fit: IDENTITY };
    }
    const result = typeof next === "number" ? next : next.result;
    const complete = typeof next === "number";
    return {
      class: complete ? "complete" : "incomplete",
      guidance,
      result,
      passed: complete && result >= stagePass,
      difficulties: [],
      drawn: result / 100,
      onFigure: result / 100,
      fit: IDENTITY,
    };
  };

  const control = new LessonControl({ records, evaluate, now: () => now });
  control.select("p1", "square", start, settings);
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

  return { control, records, settings, attempt, attempts, wait: (s: number) => void (now += s * 1000), time: () => now };
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
    expect(h.records.ending).toBe("completed");
    expect(h.records.furthest).toBe("I");
    expect(h.records.attempts.map((a) => [a.stage, a.outcome])).toEqual([
      ["T", "passed"],
      ["E", "passed"],
      ["I", "passed"],
    ]);
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
  it("invalid input is neither saved nor counted", () => {
    const h = harness();
    expect(h.attempt("inv").feedback).toEqual(["notEvaluable"]);
    expect(h.control.failed).toBe(0);
    expect(h.control.evaluable).toBe(0);
    expect(h.records.attempts).toHaveLength(0);
  });

  it("an interrupted attempt is saved as interrupted and not counted", () => {
    const h = harness();
    h.control.addStroke(stroke({ x: 0, y: 0 }, { x: 100, y: 0 }));
    h.control.interrupt();
    expect(h.control.failed).toBe(0);
    expect(h.control.evaluable).toBe(0);
    expect(h.records.attempts[0]).toMatchObject({ outcome: "interrupted", result: null });
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

describe("records are kept faithfully", () => {
  it("a save that fails does not stop the lesson, and is counted", () => {
    const h = harness();
    h.records.saveAttempt = () => {
      throw new Error("QuotaExceededError");
    };
    expect(h.attempt(40).feedback).toEqual(["keepTrying"]);
    expect(h.attempt(85).feedback).toEqual(["stagePassed"]);
    expect(h.control.stage).toBe("E");
    expect(h.control.unsaved).toBe(2);
  });

  it("starting a lesson closes one that was cut off, as unfinished", () => {
    const first = realRecords.startLesson("cut-off-child", "square", "T");
    const second = realRecords.startLesson("cut-off-child", "circle", "T");
    const all = lessonRecords("cut-off-child");
    expect(all.find((r) => r.id === first)!.ending).toBe("unfinished");
    expect(all.find((r) => r.id === second)!.ending).toBe("inProgress");
  });
});

describe("stopping rules (FR-LRN-019 to FR-LRN-021)", () => {
  it("ends the lesson at ATTEMPT_LIMIT when the child is not improving", () => {
    const h = harness();
    const reports = h.attempts(40, 40, 40, 40, 40, 40, 40, 40);
    expect(reports[6].feedback).toEqual(["keepTrying"]);
    expect(reports[7].feedback).toEqual(["keepTrying", "lessonEnded"]);
    expect(h.records.ending).toBe("endedAtLimit");
    expect(h.records.furthest).toBe("T");
    expect(h.records.attempts).toHaveLength(8);
  });

  it("grants one extension when improving at the limit, then ends", () => {
    const h = harness();
    h.attempts(40, 40, 40, 40, 40, 40, 50, 50); // last two average 50, the two before 40
    expect(h.control.status).toBe("active");
    expect(h.control.extended).toBe(true);
    expect(h.records.extensions).toBe(1);
    h.attempt(60);
    expect(h.control.status).toBe("active");
    h.attempt(60); // ATTEMPT_EXTENSION (2) used up
    expect(h.control.status).toBe("ended");
    expect(h.records.extensions).toBe(1);
    expect(h.records.attempts).toHaveLength(10);
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
    expect(h.records.ending).toBe("endedAtMax");
    expect(h.records.extensions).toBe(0);
  });

  it("uses the adult's limit", () => {
    const h = harness("T", { attemptLimit: 6 });
    h.attempts(40, 40, 40, 40, 40, 40);
    expect(h.control.status).toBe("ended");
  });
});

describe("go-back suggestion (FR-LRN-019, FR-LRN-033 to FR-LRN-036)", () => {
  it("is offered after DIFFICULTY_STREAK failures in a row at E, and changes nothing by itself", () => {
    const h = harness("E");
    h.attempts(40, 40, 40);
    expect(h.control.status).toBe("active");
    h.attempt(40);
    expect(h.control.status).toBe("suggested");
    expect(h.control.stage).toBe("E");
    expect(h.records.suggestions).toMatchObject([{ from: "E", response: "pending" }]);
    h.attempt(40); // practice continues, and no second suggestion is made
    expect(h.records.suggestions).toHaveLength(1);
  });

  it("is never offered at T, which has no earlier drawing stage", () => {
    const h = harness("T");
    h.attempts(40, 40, 40, 40, 40);
    expect(h.control.status).toBe("active");
    expect(h.records.suggestions).toHaveLength(0);
  });

  it("is held back while the child is improving", () => {
    const h = harness("E");
    h.attempts(30, 30, 40, 40); // last two average 10 above the two before
    expect(h.control.status).toBe("active");
  });

  it("declining keeps the stage and needs a whole new streak", () => {
    const h = harness("E");
    h.attempts(40, 40, 40, 40);
    h.control.answerSuggestion(false);
    expect(h.control.status).toBe("active");
    expect(h.control.stage).toBe("E");
    expect(h.control.failed).toBe(4); // the counts are kept
    expect(h.records.suggestions[0].response).toBe("declined");
    h.attempts(40, 40, 40);
    expect(h.control.status).toBe("active");
  });

  it("accepting moves to the earlier stage the adult chose and keeps the furthest stage", () => {
    const h = harness("I");
    h.attempts(40, 40, 40, 40);
    expect(() => h.control.answerSuggestion(true, "I")).toThrow("notEarlierStage");
    h.control.answerSuggestion(true, "T");
    expect(h.control.stage).toBe("T");
    expect(h.control.failed).toBe(0);
    expect(h.control.furthest).toBe("I");
    expect(h.records.suggestions[0]).toMatchObject({ response: "accepted", stage: "T" });
  });

  it("a pass clears a pending suggestion and records it as ignored", () => {
    const h = harness("E");
    h.attempts(40, 40, 40, 40);
    h.attempt(85);
    expect(h.control.stage).toBe("I");
    expect(h.records.suggestions[0].response).toBe("ignored");
  });

  it("uses the adult's streak", () => {
    const h = harness("E", { difficultyStreak: 3 });
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
    expect(h.records.ending).toBe("endedIdle");
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
    expect(defaults()).toMatchObject({ stagePass: 80, difficultyStreak: 4, attemptLimit: 8, attemptLimitMax: 10 });
  });
  it("rejects a value outside its range", () => {
    expect(check({ ...defaults(), stagePass: 69 })).toEqual(["stagePass"]);
    expect(check({ ...defaults(), stagePass: 91 })).toEqual(["stagePass"]);
    expect(check({ ...defaults(), improveWindow: 1.5 })).toEqual(["improveWindow"]);
  });
  it("a value saved under an older, wider range counts as not chosen and takes the default", () => {
    // The pause that ends an attempt used to default to 10 seconds; today it goes from 3 to 7.
    storage.put("settings", "old-child", { ...defaults(), attemptIdle: 10, stagePass: 70 }, "old-child");
    const loaded = load("old-child");
    expect(loaded.attemptIdle).toBe(defaults().attemptIdle);
    expect(loaded.stagePass).toBe(70);
    expect(check(loaded)).toEqual([]);
  });

  it("saved values that cannot be used at all fall back to the defaults", () => {
    storage.put("settings", "odd-child", { attemptLimit: 6, attemptLimitMax: 8, stagePass: "high" }, "odd-child");
    expect(load("odd-child")).toEqual({ ...defaults(), attemptLimit: 6, attemptLimitMax: 8 });
    // 6 failed attempts with a cap of 8 is fine. A limit of 10 with a cap of 8 is not, so nothing saved is used.
    storage.put("settings", "odd-child", { attemptLimit: 10, attemptLimitMax: 8 }, "odd-child");
    expect(load("odd-child")).toEqual(defaults());
  });

  it("a child whose values were never changed is saved with nothing chosen", () => {
    save("new-child", defaults());
    expect(storage.get("settings", "new-child")).toEqual({});
    save("new-child", { ...defaults(), stagePass: 90 });
    expect(storage.get("settings", "new-child")).toEqual({ stagePass: 90 });
    expect(load("new-child")).toEqual({ ...defaults(), stagePass: 90 });
  });

  it("gives both values of a broken rule", () => {
    expect(check({ ...defaults(), attemptLimit: 10, attemptLimitMax: 8 }).sort()).toEqual([
      "attemptLimit",
      "attemptLimitMax",
    ]);
  });
});
