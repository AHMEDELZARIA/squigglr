"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdultCheck } from "@/components/AdultCheck";
import { Avatar } from "@/components/Avatar";
import { LockIcon } from "@/components/icons";
import { Screen, buttonClass } from "@/components/Screen";
import { activeChanged, useActiveLearner } from "@/components/useActiveLearner";
import * as profiles from "@/lib/profiles";
import type { Learner } from "@/lib/types";

// S1 "Who's practising?" The grown-up taps the child who is going to
// practise. Guest mode: there is no sign-in, and everything is kept in this
// browser.

export default function WhoIsPractising() {
  const router = useRouter();
  const { learner: active } = useActiveLearner();
  const { ask, dialog } = useAdultCheck();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => setLearners(profiles.learners()), []);

  const choose = async (learner: Learner) => {
    // Switching away from the child in use needs the adult check (SAF-RAY-001).
    if (active && learner.id !== active.id && !(await ask())) return;
    profiles.setActive(learner.id);
    activeChanged();
    router.push("/lessons");
  };

  const add = (avatar: string) => {
    const learner = profiles.create(avatar);
    // The first child becomes the one in use; later ones are chosen by the adult.
    if (!active) profiles.setActive(learner.id);
    setLearners(profiles.learners());
    setAdding(false);
    activeChanged();
  };

  const openGrownUps = async () => {
    if (await ask()) router.push("/grown-ups");
  };

  return (
    <Screen title="Who's practising?" subtitle="Grown-ups: tap the child who is going to practise.">
      <div className="mt-10 flex flex-wrap justify-center gap-x-10 gap-y-8">
        {learners.map((learner, i) => (
          <button
            key={learner.id}
            onClick={() => choose(learner)}
            aria-label={`Child ${i + 1}`}
            aria-pressed={learner.id === active?.id}
            className="flex flex-col items-center gap-2 rounded-3xl p-2 hover:bg-lavender"
          >
            <Avatar avatar={learner.avatar} size="lg" selected={learner.id === active?.id} />
            <span className={`text-lg font-bold ${learner.id === active?.id ? "text-brand" : "text-muted"}`}>
              {learner.id === active?.id ? "Practising now" : `Child ${i + 1}`}
            </span>
          </button>
        ))}
        <button
          onClick={() => setAdding((a) => !a)}
          className="flex flex-col items-center gap-2 rounded-3xl p-2 hover:bg-lavender"
        >
          <span className="flex h-36 w-36 items-center justify-center rounded-full border-2 border-dashed border-edge text-6xl text-muted">
            +
          </span>
          <span className="text-lg font-bold text-muted">Add a child</span>
        </button>
      </div>

      {adding && (
        <div className="mx-auto mt-8 max-w-xl rounded-3xl bg-mint p-5 text-center">
          <h2 className="font-sans text-xl font-bold text-green">Choose a picture</h2>
          <div className="mt-3 flex max-h-[22rem] flex-wrap justify-center gap-3 overflow-y-auto p-1">
            {profiles.AVATARS.map((avatar) => (
              <button
                key={avatar}
                onClick={() => add(avatar)}
                aria-label={`Picture ${avatar}`}
                className="h-16 w-16 rounded-full border-2 border-edge bg-white text-4xl hover:bg-mint-deep"
              >
                {avatar}
              </button>
            ))}
          </div>
          <p className="mt-3 text-muted">A child has a picture and no name. They start with the recommended settings.</p>
        </div>
      )}

      <div className="mt-12 flex flex-wrap items-center justify-between gap-3">
        <p className="rounded-full bg-butter px-4 py-1 text-sm font-bold text-butter-ink">
          Guest mode: saved in this browser only
        </p>
        <button onClick={openGrownUps} className={buttonClass}>
          <LockIcon className="h-5 w-5" />
          Grown-ups
        </button>
      </div>
      {dialog}
    </Screen>
  );
}
