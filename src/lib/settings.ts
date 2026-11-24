// M16 Learner Settings. Ranges, defaults and the rules between values, and
// the values the adult chose for this session.

import type { SettingName, Settings } from "./types";

export interface Range {
  min: number;
  max: number;
  default: number;
  label: string;
  unit: string;
  help: string;
}

function range(min: number, max: number, label: string, unit: string, help: string): Range {
  const middle = Math.round((min + max) / 2); // BR-008: the default is the middle of the range
  return { min: min, max: max, default: middle, label: label, unit: unit, help: help };
}

/**
 * The first six ranges are the SRS's. The SRS leaves the three idle ranges
 * "TBD", so those are this POC's proposal. They are chosen so that
 * attemptIdle < lessonIdlePrompt < lessonIdleEnd holds for every allowed value.
 */
export const RANGES: Record<SettingName, Range> = {
  stagePass: range(70, 90, "Pass mark", "points", "How accurate a complete drawing must be to pass a stage."),
  failStreak: range(3, 5, "Failed attempts before a suggestion", "attempts", "Failed attempts in a row before Squigglr suggests going back a stage."),
  attemptLimit: range(6, 10, "Failed attempts before the lesson ends", "attempts", "Failed attempts at one stage before the lesson ends or is extended."),
  improveWindow: range(1, 3, "Improvement window", "attempts", "How many recent attempts are compared with the ones before them."),
  attemptExtension: range(1, 3, "Extra attempts when improving", "attempts", "Extra attempts given once if the child is improving at the limit."),
  attemptLimitMax: range(8, 12, "Most attempts at one stage", "attempts", "The hard cap on attempts at one stage, extension included."),
  attemptIdle: range(3, 7, "Pause that ends an attempt", "seconds", "Time with no drawing after which an attempt that has not passed ends."),
  lessonIdlePrompt: range(30, 60, "Pause before a check-in", "seconds", "Time with no drawing before the child sees a check-in."),
  lessonIdleEnd: range(90, 180, "Pause that ends the lesson", "seconds", "Time with no drawing after which the lesson ends."),
};

export const SETTING_NAMES = Object.keys(RANGES) as SettingName[];

/** The recommended values: the middle of each range (BR-008). */
export function defaults(): Settings {
  return {
    stagePass: RANGES.stagePass.default,
    failStreak: RANGES.failStreak.default,
    attemptLimit: RANGES.attemptLimit.default,
    improveWindow: RANGES.improveWindow.default,
    attemptExtension: RANGES.attemptExtension.default,
    attemptLimitMax: RANGES.attemptLimitMax.default,
    attemptIdle: RANGES.attemptIdle.default,
    lessonIdlePrompt: RANGES.lessonIdlePrompt.default,
    lessonIdleEnd: RANGES.lessonIdleEnd.default,
  };
}

/**
 * The values that cannot be saved: outside their range, not whole numbers, or
 * breaking a rule between values (both values of a broken rule are given).
 * An empty list means the settings can be saved.
 */
export function check(s: Settings): SettingName[] {
  const bad = new Set<SettingName>();
  for (const name of SETTING_NAMES) {
    const v = s[name];
    const r = RANGES[name];
    if (!Number.isInteger(v) || v < r.min || v > r.max) bad.add(name);
  }
  // Each rule between two values: if it is broken, both values are marked.
  markIfBroken(bad, s.attemptLimit > s.failStreak, "attemptLimit", "failStreak");
  markIfBroken(bad, s.attemptLimitMax >= s.attemptLimit, "attemptLimitMax", "attemptLimit");
  markIfBroken(bad, s.attemptIdle < s.lessonIdlePrompt, "attemptIdle", "lessonIdlePrompt");
  markIfBroken(bad, s.lessonIdlePrompt < s.lessonIdleEnd, "lessonIdlePrompt", "lessonIdleEnd");
  return Array.from(bad);
}

function markIfBroken(bad: Set<SettingName>, ruleHolds: boolean, a: SettingName, b: SettingName): void {
  if (!ruleHolds) {
    bad.add(a);
    bad.add(b);
  }
}

/** A separate copy of the values, so changing one does not change the other. */
export function copySettings(s: Settings): Settings {
  const copy = defaults();
  for (const name of SETTING_NAMES) {
    copy[name] = s[name];
  }
  return copy;
}

// The values the adult chose on the Lesson ready screen. The POC saves
// nothing: they are kept only while the app is open, and a reload brings
// back the recommended values (the middle of each range, BR-008).
let chosenValues: Settings = defaults();

/** The values the adult chose, or the recommended ones if nothing was chosen yet. */
export function chosen(): Settings {
  return copySettings(chosenValues);
}

/** Keeps the adult's values for the lessons started from now on. Throws if any value fails `check`. */
export function choose(s: Settings): void {
  if (check(s).length > 0) throw new Error("invalidSettings");
  chosenValues = copySettings(s);
}
