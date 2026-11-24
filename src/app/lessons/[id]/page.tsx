"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PlayIcon, StageGuide } from "@/components/icons";
import { LessonIcon } from "@/components/LessonIcon";
import { NEATNESS, NeatnessInfo } from "@/components/NeatnessInfo";
import { Screen } from "@/components/Screen";
import * as audio from "@/lib/audio";
import { LESSONS } from "@/lib/catalogue";
import * as settings from "@/lib/settings";
import * as stages from "@/lib/stages";
import type { DrawingStage, SettingName, Settings } from "@/lib/types";

/** The part of the web address that names the lesson, e.g. "square" in /lesson/square. */
// A `type`, not an `interface`: Next.js needs this form for useParams.
type RouteParams = {
  id: string;
};

// S3 "Lesson ready". The chosen lesson and the settings, each with one line
// saying what it changes. The grown-up can start straight away or change any
// of them first. The values are the nine adult-set values of BR-008: three up
// front, as in the prototype, and the rest under "More settings". The POC
// saves nothing: the values are kept only while the app is open.

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

/** A rule between two settings, and how it is explained to the adult when it is broken. */
interface SettingRule {
  /** The two settings the rule is about. */
  names: SettingName[];
  text: string;
}

const RULES: SettingRule[] = [
  {
    names: ["attemptLimit", "failStreak"],
    text: "The failed attempts before the lesson ends must be more than the tries before a grown-up is called.",
  },
  {
    names: ["attemptLimitMax", "attemptLimit"],
    text: "The most attempts at one step cannot be fewer than the failed attempts before the lesson ends.",
  },
];

interface StepperProps {
  name: SettingName;
  values: Settings;
  set: (name: SettingName, value: number) => void;
  big?: boolean;
}

function Stepper({
  name,
  values,
  set,
  big = false,
}: StepperProps) {
  const r = settings.RANGES[name];
  const box = big ? "h-14 w-14 text-3xl" : "h-11 w-11 text-2xl";
  return (
    <span className="inline-flex items-center gap-3">
      <button
        type="button"
        aria-label={`Less: ${r.label}`}
        disabled={values[name] <= r.min}
        onClick={() => set(name, values[name] - 1)}
        className={`${box} rounded-xl border-2 border-edge bg-white font-bold hover:bg-lavender disabled:border-line disabled:text-line`}
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
        className={`${box} rounded-xl border-2 border-edge bg-white font-bold hover:bg-lavender disabled:border-line disabled:text-line`}
      >
        +
      </button>
    </span>
  );
}

