"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAdultCheck } from "@/components/AdultCheck";
import { LessonIcon } from "@/components/LessonIcon";
import { PageTitle } from "@/components/Squiggle";
import { useActiveLearner } from "@/components/useActiveLearner";
import { LESSONS } from "@/lib/catalogue";
import type { DrawingStage } from "@/lib/types";

// The adult chooses the lesson and its starting stage (FR-LRN-016).

const STAGES: { stage: DrawingStage; label: string }[] = [
  { stage: "T", label: "Trace the outline" },
  { stage: "E", label: "Corners only" },
  { stage: "I", label: "No guide" },
];

export default function LessonsPage() {
  const router = useRouter();
  const { learner, ready } = useActiveLearner();
  const { ask, dialog } = useAdultCheck();
  const [start, setStart] = useState<DrawingStage>("T");

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

  const begin = async (lessonId: string) => {
    if (await ask()) router.push(`/lesson/${lessonId}?start=${start}`);
  };

  return (
    <div>
      <PageTitle
        title="Lessons"
        subtitle="Every lesson starts with a demonstration, then gives less help at each stage. A pass moves the child on."
      />

      <fieldset className="mt-6">
        <legend className="font-bold text-brand">Start at</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {STAGES.map(({ stage, label }) => (
            <label
              key={stage}
              className={`cursor-pointer rounded-full px-4 py-2 text-sm font-bold ${
                start === stage ? "bg-brand text-white" : "bg-panel text-ink"
              }`}
            >
              <input
                type="radio"
                name="start"
                className="sr-only"
                checked={start === stage}
                onChange={() => setStart(stage)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {LESSONS.map((lesson) => (
          <button
            key={lesson.id}
            onClick={() => begin(lesson.id)}
            className="flex flex-col items-center rounded-2xl border-2 border-transparent bg-lavender p-6 hover:border-brand"
          >
            <LessonIcon figure={lesson.figure} className="h-28 w-28" />
            <span className="mt-3 text-lg font-bold">{lesson.name}</span>
          </button>
        ))}
      </div>
      {dialog}
    </div>
  );
}
