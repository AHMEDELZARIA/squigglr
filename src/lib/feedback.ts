// M08 Feedback. What each message says and shows. Lesson Control decides
// which feedback is given; this file decides only its wording and look, so
// either can change without the other. Every message describes the drawing,
// never the child, and nothing marks a drawing as "wrong".

import type { DrawingProblemKind, FeedbackKind, Stage } from "./types";

export interface Feedback {
  message: string;
  image: string;
  colour: string;
}

// The three colours of a message, so they are chosen in one place.
/** A step or the lesson is done. */
const PASSED_COLOUR = "#24735b";
/** Encouragement: try again, finish it, keep going. */
const ENCOURAGE_COLOUR = "#5e51b8";
/** Something about the drawing to fix. */
const PROBLEM_COLOUR = "#b84a30";

const KINDS: Record<FeedbackKind, Feedback> = {
  stagePassed: { message: "You did it! Here comes the next one.", image: "🌟", colour: PASSED_COLOUR },
  lessonComplete: { message: "Great practising! Here's your sticker!", image: "🎉", colour: PASSED_COLOUR },
  fillIn: { message: "Great try! Finish where it's glowing!", image: "✨", colour: ENCOURAGE_COLOUR },
  keepTrying: { message: "Great try! Let's draw it again.", image: "💪", colour: ENCOURAGE_COLOUR },
  notEvaluable: { message: "Let's try that one again.", image: "✏️", colour: ENCOURAGE_COLOUR },
  checkIn: { message: "Still drawing? Tap to keep going.", image: "👋", colour: ENCOURAGE_COLOUR },
  lessonEnded: { message: "Great practising! Here's your sticker!", image: "🌈", colour: ENCOURAGE_COLOUR },
};

const PROBLEMS: Record<DrawingProblemKind, Feedback> = {
  missedPart: { message: "Look where it's glowing.", image: "🧩", colour: PROBLEM_COLOUR },
  missedEndpoint: { message: "The line missed a dot.", image: "📍", colour: PROBLEM_COLOUR },
  offFigure: { message: "Some lines went away from the shape.", image: "↗️", colour: PROBLEM_COLOUR },
  tooSmall: { message: "Try drawing it bigger.", image: "🔍", colour: PROBLEM_COLOUR },
  stretched: { message: "Try making it as tall as it is wide.", image: "↔️", colour: PROBLEM_COLOUR },
};

/** What the helper says at the start of each stage. */
const STAGE_LINES: Record<Stage, string> = {
  D: "Watch me!",
  T: "Your turn!",
  E: "Now join the dots!",
  I: "Now draw it on your own!",
};

export function stageLine(stage: Stage): string {
  return STAGE_LINES[stage];
}

export function feedback(kind: FeedbackKind): Feedback {
  return KINDS[kind];
}

export function problemFeedback(kind: DrawingProblemKind): Feedback {
  return PROBLEMS[kind];
}

/** Every approved message, so the wording can be reviewed in one place. */
export function allFeedback(): string[] {
  const all: string[] = [];
  for (const f of Object.values(KINDS)) {
    all.push(f.message);
  }
  for (const f of Object.values(PROBLEMS)) {
    all.push(f.message);
  }
  for (const line of Object.values(STAGE_LINES)) {
    all.push(line);
  }
  return all;
}
