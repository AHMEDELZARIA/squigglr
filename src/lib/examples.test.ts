import { describe, expect, it } from "vitest";
import * as catalogue from "./catalogue";
import { evaluate } from "./evaluation";
import { passingExample } from "./examples";

describe("pass mark examples (BR-008)", () => {
  for (const { id } of catalogue.LESSONS) {
    for (const mark of [70, 80, 90]) {
      it(`${id} at ${mark}: the example just passes, and would not pass 6 points higher`, () => {
        const figure = catalogue.lesson(id).figure;
        const strokes = passingExample(figure, mark);
        const at = evaluate(strokes, figure, "T", catalogue.problems(id, "T"), mark);
        expect(at.class).toBe("complete");
        expect(at.passed).toBe(true);
        expect(at.result).toBeLessThan(mark + 6);
      });
    }
  }
});
