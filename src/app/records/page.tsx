"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LessonIcon } from "@/components/LessonIcon";
import { PageTitle } from "@/components/Squiggle";
import { StrokePreview } from "@/components/StrokePreview";
import { useActiveLearner } from "@/components/useActiveLearner";
import * as catalogue from "@/lib/catalogue";
import { difficultyFeedback } from "@/lib/feedback";
import * as records from "@/lib/records";
import type { AttemptRecord, Ending, LessonRecord, Stage } from "@/lib/types";

// What was saved for the active child: every start of a lesson, and under it
// every attempt with its actual strokes.

const STAGE: Record<Stage, string> = {
  D: "Demonstration",
  T: "Trace the outline",
  E: "Corners only",
  I: "No guide",
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

export default function RecordsPage() {
  const { learner, ready } = useActiveLearner();
  const [lessons, setLessons] = useState<{ record: LessonRecord; attempts: AttemptRecord[] }[]>([]);

  useEffect(() => {
    if (!learner) return;
    setLessons(
      records
        .lessonRecords(learner.id)
        .reverse()
        .map((record) => ({ record, attempts: records.attempts(learner.id, record.id) })),
    );
  }, [learner]);

  if (ready && !learner) {
    return (
      <p>
        Choose a child first, on the{" "}
        <Link href="/" className="font-bold text-brand">
          Children
        </Link>{" "}
        page.
      </p>
    );
  }

  return (
    <div>
      <PageTitle
        title={
          <>
            Records for <span className="font-sans">{learner?.avatar}</span>
          </>
        }
        subtitle="Practice records only. A result describes one drawing against the lesson's figure, not the child."
      />

      {lessons.length === 0 && <p className="mt-6 text-muted">No lessons yet.</p>}

      {lessons.map(({ record, attempts }) => {
        const lesson = catalogue.lesson(record.lesson);
        return (
          <section key={record.id} className="mt-6 rounded-2xl border border-line bg-white p-4">
            <h2 className="flex items-center gap-2 font-sans text-lg font-bold">
              <LessonIcon figure={lesson.figure} className="h-8 w-8" />
              {lesson.name}
              <span className="ml-2 text-sm font-normal text-muted">
                {new Date(record.startedAt).toLocaleString()}
              </span>
            </h2>
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs font-bold tracking-wide text-muted uppercase">How it ended</dt>
                <dd className="font-bold">{ENDING[record.ending]}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold tracking-wide text-muted uppercase">Started at</dt>
                <dd className="font-bold">{STAGE[record.start]}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold tracking-wide text-muted uppercase">Furthest stage</dt>
                <dd className="font-bold">{STAGE[record.furthest]}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold tracking-wide text-muted uppercase">Passes (trace / corners / no guide)</dt>
                <dd className="font-bold">
                  {record.passes.T} / {record.passes.E} / {record.passes.I}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold tracking-wide text-muted uppercase">Extensions</dt>
                <dd className="font-bold">{record.extensions}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold tracking-wide text-muted uppercase">Go-back suggestions</dt>
                <dd className="font-bold">
                  {record.suggestions.length === 0
                    ? "None"
                    : record.suggestions.map((s) => `${STAGE[s.from]}: ${s.response}`).join("; ")}
                </dd>
              </div>
            </dl>

            <ol className="mt-4 space-y-3">
              {attempts.map((attempt, i) => (
                <li key={attempt.id} className="flex gap-4 rounded-xl bg-panel p-3">
                  <StrokePreview strokes={attempt.strokes} figure={lesson.figure} />
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
                            {difficultyFeedback(o.difficulty.kind).message}
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
    </div>
  );
}
