import { describe, expect, it } from "vitest";
import { Attempt } from "./attempt";
import * as catalogue from "./catalogue";
import { evaluate } from "./evaluation";
import { squareStroke, stroke, strokeOf } from "./testHelpers";
import type { DrawingStage, Stroke } from "./types";

const run = (id: string, strokes: Stroke[], stage: DrawingStage = "T", stagePass = 80) =>
  evaluate(strokes, catalogue.lesson(id).figure, stage, catalogue.problems(id, stage), stagePass);

describe("evaluate: square", () => {
  it("passes an exact square with a result of 100", () => {
    const e = run("square", [squareStroke()]);
    expect(e.class).toBe("complete");
    expect(e.result).toBeCloseTo(100);
    expect(e.passed).toBe(true);
    expect(e.guidance).toBe("assisted");
  });

  it("evaluates four separate strokes together as one attempt", () => {
    const sides = catalogue.lesson("square").figure.parts.map(strokeOf);
    expect(run("square", sides.slice(0, 3)).passed).toBe(false);
    expect(run("square", sides).passed).toBe(true);
  });

  it("a square with one side missing is incomplete and does not pass", () => {
    const e = run("square", catalogue.lesson("square").figure.parts.slice(0, 3).map(strokeOf));
    expect(e.class).toBe("incomplete");
    // Not 75: the two ends of the missing side lie within the tolerance of the
    // sides next to it, so they count as drawn. See "Findings" in the plan.
    expect(e.result).toBeCloseTo(78.6, 0);
    expect(e.passed).toBe(false);
    expect(e.problems).toContainEqual({ kind: "missedPart", index: 3 });
  });

  it("reports a missed corner", () => {
    // The top side stops short of the top-right corner, and the right side starts below it.
    const e = run("square", [
      stroke({ x: 250, y: 250 }, { x: 700, y: 250 }),
      stroke({ x: 750, y: 300 }, { x: 750, y: 750 }, { x: 250, y: 750 }, { x: 250, y: 250 }),
    ]);
    expect(e.passed).toBe(false);
    expect(e.problems).toContainEqual({ kind: "missedEndpoint", index: 1 });
  });

  it("accepts a square drawn within the tolerance and rejects one drawn outside it", () => {
    expect(run("square", [squareStroke(20, 20)]).passed).toBe(true); // tolerance is about 35 units
    expect(run("square", [squareStroke(60, 60)]).passed).toBe(false);
  });

  it("does not pass a complete square with a lot drawn off the figure", () => {
    const scribble = stroke({ x: 300, y: 300 }, { x: 700, y: 700 }, { x: 300, y: 700 }, { x: 700, y: 300 });
    const e = run("square", [squareStroke(), scribble]);
    expect(e.class).toBe("complete");
    expect(e.result).toBeLessThan(70);
    expect(e.passed).toBe(false);
    expect(e.problems).toContainEqual({ kind: "offFigure", index: 0 });
  });

  it("uses the adult's pass mark: the same drawing passes at 70 and fails at 90", () => {
    // A complete square plus an extra line off the figure: about 83% of the drawing is on the figure.
    const drawing = [squareStroke(), stroke({ x: 300, y: 500 }, { x: 700, y: 500 })];
    const result = run("square", drawing).result;
    expect(result).toBeGreaterThan(70);
    expect(result).toBeLessThan(90);
    expect(run("square", drawing, "T", 70).passed).toBe(true);
    expect(run("square", drawing, "T", 90).passed).toBe(false);
  });

  it("at the independent stage, position and size do not matter", () => {
    const small = squareStroke(-200, 150, 0.5);
    expect(run("square", [small], "E").passed).toBe(false);
    const e = run("square", [small], "I");
    expect(e.passed).toBe(true);
    expect(e.guidance).toBe("independent");
  });

  it("at the independent stage, a stray mark far from the square does not spoil the fit", () => {
    const drawing = [squareStroke(-150, 100, 0.6), stroke({ x: 900, y: 80 }, { x: 960, y: 120 })];
    const e = run("square", drawing, "I");
    expect(e.class).toBe("complete");
    expect(e.passed).toBe(true);
  });

  it("at the independent stage, a long line far from the square does not stretch the fit, but still counts as off the shape", () => {
    // A small square on the left, and a long line on the right: far more than the 8% trim can leave out.
    const square = squareStroke(-200, 0, 0.5);
    const farLine = stroke({ x: 700, y: 200 }, { x: 950, y: 800 });
    const e = run("square", [square, farLine], "I");
    const kinds = e.problems.map((d) => d.kind);
    // The square is found whole: no side or corner is missing.
    expect(kinds).not.toContain("missedPart");
    expect(kinds).not.toContain("missedEndpoint");
    // The line is still part of the drawing, so it lowers the result and is reported.
    expect(kinds).toContain("offFigure");
    expect(e.passed).toBe(false);
  });

  it("at the independent stage, two squares side by side do not pass", () => {
    const left = squareStroke(-250, 0, 0.4);
    const right = squareStroke(250, 0, 0.4);
    const e = run("square", [left, right], "I");
    expect(e.passed).toBe(false);
    expect(e.problems.map((d) => d.kind)).toContain("offFigure");
  });

  it("at the independent stage, only the left and right sides: the top and bottom are reported as missing", () => {
    const leftSide = stroke({ x: 250, y: 250 }, { x: 250, y: 750 });
    const rightSide = stroke({ x: 750, y: 250 }, { x: 750, y: 750 });
    const missing = run("square", [leftSide, rightSide], "I")
      .problems.filter((d) => d.kind === "missedPart")
      .map((d) => d.index);
    // The square's parts are, in order: 0 top, 1 right, 2 bottom, 3 left.
    expect(missing).toEqual([0, 2]);
  });

  it("at the independent stage, a square drawn a little wider than tall still passes", () => {
    const p = (x: number, y: number) => ({ x: 500 + (x - 500) * 1.14, y });
    const wide = stroke(p(250, 250), p(750, 250), p(750, 750), p(250, 750), p(250, 250));
    expect(run("square", [wide], "I").passed).toBe(true);
  });

  it("at the independent stage, a rectangle is not a square, and is reported as stretched, not as missing parts", () => {
    // 435 wide and 316 tall, as drawn on a tablet by the team.
    const wide = stroke({ x: 290, y: 240 }, { x: 725, y: 240 }, { x: 725, y: 556 }, { x: 290, y: 556 }, { x: 290, y: 240 });
    const thin = stroke({ x: 200, y: 400 }, { x: 800, y: 400 }, { x: 800, y: 600 }, { x: 200, y: 600 }, { x: 200, y: 400 });
    for (const drawing of [wide, thin]) {
      const e = run("square", [drawing], "I", 70);
      expect(e.passed).toBe(false);
      expect(e.class).toBe("incomplete");
      expect(e.problems).toEqual([{ kind: "stretched", index: 0 }]);
    }
  });

  it("at the independent stage, an oval is reported as stretched in the circle lesson", () => {
    const oval = catalogue
      .lesson("circle")
      .figure.parts.map((part) => strokeOf(part.map((p) => ({ x: 500 + (p.x - 500) * 1.5, y: p.y }))));
    expect(run("circle", oval, "I", 70).problems).toEqual([{ kind: "stretched", index: 0 }]);
  });

  it("at the independent stage, a rectangle with a side missing is still reported as missing a part", () => {
    const open = stroke({ x: 290, y: 240 }, { x: 725, y: 240 }, { x: 725, y: 556 }, { x: 290, y: 556 });
    const kinds = run("square", [open], "I", 70).problems.map((d) => d.kind);
    expect(kinds).toContain("missedPart");
    expect(kinds).not.toContain("stretched");
  });

  it("at the independent stage, a very small drawing is incomplete and reported as too small", () => {
    const e = run("square", [squareStroke(0, 0, 0.2)], "I");
    expect(e.class).toBe("incomplete");
    expect(e.passed).toBe(false);
    expect(e.problems).toContainEqual({ kind: "tooSmall", index: 0 });
    // With a guide, size is set by the guide, so "too small" is never reported there.
    expect(run("square", [squareStroke(0, 0, 0.2)], "T").problems).not.toContainEqual({ kind: "tooSmall", index: 0 });
  });

  it("is invalid for no strokes, a tap, or a missing coordinate, and never passes", () => {
    expect(run("square", []).class).toBe("invalid");
    expect(run("square", [stroke({ x: 250, y: 250 })]).class).toBe("invalid");
    const broken = squareStroke();
    broken.points[3].x = NaN;
    const e = run("square", [broken]);
    expect(e.class).toBe("invalid");
    expect(e.passed).toBe(false);
  });

  it("gives the same result every time for the same input", () => {
    const drawing = [squareStroke(15, -10)];
    expect(run("square", drawing)).toEqual(run("square", drawing));
  });
});

