"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdultCheck } from "@/components/AdultCheck";
import { PlayIcon, StageGuide } from "@/components/icons";
import { LessonIcon } from "@/components/LessonIcon";
import { NEATNESS, NeatnessInfo } from "@/components/NeatnessInfo";
import { Screen } from "@/components/Screen";
import { useActiveLearner } from "@/components/useActiveLearner";
import { LESSONS } from "@/lib/catalogue";
import * as settings from "@/lib/settings";
import type { DrawingStage, SettingName, Settings } from "@/lib/types";

// S3 "Lesson ready". The chosen lesson and this child's settings, each with
// one line saying what it changes. The grown-up can start straight away or
// change any of them first. The values are the nine adult-set values of
// BR-008: three up front, as in the prototype, and the rest under "More
// settings".

const STAGES: { stage: DrawingStage; label: string }[] = [
  { stage: "T", label: "Full outline" },
  { stage: "E", label: "Endpoints only" },
  { stage: "I", label: "On my own" },
];

const MORE: SettingName[] = [
  "stagePass",
  "attemptLimit",
  "attemptLimitMax",
  "improveWindow",
  "attemptExtension",
  "attemptIdle",
  "lessonIdlePrompt",
  "lessonIdleEnd",
];

const RULES: { names: [SettingName, SettingName]; text: string }[] = [
  {
    names: ["attemptLimit", "difficultyStreak"],
    text: "The failed attempts before the lesson ends must be more than the tries before a grown-up is called.",
  },
  {
    names: ["attemptLimitMax", "attemptLimit"],
    text: "The most attempts at one step cannot be fewer than the failed attempts before the lesson ends.",
  },
];

function Stepper({
  name,
  values,
  set,
  big = false,
}: {
  name: SettingName;
  values: Settings;
  set: (name: SettingName, value: number) => void;
  big?: boolean;
}) {
  const r = settings.RANGES[name];
  const box = big ? "h-14 w-14 text-3xl" : "h-11 w-11 text-2xl";
  return (
    <span className="inline-flex items-center gap-3">
      <button
        type="button"
        aria-label={`Less: ${r.label}`}
        disabled={values[name] <= r.min}
        onClick={() => set(name, values[name] - 1)}
        className={`${box} rounded-xl border-2 border-ink bg-white font-bold hover:bg-lavender disabled:border-line disabled:text-line`}
      >
        −
      </button>
      <output id={name} className={`${big ? "text-4xl" : "text-2xl"} min-w-8 text-center font-bold`}>
        {values[name]}
      </output>
      <button
        type="button"
        aria-label={`More: ${r.label}`}
        disabled={values[name] >= r.max}
        onClick={() => set(name, values[name] + 1)}
        className={`${box} rounded-xl border-2 border-ink bg-white font-bold hover:bg-lavender disabled:border-line disabled:text-line`}
      >
        +
      </button>
    </span>
  );
}

