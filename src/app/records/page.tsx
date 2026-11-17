"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Screen } from "@/components/Screen";
import { StrokePreview } from "@/components/StrokePreview";
import { useActiveLearner } from "@/components/useActiveLearner";
import * as catalogue from "@/lib/catalogue";
import { difficultyFeedback } from "@/lib/feedback";
import * as profiles from "@/lib/profiles";
import * as records from "@/lib/records";
import type { AttemptRecord, Ending, Learner, LessonRecord, Stage } from "@/lib/types";

// "Practice history" (in the place of the prototype's S5). For one child:
// every start of a lesson, and under it every attempt with its actual
// strokes, step, outcome, result and the difficulties seen (FR-REC-001 to
// FR-REC-010). The SRS's progress summary is a later phase and is not here.

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

interface LessonStory {
  record: LessonRecord;
  attempts: AttemptRecord[];
}

export default function PracticeRecords() {
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

  return (
    <Screen
      title="Practice history"
      back="/grown-ups"
      right={
        <div className="flex gap-2">
          {learners.map((learner, i) => (
            <button
              key={learner.id}
              onClick={() => setShown(learner)}
              aria-label={`Show child ${i + 1}`}
              aria-pressed={learner.id === shown?.id}
              className={`rounded-2xl p-1 ${learner.id === shown?.id ? "border-2 border-edge" : "border-2 border-transparent"}`}
            >
              <Avatar avatar={learner.avatar} size="sm" selected={learner.id === shown?.id} />
            </button>
          ))}
        </div>
      }
    >
      {/* A plain note. It has no "i" in a ring, which on the Lesson ready screen is a button. */}
      <p className="mt-6 rounded-2xl bg-panel px-5 py-4 text-xl">This shows practice, not an assessment.</p>

      <div>
        {lessons.length === 0 && (
          <p className="mt-6 text-center text-xl text-muted">{shown?.avatar} has no lessons yet.</p>
        )}
        {lessons.map(({ record, attempts }) => {
          const lesson = catalogue.lesson(record.lesson);
          return (
            <section key={record.id} className="mt-4 rounded-3xl border-2 border-edge p-5">
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
                  <li key={attempt.id} className="flex gap-4 rounded-2xl bg-panel p-3">
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
      </div>
    </Screen>
  );
}

/** How a difficulty reads to an adult. The child's wording is in lib/feedback.ts. */
const DIFFICULTY = {
  missedPart: "A part of the shape was not drawn.",
  missedEndpoint: "The line did not reach an endpoint.",
  offFigure: difficultyFeedback("offFigure").message,
  tooSmall: "The drawing was very small.",
  stretched: "The drawing was the right shape, but too wide or too tall.",
} as const;

function Item({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs font-bold tracking-wide text-muted uppercase">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}
