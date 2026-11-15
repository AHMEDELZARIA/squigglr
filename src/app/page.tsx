"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAdultCheck } from "@/components/AdultCheck";
import { PageTitle } from "@/components/Squiggle";
import { activeChanged, useActiveLearner } from "@/components/useActiveLearner";
import * as profiles from "@/lib/profiles";
import type { Learner } from "@/lib/types";

// "Who is drawing?" Shows the child in use, lets an adult switch child and
// add a child. Guest mode: there is no sign-in, and everything is kept in
// this browser.

export default function ChildrenPage() {
  const { learner: active } = useActiveLearner();
  const { ask, dialog } = useAdultCheck();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => setLearners(profiles.learners()), []);

  const choose = async (learner: Learner) => {
    if (learner.id === active?.id) return;
    // Switching away from a child needs the adult check (SAF-RAY-001).
    if (active && !(await ask())) return;
    profiles.setActive(learner.id);
    activeChanged();
  };

  const add = (avatar: string) => {
    const learner = profiles.create(avatar);
    // The first child becomes the active one; later ones are chosen by the adult.
    if (!active) profiles.setActive(learner.id);
    setLearners(profiles.learners());
    setAdding(false);
    activeChanged();
  };

  return (
    <div>
      <PageTitle title="Who is drawing?" subtitle="Choose the child who is practising. A child has a picture and no name." />
      <p className="mt-4 inline-block rounded-full bg-butter px-4 py-1 text-sm font-bold text-butter-ink">
        Guest mode: children, settings and attempts are saved in this browser only
      </p>

      <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-5">
        {learners.map((learner, i) => (
          <button
            key={learner.id}
            onClick={() => choose(learner)}
            aria-label={`Child ${i + 1}`}
            aria-pressed={learner.id === active?.id}
            className={`flex aspect-square flex-col items-center justify-center rounded-2xl border-2 text-6xl ${
              learner.id === active?.id ? "border-brand bg-lavender" : "border-transparent bg-panel"
            }`}
          >
            {learner.avatar}
            <span className={`mt-2 text-sm font-bold ${learner.id === active?.id ? "text-brand" : "text-muted"}`}>
              {learner.id === active?.id ? "Drawing now" : `Child ${i + 1}`}
            </span>
          </button>
        ))}
        <button
          onClick={() => setAdding(true)}
          className="flex aspect-square flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line text-4xl text-muted"
        >
          +<span className="mt-2 text-sm font-bold">Add a child</span>
        </button>
      </div>

      {adding && (
        <div className="mt-6 rounded-2xl bg-mint p-5">
          <h2 className="font-sans font-bold text-green">Choose a picture</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {profiles.AVATARS.map((avatar) => (
              <button
                key={avatar}
                onClick={() => add(avatar)}
                aria-label={`Picture ${avatar}`}
                className="h-16 w-16 rounded-2xl border-2 border-transparent bg-white text-4xl hover:border-green"
              >
                {avatar}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">
            The child starts with the default settings. Change them under Settings.
          </p>
        </div>
      )}

      {active && (
        <div className="mt-8 flex gap-3">
          <Link href="/lessons" className="rounded-full bg-brand px-5 py-3 font-bold text-white">
            Choose a lesson
          </Link>
          <Link href="/settings" className="rounded-full border border-line bg-white px-5 py-3 font-bold">
            Settings
          </Link>
        </div>
      )}
      {dialog}
    </div>
  );
}
