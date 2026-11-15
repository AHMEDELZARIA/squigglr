"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAdultCheck } from "@/components/AdultCheck";
import { PageTitle } from "@/components/Squiggle";
import { useActiveLearner } from "@/components/useActiveLearner";
import * as settings from "@/lib/settings";
import type { SettingName, Settings } from "@/lib/types";

// The nine adult-set values of the active child (BR-008). A value outside
// its range, or one that breaks a rule between values, cannot be saved.

const RULES: { names: [SettingName, SettingName]; text: string }[] = [
  {
    names: ["attemptLimit", "difficultyStreak"],
    text: "The failed attempts before the lesson ends must be more than the failed attempts before a suggestion.",
  },
  {
    names: ["attemptLimitMax", "attemptLimit"],
    text: "The most attempts at one stage cannot be fewer than the failed attempts before the lesson ends.",
  },
  {
    names: ["attemptIdle", "lessonIdlePrompt"],
    text: "The pause that ends an attempt must be shorter than the pause before a check-in.",
  },
  {
    names: ["lessonIdlePrompt", "lessonIdleEnd"],
    text: "The pause before a check-in must be shorter than the pause that ends the lesson.",
  },
];

export default function SettingsPage() {
  const { learner, ready } = useActiveLearner();
  const { ask, dialog } = useAdultCheck();
  const [values, setValues] = useState<Settings>(settings.defaults());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (learner) setValues(settings.load(learner.id));
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

  const bad = settings.check(values);
  const outOfRange = (name: SettingName) => {
    const r = settings.RANGES[name];
    return !Number.isInteger(values[name]) || values[name] < r.min || values[name] > r.max;
  };
  const brokenRules = RULES.filter((rule) => rule.names.every((n) => bad.includes(n) && !outOfRange(n)));

  const set = (name: SettingName, value: number) => {
    setValues((v) => ({ ...v, [name]: value }));
    setSaved(false);
  };

  const save = async () => {
    if (!learner || bad.length > 0) return;
    // Changing saved values needs the adult check (SAF-RAY-008).
    if (!(await ask())) return;
    settings.save(learner.id, values);
    setSaved(true);
  };

  return (
    <div>
      <PageTitle
        title={
          <>
            Settings for <span className="font-sans">{learner?.avatar}</span>
          </>
        }
        subtitle="These values belong to this child only. A change applies to the next lesson that is started."
      />

      <div className="mt-6 space-y-3">
        {settings.SETTING_NAMES.map((name) => {
          const r = settings.RANGES[name];
          const invalid = bad.includes(name);
          return (
            <div
              key={name}
              className={`rounded-2xl border-2 p-4 ${invalid ? "border-coral bg-peach" : "border-transparent bg-panel"}`}
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label htmlFor={name} className="min-w-0 flex-1 basis-56">
                  <span className="font-bold">{r.label}</span>
                  <span className="block text-sm text-muted">{r.help}</span>
                </label>
                <input
                  type="range"
                  aria-label={`${r.label} slider`}
                  min={r.min}
                  max={r.max}
                  step={1}
                  value={values[name]}
                  onChange={(e) => set(name, Number(e.target.value))}
                  className="w-40 accent-brand"
                />
                <input
                  id={name}
                  type="number"
                  min={r.min}
                  max={r.max}
                  step={1}
                  value={Number.isNaN(values[name]) ? "" : values[name]}
                  onChange={(e) => set(name, e.target.value === "" ? NaN : Number(e.target.value))}
                  className="w-20 rounded-lg border border-line bg-white px-2 py-1 text-right"
                />
                <span className="w-16 text-sm text-muted">{r.unit}</span>
              </div>
              <p className={`mt-1 text-xs ${outOfRange(name) ? "font-bold text-coral" : "text-muted"}`}>
                {outOfRange(name) ? "Choose a whole number from " : "From "}
                {r.min} to {r.max}. Default {r.default}.
              </p>
            </div>
          );
        })}
      </div>

      {brokenRules.map((rule) => (
        <p key={rule.text} role="alert" className="mt-3 rounded-2xl bg-peach px-4 py-3 text-sm font-bold text-coral">
          {rule.text}
        </p>
      ))}

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={save}
          disabled={bad.length > 0}
          className="rounded-full bg-brand px-5 py-3 font-bold text-white disabled:bg-line"
        >
          Save
        </button>
        <button
          onClick={() => {
            setValues(settings.defaults());
            setSaved(false);
          }}
          className="rounded-full border border-line bg-white px-5 py-3 font-bold"
        >
          Back to defaults
        </button>
        {saved && <span className="text-sm font-bold text-green">Saved.</span>}
      </div>
      {dialog}
    </div>
  );
}
