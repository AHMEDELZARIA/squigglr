// M08 Feedback. What each message says and shows. Lesson Control decides
// which feedback is given; this file decides only its wording and look, so
// either can change without the other. Every message describes the drawing,
// never the child, and nothing marks a drawing as "wrong".

import type { DifficultyKind, FeedbackKind } from "./types";

export interface Feedback {
  message: string;
  image: string;
  colour: string;
}

const KINDS: Record<FeedbackKind, Feedback> = {
  stagePassed: { message: "You did it! Here comes the next one.", image: "🌟", colour: "#24735b" },
  lessonComplete: { message: "All done! What a drawing!", image: "🎉", colour: "#24735b" },
  keepTrying: { message: "Nice try! Let's draw it again.", image: "💪", colour: "#5e51b8" },
  notEvaluable: { message: "Let's try that one again.", image: "✏️", colour: "#5e51b8" },
  checkIn: { message: "Still drawing? Tap to keep going.", image: "👋", colour: "#5e51b8" },
  lessonEnded: { message: "Good practice today!", image: "🌈", colour: "#5e51b8" },
};

const DIFFICULTIES: Record<DifficultyKind, Feedback> = {
  missedPart: { message: "A piece of the shape is not drawn yet.", image: "🧩", colour: "#b84a30" },
  missedEndpoint: { message: "The line did not reach a corner.", image: "📍", colour: "#b84a30" },
  offFigure: { message: "Some lines went away from the shape.", image: "↗️", colour: "#b84a30" },
};

export const feedback = (kind: FeedbackKind): Feedback => KINDS[kind];
export const difficultyFeedback = (kind: DifficultyKind): Feedback => DIFFICULTIES[kind];
/** Every approved message, so the wording can be reviewed in one place. */
export const allFeedback = (): Feedback[] => [...Object.values(KINDS), ...Object.values(DIFFICULTIES)];
