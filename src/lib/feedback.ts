// M08 Feedback. What each message says and shows. Lesson Control decides
// which feedback is given; this file decides only its wording and look, so
// either can change without the other. Every message describes the drawing,
// never the child, and nothing marks a drawing as "wrong".

import type { DifficultyKind, FeedbackKind, Stage } from "./types";

export interface Feedback {
  message: string;
  image: string;
  colour: string;
}

const KINDS: Record<FeedbackKind, Feedback> = {
  stagePassed: { message: "You did it! Here comes the next one.", image: "🌟", colour: "#24735b" },
  lessonComplete: { message: "Great practising! Here's your sticker!", image: "🎉", colour: "#24735b" },
  fillIn: { message: "Great try! Finish where it's glowing!", image: "✨", colour: "#5e51b8" },
  keepTrying: { message: "Great try! Let's draw it again.", image: "💪", colour: "#5e51b8" },
  notEvaluable: { message: "Let's try that one again.", image: "✏️", colour: "#5e51b8" },
  checkIn: { message: "Still drawing? Tap to keep going.", image: "👋", colour: "#5e51b8" },
  lessonEnded: { message: "Great practising! Here's your sticker!", image: "🌈", colour: "#5e51b8" },
};

const DIFFICULTIES: Record<DifficultyKind, Feedback> = {
  missedPart: { message: "Look where it's glowing.", image: "🧩", colour: "#b84a30" },
  missedEndpoint: { message: "The line missed a dot.", image: "📍", colour: "#b84a30" },
  offFigure: { message: "Some lines went away from the shape.", image: "↗️", colour: "#b84a30" },
  tooSmall: { message: "Try drawing it bigger.", image: "🔍", colour: "#b84a30" },
  stretched: { message: "Try making it as tall as it is wide.", image: "↔️", colour: "#b84a30" },
};

/** What the helper says at the start of each stage. */
const STAGE_LINES: Record<Stage, string> = {
  D: "Watch me!",
  T: "Your turn!",
  E: "Now join the dots!",
  I: "Now draw it on your own!",
};

export const stageLine = (stage: Stage): string => STAGE_LINES[stage];
export const feedback = (kind: FeedbackKind): Feedback => KINDS[kind];
export const difficultyFeedback = (kind: DifficultyKind): Feedback => DIFFICULTIES[kind];
/** Every approved message, so the wording can be reviewed in one place. */
export const allFeedback = (): string[] => [
  ...Object.values(KINDS).map((f) => f.message),
  ...Object.values(DIFFICULTIES).map((f) => f.message),
  ...Object.values(STAGE_LINES),
];