export default function LessonReady() {
  const { id } = useParams<RouteParams>();
  const router = useRouter();
  const lesson = LESSONS.find((l) => l.id === id);
  const [start, setStart] = useState<DrawingStage>("T");
  const [values, setValues] = useState<Settings>(settings.defaults());
  const [info, setInfo] = useState(false);
  const [talks, setTalks] = useState(true);

  // Show the values chosen earlier in this session, if any.
  useEffect(() => {
    if (lesson === undefined) {
      router.replace("/");
      return;
    }
    setValues(settings.chosen());
    setTalks(audio.isEnabled());
  }, [lesson, router]);

  if (lesson === undefined) return null;

  /** Changes one value. React needs a new object to redraw, so the values are copied first. */
  const set = (name: SettingName, value: number) => {
    const next = settings.copySettings(values);
    next[name] = value;
    setValues(next);
  };
  const bad = settings.check(values);
  const brokenRules = RULES.filter((rule) => rule.names.every((n) => bad.includes(n)));

  const begin = () => {
    if (bad.length > 0) return;
    settings.choose(values);
    audio.setEnabled(talks);
    audio.unlock(); // sound is only allowed after a tap, and this is the last one before the lesson
    router.push(`/lesson/${lesson.id}?start=${start}`);
  };

  return (
    <Screen title="The lesson is ready" back="/">
      <div className="mt-6 grid gap-8 md:grid-cols-[16rem_1fr]">
        <div>
          <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-3xl border-2 border-edge bg-white">
            <LessonIcon figure={lesson.figure} className="h-32 w-32" />
          </div>
          <p className="mt-2 text-center text-2xl font-bold">{lesson.name} lesson</p>

          <div className="mt-6 rounded-3xl bg-lavender p-5">
            <h2 className="text-2xl font-bold">Hand the tablet to the child</h2>
            <p className="mt-2 text-lg">
              Tap &ldquo;Start lesson&rdquo;, then give the child the tablet and stylus. The helper shows what to do.
            </p>
            <button
              onClick={begin}
              disabled={bad.length > 0}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-[3px] border-brand bg-brand py-3 text-2xl font-bold text-white hover:opacity-90 disabled:border-line disabled:bg-line"
            >
              <PlayIcon className="h-6 w-6" />
              Start lesson
            </button>
          </div>
        </div>

        <div className="divide-y-2 divide-line">
          <section className="pb-5">
            <h2 className="font-sans text-2xl font-bold">The child starts at:</h2>
            <div className="mt-2 grid grid-cols-3 gap-3" role="radiogroup" aria-label="Starting step">
              {stages.DRAWING_STAGES.map((stage) => {
                const step = stages.info(stage);
                const selected = start === stage;
                return (
                  <button
                    key={stage}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setStart(stage)}
                    className={`relative rounded-2xl bg-white px-2 pt-2 pb-1 text-center ${
                      selected ? "border-4 border-brand bg-lavender" : "border-2 border-edge"
                    }`}
                  >
                    <span className="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-edge bg-white text-sm font-bold">
                      {step.number}
                    </span>
                    {selected && (
                      <span className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                        ✓
                      </span>
                    )}
                    <StageGuide figure={lesson.figure} stage={stage} className="mx-auto h-16 w-16" />
                    <span className="text-lg font-bold">{step.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-muted">
              Where the child begins. After that the lesson moves on by itself: 1, 2, then 3.
            </p>
          </section>

          <section className="py-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-sans text-2xl font-bold">Helper talks</h2>
              <button
                type="button"
                role="switch"
                aria-checked={talks}
                aria-label="Helper talks"
                onClick={() => setTalks((t) => !t)}
                className={`relative h-10 w-[4.5rem] rounded-full border-2 ${
                  talks ? "border-brand bg-brand" : "border-edge bg-panel"
                }`}
              >
                <span
                  className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow-card transition-all ${
                    talks ? "left-9" : "left-1"
                  }`}
                />
              </button>
              <span className="text-2xl font-bold">{talks ? "On" : "Off"}</span>
            </div>
            <p className="mt-2 text-muted">
              The helper says each step out loud, with a sound when a step is done. The child may not read yet.
            </p>
          </section>

          <section className="py-5">
            <div className="flex flex-wrap items-center gap-3 text-2xl font-bold">
              Get a grown-up after
              <Stepper name="failStreak" values={values} set={set} big />
              tries in a row
            </div>
            <p className="mt-2 text-muted">
              If the child gets stuck on step 2 or 3 this many times, the tablet calls you over.
            </p>
          </section>

          <section className="py-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-sans text-2xl font-bold">Neatness</h2>
              <button
                type="button"
                onClick={() => setInfo(true)}
                aria-label="About neatness"
                className="h-11 w-11 rounded-full border-2 border-edge bg-white text-xl font-bold hover:bg-lavender"
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
                        selected ? "border-brand bg-brand text-white" : "border-edge bg-white hover:bg-lavender"
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
                className="rounded-2xl border-2 border-edge bg-white px-4 py-2 font-bold hover:bg-lavender"
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

      {info && <NeatnessInfo figure={lesson.figure} onClose={() => setInfo(false)} />}
    </Screen>
  );
}
