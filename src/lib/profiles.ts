// M15 Learner Profile. A profile is a generated id and an avatar, nothing
// else: no name and no photo (BR-001).

import * as settings from "./settings";
import * as storage from "./storage";
import type { Learner } from "./types";

/**
 * The pictures a child can have. All animals, so none is a person, a flag or
 * a gesture. The first eight have their own paw print on the progress trail
 * (components/icons.tsx); the others use a plain round print.
 */
export const AVATARS = [
  "🦊", "🐼", "🐸", "🦁", "🐙", "🦄", "🐢", "🐝",
  "🐶", "🐱", "🐭", "🐹", "🐰", "🐻", "🐨", "🐯",
  "🐮", "🐷", "🐵", "🐔", "🐧", "🐦", "🦉", "🦋",
  "🐞", "🐌", "🐬", "🐳", "🦈", "🦀", "🦒", "🦓",
  "🐘", "🦔", "🐿️", "🦥",
];

/** Creates a profile and saves the default settings for it. */
export function create(avatar: string): Learner {
  const learner: Learner = { id: storage.newId(), avatar, createdAt: Date.now() };
  storage.put("learner", learner.id, learner);
  settings.save(learner.id, settings.defaults());
  return learner;
}

/** Every profile, in the order they were created. */
export function learners(): Learner[] {
  return storage.list<Learner>("learner").sort((a, b) => a.createdAt - b.createdAt);
}

export function setActive(learnerId: string): void {
  storage.put("active", "current", learnerId);
}

export function clearActive(): void {
  storage.remove("active", "current");
}

/** The active learner, or null when no child has been chosen. */
export function active(): Learner | null {
  const id = storage.get<string>("active", "current");
  return id === null ? null : storage.get<Learner>("learner", id);
}
