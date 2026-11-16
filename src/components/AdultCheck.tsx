"use client";

import { useCallback, useRef, useState } from "react";
import { LockIcon } from "./icons";

// M14 Adult Access, POC version. There are no accounts yet, so the only part
// kept is the adult check: a short sum that a young child cannot pass alone
// (SAF-RAY-001). `ask()` resolves to true only if the sum is answered correctly.

interface Question {
  a: number;
  b: number;
}

export function useAdultCheck() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [wrong, setWrong] = useState(false);
  const resolver = useRef<((passed: boolean) => void) | null>(null);

  const ask = useCallback(() => {
    const n = () => 11 + Math.floor(Math.random() * 19);
    setQuestion({ a: n(), b: n() });
    setAnswer("");
    setWrong(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (passed: boolean) => {
    setQuestion(null);
    resolver.current?.(passed);
    resolver.current = null;
  };

  const dialog = question && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <form
        className="w-full max-w-sm rounded-3xl border border-edge shadow-card bg-white p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (Number(answer) === question.a + question.b) close(true);
          else setWrong(true);
        }}
      >
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <LockIcon className="h-6 w-6" />
          Grown-ups
        </h2>
        <p className="mt-1 text-muted">Answer this to continue.</p>
        <label className="mt-4 block text-3xl font-bold">
          {question.a} + {question.b} =
          <input
            autoFocus
            inputMode="numeric"
            aria-label="Answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="ml-3 w-24 rounded-xl border-2 border-edge px-3 py-1"
          />
        </label>
        {wrong && <p className="mt-2 font-bold text-coral">That is not it. Try again.</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => close(false)} className="rounded-2xl px-4 py-2 text-lg font-bold text-muted">
            Cancel
          </button>
          <button type="submit" className="rounded-2xl border-2 border-brand bg-brand px-5 py-2 text-lg font-bold text-white">
            Continue
          </button>
        </div>
      </form>
    </div>
  );

  return { ask, dialog };
}