describe("what an attempt notes about the drawing (FR-REC-003)", () => {
  const sides = catalogue.lesson("square").figure.parts.map(strokeOf);
  const attemptAt = (stage: DrawingStage) =>
    new Attempt("square", stage, catalogue.lesson("square").figure, catalogue.problems("square", stage), 80, 5, evaluate);

  it("with no guide, a square drawn one side at a time is not noted as off the shape along the way", () => {
    const attempt = attemptAt("I");
    sides.forEach((side, i) => attempt.addStroke(side, i));
    expect(attempt.outcome).toBe("passed");
    expect(attempt.seen).toEqual([]);
  });

  it("with a guide, a line off the shape is noted, and marked corrected once the drawing is mostly on it", () => {
    const attempt = attemptAt("T");
    attempt.addStroke(stroke({ x: 300, y: 500 }, { x: 700, y: 500 }), 0);
    expect(attempt.seen).toEqual([{ problem: { kind: "offFigure", index: 0 }, corrected: false }]);
    sides.forEach((side, i) => attempt.addStroke(side, i + 1));
    expect(attempt.outcome).toBe("passed");
    expect(attempt.seen).toEqual([{ problem: { kind: "offFigure", index: 0 }, corrected: true }]);
  });
});

describe("evaluate: circle", () => {
  const parts = catalogue.lesson("circle").figure.parts;

  it("passes an exact circle", () => {
    expect(run("circle", parts.map(strokeOf)).passed).toBe(true);
  });

  it("does not pass a circle left open", () => {
    const e = run("circle", parts.slice(0, 3).map(strokeOf));
    expect(e.class).toBe("incomplete");
    expect(e.passed).toBe(false);
  });

  it("does not pass a square drawn in the circle lesson", () => {
    expect(run("circle", [squareStroke()]).passed).toBe(false);
  });

  it("with no guide, the wrong shape does not pass even at the lowest pass mark", () => {
    const triangle = stroke({ x: 500, y: 250 }, { x: 750, y: 750 }, { x: 250, y: 750 }, { x: 500, y: 250 });
    expect(run("circle", [squareStroke()], "I", 70).passed).toBe(false);
    expect(run("circle", [squareStroke(100, -80, 0.6)], "I", 70).passed).toBe(false);
    expect(run("square", parts.map(strokeOf), "I", 70).passed).toBe(false);
    expect(run("square", [triangle], "I", 70).passed).toBe(false);
  });

  it("with no guide, a smaller circle drawn anywhere passes", () => {
    const small = parts.map((part) => strokeOf(part.map((p) => ({ x: p.x * 0.5 + 50, y: p.y * 0.5 + 300 }))));
    expect(run("circle", small, "I").passed).toBe(true);
  });
});
