"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LessonIcon } from "@/components/LessonIcon";
import { Screen } from "@/components/Screen";
import { useActiveLearner } from "@/components/useActiveLearner";
import { LESSONS } from "@/lib/catalogue";

// S2 "Pick a lesson". Each card is a picture of the shape. Only the grown-up
// uses this screen, so the child never has to choose anything.

export default function PickALesson() {
  const router = useRouter();
  const { learner, ready } = useActiveLearner();

  useEffect(() => {
    if (ready && !learner) router.replace("/");
  }, [ready, learner, router]);

  return (
    <Screen
      title="Pick a lesson"
      subtitle={<>Tap a picture to choose {learner?.avatar}&apos;s lesson.</>}
      back="/"
      avatar={learner?.avatar}
    >
      <div className="mt-12 flex flex-wrap justify-center gap-8">
        {LESSONS.map((lesson) => (
          <Link
            key={lesson.id}
            href={`/lessons/${lesson.id}`}
            aria-label={`${lesson.name} lesson`}
            className="flex h-60 w-60 flex-col items-center justify-center rounded-3xl border-[3px] border-ink bg-white hover:bg-lavender"
          >
            <LessonIcon figure={lesson.figure} className="h-40 w-40" />
            <span className="mt-2 text-lg font-bold text-muted">{lesson.name}</span>
          </Link>
        ))}
      </div>
    </Screen>
  );
}
