// M10 Attempt Record. Lesson records and attempt records, kept per learner.
// Only Lesson Control writes here; the Practice story reads.

import * as storage from "./storage";
import type { AttemptRecord, DrawingStage, Ending, LessonRecord, Stage, SuggestionResponse } from "./types";

/** The interface Lesson Control needs. Tests pass an in-memory version. */
export interface RecordStore {
  startLesson(learner: string, lesson: string, start: Stage): string;
  saveAttempt(recordId: string, attempt: Omit<AttemptRecord, "id" | "lessonRecordId">): void;
  recordPass(recordId: string, stage: DrawingStage): void;
  recordExtension(recordId: string): void;
  offerSuggestion(recordId: string, from: DrawingStage, at: number): number;
  answerSuggestion(recordId: string, index: number, response: SuggestionResponse, stage: DrawingStage | null): void;
  endLesson(recordId: string, ending: Ending, furthest: Stage): void;
}

function open(recordId: string): LessonRecord {
  const record = storage.get<LessonRecord>("lessonRecord", recordId);
  if (record === null) throw new Error("unknownRecord");
  // After a lesson ends, its record never changes (FR-REC-009).
  if (record.ending !== "inProgress") throw new Error("lessonEnded");
  return record;
}

const write = (record: LessonRecord) => storage.put("lessonRecord", record.id, record, record.learner);

export const records: RecordStore = {
  // A new record every time, even for a lesson started before, so earlier
  // attempts are kept.
  startLesson(learner, lesson, start) {
    // One lesson runs at a time. A lesson still marked in progress was cut
    // off (the page was closed or reloaded), so it is closed as unfinished.
    for (const stale of storage.list<LessonRecord>("lessonRecord", learner)) {
      if (stale.ending === "inProgress") write({ ...stale, ending: "unfinished" });
    }
    const record: LessonRecord = {
      id: storage.newId(),
      learner,
      lesson,
      start,
      furthest: start,
      passes: { T: 0, E: 0, I: 0 },
      extensions: 0,
      ending: "inProgress",
      suggestions: [],
      startedAt: Date.now(),
    };
    write(record);
    return record.id;
  },

  saveAttempt(recordId, attempt) {
    const record = open(recordId);
    const id = storage.newId();
    storage.put("attempt", id, { ...attempt, id, lessonRecordId: recordId }, record.learner);
  },

  recordPass(recordId, stage) {
    const record = open(recordId);
    record.passes[stage] += 1;
    write(record);
  },

  recordExtension(recordId) {
    const record = open(recordId);
    record.extensions += 1;
    write(record);
  },

  offerSuggestion(recordId, from, at) {
    const record = open(recordId);
    record.suggestions.push({ from, offeredAt: at, response: "pending", stage: null });
    write(record);
    return record.suggestions.length - 1;
  },

  answerSuggestion(recordId, index, response, stage) {
    const record = open(recordId);
    const suggestion = record.suggestions[index];
    if (!suggestion) throw new Error("unknownSuggestion");
    if (suggestion.response !== "pending") throw new Error("alreadyAnswered");
    suggestion.response = response;
    suggestion.stage = response === "accepted" ? stage : null;
    write(record);
  },

  endLesson(recordId, ending, furthest) {
    const record = open(recordId);
    record.ending = ending;
    record.furthest = furthest;
    write(record);
  },
};

/** A learner's lesson records, oldest first. */
export function lessonRecords(learner: string): LessonRecord[] {
  return storage.list<LessonRecord>("lessonRecord", learner).sort((a, b) => a.startedAt - b.startedAt);
}

/** The attempts of one lesson record, oldest first. */
export function attempts(learner: string, recordId: string): AttemptRecord[] {
  return storage
    .list<AttemptRecord>("attempt", learner)
    .filter((a) => a.lessonRecordId === recordId)
    .sort((a, b) => a.endedAt - b.endedAt);
}
