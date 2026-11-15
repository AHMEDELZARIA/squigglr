"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Sticker } from "@/components/icons";
import { Screen } from "@/components/Screen";
import { StrokePreview } from "@/components/StrokePreview";
import { useActiveLearner } from "@/components/useActiveLearner";
import * as catalogue from "@/lib/catalogue";
import { difficultyFeedback } from "@/lib/feedback";
import * as profiles from "@/lib/profiles";
import * as records from "@/lib/records";
import type { AttemptRecord, Ending, Learner, LessonRecord, Stage } from "@/lib/types";

// S5 "Practice story: this week". A plain-words look at the week for one
// child: the days they practised, and their real drawings with a guide and
// without one. Under it, every saved attempt in full. It shows practice,
// not an assessment.

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STAGE: Record<Stage, string> = {
  D: "Demonstration",
  T: "Full outline",
  E: "Endpoints only",
  I: "On my own",
};

const ENDING: Record<Ending, string> = {
  inProgress: "In progress",
  completed: "Completed",
  endedAtLimit: "Ended at the attempt limit",
  endedAtMax: "Ended at the most attempts allowed",
  endedIdle: "Ended after no drawing",
  unfinished: "Left unfinished",
};

const OUTCOME = { passed: "Passed", notPassed: "Not passed", interrupted: "Interrupted" } as const;
const PILL = {
  passed: "bg-mint-deep text-green",
  notPassed: "bg-peach-deep text-coral",
  interrupted: "bg-butter text-butter-ink",
} as const;

/** Monday of the current week, at midnight. */
function weekStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

/** 0 for Monday to 6 for Sunday, or -1 if the time is not in this week. */
function dayOf(time: number, start: number): number {
  const day = Math.floor((time - start) / 86_400_000);
  return day >= 0 && day < 7 ? day : -1;
}

interface LessonStory {
  record: LessonRecord;
  attempts: AttemptRecord[];
}

