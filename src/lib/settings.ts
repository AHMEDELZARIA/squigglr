// M16 Learner Settings. Ranges, defaults and the rules between values.
// Saving goes through the Storage module.

import * as storage from "./storage";
import type { SettingName, Settings } from "./types";

export interface Range {
  min: number;
  max: number;
  default: number;
  label: string;
  unit: string;
  help: string;
}

const range = (min: number, max: number, label: string, unit: string, help: string): Range => ({
  min,
  max,
  default: Math.round((min + max) / 2), // BR-008: the default is the middle of the range
  label,
  unit,
  help,
});

/**
 * The first six ranges are the SRS's. The SRS leaves the three idle ranges
 * "TBD", so those are this POC's proposal. They are chosen so that
 * attemptIdle < lessonIdlePrompt < lessonIdleEnd holds for every allowed value.
 */
export const RANGES: Record<SettingName, Range> = {
  stagePass: range(70, 90, "Pass mark", "points", "How accurate a complete drawing must be to pass a stage."),
  difficultyStreak: range(3, 5, "Failed attempts before a suggestion", "attempts", "Failed attempts in a row before Squigglr suggests going back a stage."),
  attemptLimit: range(6, 10, "Failed attempts before the lesson ends", "attempts", "Failed attempts at one stage before the lesson ends or is extended."),
  improveWindow: range(1, 3, "Improvement window", "attempts", "How many recent attempts are compared with the ones before them."),
  attemptExtension: range(1, 3, "Extra attempts when improving", "attempts", "Extra attempts given once if the child is improving at the limit."),
  attemptLimitMax: range(8, 12, "Most attempts at one stage", "attempts", "The hard cap on attempts at one stage, extension included."),
  attemptIdle: range(3, 7, "Pause that ends an attempt", "seconds", "Time with no drawing after which an attempt that has not passed ends."),
  lessonIdlePrompt: range(30, 60, "Pause before a check-in", "seconds", "Time with no drawing before the child sees a check-in."),
  lessonIdleEnd: range(90, 180, "Pause that ends the lesson", "seconds", "Time with no drawing after which the lesson ends."),
};

export const SETTING_NAMES = Object.keys(RANGES) as SettingName[];

export function defaults(): Settings {
  const s = {} as Settings;
  for (const name of SETTING_NAMES) s[name] = RANGES[name].default;
  return s;
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
  const rule = (ok: boolean, a: SettingName, b: SettingName) => {
    if (!ok) {
      bad.add(a);
      bad.add(b);
    }
  };
  rule(s.attemptLimit > s.difficultyStreak, "attemptLimit", "difficultyStreak");
  rule(s.attemptLimitMax >= s.attemptLimit, "attemptLimitMax", "attemptLimit");
  rule(s.attemptIdle < s.lessonIdlePrompt, "attemptIdle", "lessonIdlePrompt");
  rule(s.lessonIdlePrompt < s.lessonIdleEnd, "lessonIdlePrompt", "lessonIdleEnd");
  return [...bad];
}

/** The learner's saved values, with the default for any value not chosen. */
export function load(learnerId: string): Settings {
  return { ...defaults(), ...(storage.get<Partial<Settings>>("settings", learnerId) ?? {}) };
}

/** Saves the values. Throws if any value fails `check`, so no bad value is ever saved. */
export function save(learnerId: string, s: Settings): void {
  if (check(s).length > 0) throw new Error("invalidSettings");
  storage.put("settings", learnerId, s, learnerId);
}