export default function LessonReady() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { learner, ready } = useActiveLearner();
  const { ask, dialog } = useAdultCheck();
  const lesson = LESSONS.find((l) => l.id === id);
  const [start, setStart] = useState<DrawingStage>("T");
  const [saved, setSaved] = useState<Settings>(settings.defaults());
  const [values, setValues] = useState<Settings>(settings.defaults());
  const [info, setInfo] = useState(false);

  useEffect(() => {
    if (ready && (!learner || !lesson)) router.replace("/");
    if (learner) {
      const loaded = settings.load(learner.id);
      setSaved(loaded);
      setValues(loaded);
    }
  }, [ready, learner, lesson, router]);

  if (!learner || !lesson) return null;

  const set = (name: SettingName, value: number) => setValues((v) => ({ ...v, [name]: value }));
  const bad = settings.check(values);
  const brokenRules = RULES.filter((rule) => rule.names.every((n) => bad.includes(n)));
  const changed = settings.SETTING_NAMES.some((n) => values[n] !== saved[n]);

  const begin = async () => {
    if (bad.length > 0) return;
    // Starting a lesson, and changing saved values, need the adult check (SAF-RAY-001, SAF-RAY-008).
    if (!(await ask())) return;
    if (changed) settings.save(learner.id, values);
    router.push(`/lesson/${lesson.id}?start=${start}`);
  };

  return (
    <Screen title={<>{learner.avatar}&apos;s lesson is ready</>} back="/lessons" avatar={learner.avatar}>
      <div className="mt-6 grid gap-8 md:grid-cols-[16rem_1fr]">
        <div>
          <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-3xl border-[3px] border-ink bg-white">
            <LessonIcon figure={lesson.figure} className="h-32 w-32" />
          </div>
          <p className="mt-2 text-center text-2xl font-bold">{lesson.name} lesson</p>

          <div className="mt-6 rounded-3xl bg-lavender p-5">
            <h2 className="text-2xl font-bold">Hand the tablet to {learner.avatar}</h2>
            <p className="mt-2 text-lg">
              Tap &ldquo;Start lesson&rdquo;, then give {learner.avatar} the tablet and stylus. The helper shows what
              to do.
            </p>
            <button
              onClick={begin}
              disabled={bad.length > 0}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-[3px] border-brand bg-brand py-3 text-2xl font-bold text-white hover:opacity-90 disabled:border-line disabled:bg-line"
            >
              <PlayIcon className="h-6 w-6" />
              Start lesson
            </button>
            {changed && bad.length === 0 && <p className="mt-2 text-sm text-muted">Your changes are saved when the lesson starts.</p>}
          </div>
        </div>

        <div className="divide-y-2 divide-line">
          <section className="pb-5">
            <h2 className="font-sans text-2xl font-bold">{learner.avatar} starts at:</h2>
            <div className="mt-2 grid grid-cols-3 gap-3" role="radiogroup" aria-label="Starting step">
              {STAGES.map(({ stage, label }, i) => {
                const selected = start === stage;
                return (
                  <button
                    key={stage}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setStart(stage)}
                    className={`relative rounded-2xl bg-white px-2 pt-2 pb-1 text-center ${
                      selected ? "border-4 border-brand bg-lavender" : "border-2 border-ink"
                    }`}
                  >
                    <span className="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-white text-sm font-bold">
                      {i + 1}
                    </span>
                    {selected && (
                      <span className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                        ✓
                      </span>
                    )}
                    <StageGuide figure={lesson.figure} stage={stage} className="mx-auto h-16 w-16" />
                    <span className="text-lg font-bold">{label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-muted">
              Where {learner.avatar} begins. After that the lesson moves on by itself: 1, 2, then 3.
            </p>
          </section>

          <section className="py-5">
            <div className="flex flex-wrap items-center gap-3 text-2xl font-bold">
              Get a grown-up after
              <Stepper name="difficultyStreak" values={values} set={set} big />
              tries in a row
            </div>
            <p className="mt-2 text-muted">
              If {learner.avatar} gets stuck on step 2 or 3 this many times, the tablet calls you over.
            </p>
          </section>

          <section className="py-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-sans text-2xl font-bold">Neatness</h2>
              <button
                type="button"
                onClick={() => setInfo(true)}
                aria-label="About neatness"
                className="h-11 w-11 rounded-full border-2 border-ink bg-white font-serif text-xl font-bold hover:bg-lavender"
              >
                i
              </button>
              <div className="flex gap-2" role="radiogroup" aria-label="Neatness">
                {NEATNESS.map(({ mark, name }) => {
                  const selected = values.stagePass === mark;
                  return (
                    <button
                      key={mark}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => set("stagePass", mark)}
                      className={`rounded-full border-2 px-5 py-2 text-xl font-bold ${
                        selected ? "border-brand bg-brand text-white" : "border-ink bg-white hover:bg-lavender"
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="mt-2 text-muted">
              How neat a drawing must be before the lesson moves on. Tap i to learn more.
              {!NEATNESS.some((n) => n.mark === values.stagePass) && ` Now set to a pass mark of ${values.stagePass}.`}
            </p>
          </section>

          <details className="pt-5">
            <summary className="cursor-pointer text-xl font-bold text-brand">More settings</summary>
            <div className="mt-3 space-y-3">
              {MORE.map((name) => {
                const r = settings.RANGES[name];
                return (
                  <div
                    key={name}
                    className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl p-3 ${
                      bad.includes(name) ? "bg-peach" : "bg-panel"
                    }`}
                  >
                    <div className="min-w-0 flex-1 basis-60">
                      <p className="text-lg font-bold">{r.label}</p>
                      <p className="text-muted">{r.help}</p>
                    </div>
                    <Stepper name={name} values={values} set={set} />
                    <span className="w-24 text-sm text-muted">
                      {r.unit}
                      <br />
                      {r.min} to {r.max}
                    </span>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => setValues(settings.defaults())}
                className="rounded-2xl border-2 border-ink bg-white px-4 py-2 font-bold hover:bg-lavender"
              >
                Back to the recommended settings
              </button>
            </div>
          </details>

          {brokenRules.map((rule) => (
            <p key={rule.text} role="alert" className="mt-3 rounded-2xl bg-peach px-4 py-3 font-bold text-coral">
              {rule.text}
            </p>
          ))}
        </div>
      </div>

      {info && <NeatnessInfo figure={lesson.figure} avatar={learner.avatar} onClose={() => setInfo(false)} />}
      {dialog}
    </Screen>
  );
}