export default function PracticeStory() {
  const { learner: active, ready } = useActiveLearner();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [shown, setShown] = useState<Learner | null>(null);
  const [lessons, setLessons] = useState<LessonStory[]>([]);

  useEffect(() => {
    const all = profiles.learners();
    setLearners(all);
    if (ready) setShown((s) => s ?? active ?? all[0] ?? null);
  }, [ready, active]);

  useEffect(() => {
    if (!shown) return;
    setLessons(
      records
        .lessonRecords(shown.id)
        .reverse()
        .map((record) => ({ record, attempts: records.attempts(shown.id, record.id) })),
    );
  }, [shown]);

  const start = weekStart();
  const practised = DAYS.map((_, day) => lessons.some(({ record }) => dayOf(record.startedAt, start) === day));
  const daysPractised = practised.filter(Boolean).length;

  // For each lesson practised this week: the last drawing of each day, with a guide and without one.
  const lessonIds = [...new Set(lessons.map(({ record }) => record.lesson))];
  const grids = lessonIds
    .map((lessonId) => {
      const attempts = lessons
        .filter(({ record }) => record.lesson === lessonId)
        .flatMap(({ attempts }) => attempts)
        .filter((a) => dayOf(a.endedAt, start) >= 0 && a.strokes.length > 0)
        .sort((a, b) => a.endedAt - b.endedAt);
      const days = [...new Set(attempts.map((a) => dayOf(a.endedAt, start)))].sort();
      const last = (day: number, guided: boolean) =>
        attempts.filter((a) => dayOf(a.endedAt, start) === day && (a.stage !== "I") === guided).at(-1);
      return { lesson: catalogue.lesson(lessonId), days, last };
    })
    .filter((g) => g.days.length > 0);

  return (
    <Screen
      title="Practice story: this week"
      back="/grown-ups"
      right={
        <div className="flex gap-2">
          {learners.map((learner, i) => (
            <button
              key={learner.id}
              onClick={() => setShown(learner)}
              aria-label={`Show child ${i + 1}`}
              aria-pressed={learner.id === shown?.id}
              className={`rounded-2xl p-1 ${learner.id === shown?.id ? "border-2 border-ink" : "border-2 border-transparent"}`}
            >
              <Avatar avatar={learner.avatar} size="sm" selected={learner.id === shown?.id} />
            </button>
          ))}
        </div>
      }
    >
      <section className="mt-6 rounded-3xl border-[3px] border-ink p-5">
        <ol className="flex flex-wrap justify-center gap-x-8 gap-y-3">
          {DAYS.map((day, i) => (
            <li key={day} className="flex flex-col items-center gap-1 text-lg font-bold">
              {day}
              {practised[i] ? (
                <Sticker className="h-14 w-14" />
              ) : (
                <span className="h-14 w-14 rounded-full border-[3px] border-line" />
              )}
              <span className="sr-only">{practised[i] ? "practised" : "no practice"}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-center text-xl">
          {shown?.avatar}{" "}
          {daysPractised === 0
            ? "has not practised yet this week."
            : `practised on ${daysPractised} ${daysPractised === 1 ? "day" : "days"} this week.`}
        </p>
      </section>

      {grids.map(({ lesson, days, last }) => (
        <section key={lesson.id} className="mt-4 rounded-3xl border-[3px] border-ink p-5">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-x-4 border-spacing-y-2 text-center">
              <thead>
                <tr className="text-lg">
                  <th className="text-left font-bold">{lesson.name} lesson</th>
                  {days.map((day) => (
                    <th key={day} className="font-bold">
                      {DAYS[day]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[true, false].map((guided) => (
                  <tr key={String(guided)}>
                    <th className="text-left text-xl font-bold">{guided ? "With a guide" : "Without a guide"}</th>
                    {days.map((day) => {
                      const attempt = last(day, guided);
                      return (
                        <td key={day}>
                          <div className="flex justify-center">
                            {attempt ? (
                              <StrokePreview strokes={attempt.strokes} figure={lesson.figure} size="sm" />
                            ) : (
                              <span
                                aria-label="Not yet"
                                className="h-24 w-24 rounded-2xl border-[3px] border-dashed border-line"
                              />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-muted">
            Key:
            <span className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-md border-2 border-ink" />
              {shown?.avatar}&apos;s last drawing from that day
            </span>
            <span className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-md border-2 border-dashed border-line" />
              Not yet
            </span>
          </p>
        </section>
      ))}

      <p className="mt-4 flex items-center gap-3 rounded-2xl bg-panel px-5 py-4 text-xl">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink font-serif font-bold">
          i
        </span>
        This shows practice, not an assessment.
      </p>

      <details className="mt-4">
        <summary className="cursor-pointer text-xl font-bold text-brand">Every lesson and attempt</summary>
        {lessons.length === 0 && <p className="mt-3 text-muted">No lessons yet.</p>}
        {lessons.map(({ record, attempts }) => {
          const lesson = catalogue.lesson(record.lesson);
          return (
            <section key={record.id} className="mt-4 rounded-2xl bg-panel p-4">
              <h2 className="font-sans text-lg font-bold">
                {lesson.name} lesson
                <span className="ml-2 text-sm font-normal text-muted">
                  {new Date(record.startedAt).toLocaleString()}
                </span>
              </h2>
              <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                <Item label="How it ended" value={ENDING[record.ending]} />
                <Item label="Started at" value={STAGE[record.start]} />
                <Item label="Furthest step" value={STAGE[record.furthest]} />
                <Item
                  label="Passes (outline / endpoints / own)"
                  value={`${record.passes.T} / ${record.passes.E} / ${record.passes.I}`}
                />
                <Item label="Extensions" value={record.extensions} />
                <Item
                  label="Go-back suggestions"
                  value={
                    record.suggestions.length === 0
                      ? "None"
                      : record.suggestions.map((s) => `${STAGE[s.from]}: ${s.response}`).join("; ")
                  }
                />
              </dl>
              <ol className="mt-3 space-y-2">
                {attempts.map((attempt, i) => (
                  <li key={attempt.id} className="flex gap-4 rounded-xl bg-white p-3">
                    <StrokePreview strokes={attempt.strokes} figure={lesson.figure} size="sm" />
                    <div className="text-sm">
                      <p className="font-bold">
                        Attempt {i + 1}: {STAGE[attempt.stage]}
                      </p>
                      <p className="mt-1">
                        <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${PILL[attempt.outcome]}`}>
                          {OUTCOME[attempt.outcome]}
                        </span>
                        {attempt.result !== null &&
                          ` Result ${Math.round(attempt.result)} (pass mark ${attempt.settings.stagePass})`}
                      </p>
                      <p className="text-muted">
                        {attempt.stage === "I" ? "Drawn without a guide" : "Drawn with a guide"},{" "}
                        {attempt.strokes.length} {attempt.strokes.length === 1 ? "stroke" : "strokes"},{" "}
                        {new Date(attempt.endedAt).toLocaleTimeString()}
                      </p>
                      {attempt.difficulties.length > 0 && (
                        <ul className="mt-1 list-disc pl-5 text-muted">
                          {attempt.difficulties.map((o, j) => (
                            <li key={j}>
                              {DIFFICULTY[o.difficulty.kind]}
                              {o.corrected && " (corrected later in the attempt)"}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
                {attempts.length === 0 && <li className="text-sm text-muted">No attempts were saved.</li>}
              </ol>
            </section>
          );
        })}
      </details>
    </Screen>
  );
}

/** How a difficulty reads to an adult. The child's wording is in lib/feedback.ts. */
const DIFFICULTY = {
  missedPart: "A part of the shape was not drawn.",
  missedEndpoint: "The line did not reach an endpoint.",
  offFigure: difficultyFeedback("offFigure").message,
  tooSmall: "The drawing was very small.",
} as const;

function Item({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs font-bold tracking-wide text-muted uppercase">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}
