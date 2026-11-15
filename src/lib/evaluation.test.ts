import { describe, expect, it } from "vitest";
import * as catalogue from "./catalogue";
import { evaluate } from "./evaluation";
import { squareStroke, stroke, strokeOf } from "./testHelpers";
import type { DrawingStage, Stroke } from "./types";

const run = (id: string, strokes: Stroke[], stage: DrawingStage = "T", stagePass = 80) =>
  evaluate(strokes, catalogue.lesson(id).figure, stage, catalogue.difficulties(id, stage), stagePass);

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
    expect(e.difficulties).toContainEqual({ kind: "missedPart", index: 3 });
  });

  it("reports a missed corner", () => {
    // The top side stops short of the top-right corner, and the right side starts below it.
    const e = run("square", [
      stroke({ x: 250, y: 250 }, { x: 700, y: 250 }),
      stroke({ x: 750, y: 300 }, { x: 750, y: 750 }, { x: 250, y: 750 }, { x: 250, y: 250 }),
    ]);
    expect(e.passed).toBe(false);
    expect(e.difficulties).toContainEqual({ kind: "missedEndpoint", index: 1 });
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
    expect(e.difficulties).toContainEqual({ kind: "offFigure", index: 0 });
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
    const small = squareStroke(-200, 150, 0.4);
    expect(run("square", [small], "E").passed).toBe(false);
    const e = run("square", [small], "I");
    expect(e.passed).toBe(true);
    expect(e.guidance).toBe("independent");
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
});
