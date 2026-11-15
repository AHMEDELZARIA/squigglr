"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useAdultCheck } from "@/components/AdultCheck";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import * as catalogue from "@/lib/catalogue";
import { difficultyFeedback, feedback } from "@/lib/feedback";
import { LessonControl } from "@/lib/lessonControl";
import * as profiles from "@/lib/profiles";
import { records } from "@/lib/records";
import * as settings from "@/lib/settings";
import type { DrawingStage, Guide, Point, Report, Stage, Stroke } from "@/lib/types";

// M13 Child Screen. It shows the lesson and relays input: each finished
// stroke goes to Lesson Control, which is also ticked twice a second. All
// the rules live in lib/lessonControl.ts; nothing here decides a pass.

/** The four stages, each with how much guidance it gives (the filled dots). */
const STAGES: { stage: Stage; label: string; guidance: number }[] = [
  { stage: "D", label: "See it", guidance: 4 },
  { stage: "T", label: "Trace it", guidance: 3 },
  { stage: "E", label: "Fewer guides", guidance: 2 },
  { stage: "I", label: "On your own", guidance: 0 },
];
const NO_GUIDE: Guide = { outline: [], endpoints: [] };
/** How long a finished attempt stays on screen with its feedback. */
const SHOW_MS = 2500;

const middle = (path: Point[]) => path[Math.floor(path.length / 2)];
const midpoint = (path: Point[]) =>
  path.length === 2 ? { x: (path[0].x + path[1].x) / 2, y: (path[0].y + path[1].y) / 2 } : middle(path);

export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ask, dialog } = useAdultCheck();
  const control = useRef<LessonControl | null>(null);
  const lastInput = useRef<number | null>(null);
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const [avatar, setAvatar] = useState("");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [marks, setMarks] = useState<Point[]>([]);
  const [showing, setShowing] = useState(false); // a finished attempt is on screen
  const [panel, setPanel] = useState(true);

  // Start the lesson for the active child, with the child's settings as they are now.
  useEffect(() => {
    const learner = profiles.active();
    if (!learner || !catalogue.LESSONS.some((l) => l.id === id)) {
      router.replace("/");
      return;
    }
    const start = new URLSearchParams(window.location.search).get("start");
    const c = new LessonControl({ records });
    c.select(learner.id, id, start === "E" || start === "I" ? start : "T", settings.load(learner.id));
    control.current = c;
    setAvatar(learner.avatar);
    refresh();
    return () => c.stop(); // leaving the screen ends the lesson as unfinished
  }, [id, router]);

  /** Shows what Lesson Control reported after an event. */
  const show = useCallback((r: Report, stageOfAttempt: Stage) => {
    if (r.feedback.length === 0) return;
    setReport(r);
    if (r.feedback[0] === "checkIn") return;
    // An attempt just ended: leave it on screen for a moment, then clear it.
    const figure = catalogue.lesson(control.current!.lessonId).figure;
    setMarks(
      stageOfAttempt === "I"
        ? [] // with no guide, pointing at a place would give the figure away
        : r.difficulties.flatMap((d) =>
            d.kind === "missedPart"
              ? [midpoint(figure.parts[d.index])]
              : d.kind === "missedEndpoint"
                ? [figure.endpoints[d.index]]
                : [],
          ),
    );
    setShowing(true);
    setTimeout(() => {
      setStrokes([]);
      setMarks([]);
      setShowing(false);
      lastInput.current = Date.now(); // the idle clocks start again once the child can draw
    }, SHOW_MS);
  }, []);

  // Tick: lets an idle attempt end, and runs the lesson's idle rules.
  useEffect(() => {
    const timer = setInterval(() => {
      const c = control.current;
      if (!c || showing) return;
      const stage = c.stage;
      show(c.tick(lastInput.current), stage);
      refresh();
    }, 500);
    return () => clearInterval(timer);
  }, [show, showing]);

  const c = control.current;
  if (!c) return null;
  const lesson = catalogue.lesson(c.lessonId);
  const running = c.status === "active" || c.status === "suggested";
  const live = c.attempt?.last ?? (showing ? c.lastFinal : null);

  const onStroke = (stroke: Stroke) => {
    if (!running || c.stage === "D") return;
    const stage = c.stage;
    setStrokes((s) => [...s, stroke]);
    show(c.addStroke(stroke), stage);
    refresh();
  };

  const answer = async (accept: boolean, stage?: DrawingStage) => {
    if (!(await ask())) return; // only an adult can answer (SAF-RAY-001)
    c.answerSuggestion(accept, stage);
    if (accept) setStrokes([]);
    setReport(null);
    refresh();
  };

  const leave = async () => {
    if (running && !(await ask())) return;
    router.push("/lessons");
  };

  return (
    <div className="mx-auto max-w-xl">
      {/* Where the child is in the lesson: pictures, no reading needed. */}
      <div className="flex items-center gap-2">
        <span className="text-4xl" aria-label="Child drawing now">
          {avatar}
        </span>
        <ol className="grid flex-1 grid-cols-4 gap-2">
          {STAGES.map(({ stage, label, guidance }, i) => {
            const current = c.stage === stage;
            return (
              <li
                key={stage}
                aria-label={label}
                aria-current={current ? "step" : undefined}
                className={`rounded-xl px-2 py-2 ${current ? "bg-lavender ring-2 ring-brand" : "bg-panel"}`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      current ? "bg-brand text-white" : "bg-lavender-deep text-brand"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className={`text-xs leading-tight font-bold ${current ? "text-ink" : "text-muted"}`}>{label}</span>
                </div>
                <div className="mt-1.5 flex gap-1" aria-hidden="true">
                  {[0, 1, 2, 3].map((d) => (
                    <span
                      key={d}
                      className={`h-2 w-2 rounded-full border border-brand ${d < guidance ? "bg-brand" : "bg-white"}`}
                    />
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
        <button onClick={leave} aria-label="Leave the lesson (grown-ups)" className="rounded-full p-2 text-2xl">
          🔒
        </button>
      </div>

      <div className="relative mt-4">
        <DrawingCanvas
          guide={c.stage === "D" || !running ? NO_GUIDE : catalogue.guide(c.lessonId, c.stage)}
          strokes={strokes}
          marks={marks}
          demonstration={running && c.stage === "D" ? lesson.figure.parts : undefined}
          disabled={!running || c.stage === "D" || showing}
          onStroke={onStroke}
          onCancel={() => {
            c.interrupt();
            setStrokes([]);
            refresh();
          }}
          onInput={(t) => {
            lastInput.current = t;
            if (report?.feedback[0] === "checkIn") setReport(null);
          }}
        />

        {running && c.stage === "D" && (
          <button
            onClick={() => {
              c.beginPractice();
              lastInput.current = Date.now();
              refresh();
            }}
            aria-label="Start drawing"
            className="absolute bottom-6 left-1/2 flex h-24 w-24 -translate-x-1/2 items-center justify-center rounded-full bg-green text-5xl text-white shadow-lg"
          >
            ▶
          </button>
        )}

        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white/90 text-center">
            <span className="text-8xl">{c.ending === "completed" ? "🎉" : "🌈"}</span>
            <p className="mt-4 font-serif text-3xl font-bold">
              {feedback(c.ending === "completed" ? "lessonComplete" : "lessonEnded").message}
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/lessons" className="rounded-full bg-brand px-5 py-3 font-bold text-white">
                Lessons
              </Link>
              <Link href="/records" className="rounded-full border border-line bg-white px-5 py-3 font-bold">
                See the records
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Feedback: the effort first, then what was seen in the drawing. */}
      <div className="mt-4 min-h-20" aria-live="polite">
        {report &&
          running &&
          report.feedback.map((kind) => {
            const f = feedback(kind);
            return (
              <p
                key={kind}
                className="flex w-fit items-center gap-3 rounded-full px-5 py-2 text-xl font-bold"
                style={{ color: f.colour, backgroundColor: `${f.colour}1a` }}
              >
                <span className="text-3xl">{f.image}</span>
                {f.message}
              </p>
            );
          })}
        {report &&
          running &&
          [...new Set(report.difficulties.map((d) => d.kind))].map((kind) => {
            const f = difficultyFeedback(kind);
            return (
              <p key={kind} className="mt-2 flex items-center gap-3 pl-5 text-base font-bold" style={{ color: f.colour }}>
                <span className="text-2xl">{f.image}</span>
                {f.message}
              </p>
            );
          })}
      </div>

      {/* For the adult: a go-back suggestion. The child keeps practising meanwhile. */}
      {c.status === "suggested" && (
        <div className="mt-2 rounded-2xl bg-lavender p-4 text-sm">
          <p className="font-bold text-brand">For the grown-up: would an earlier stage help?</p>
          <p className="text-muted">
            There have been {c.streak} attempts in a row that did not pass at this stage. Nothing changes unless you
            choose.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => answer(true, "T")} className="rounded-full bg-brand px-3 py-2 text-white">
              Go back to tracing
            </button>
            {c.stage === "I" && (
              <button onClick={() => answer(true, "E")} className="rounded-full bg-brand px-3 py-2 text-white">
                Go back to corners only
              </button>
            )}
            <button onClick={() => answer(false)} className="rounded-full border border-line bg-white px-3 py-2">
              Stay at this stage
            </button>
          </div>
        </div>
      )}

      {/* For the demonstration to the teaching team, not for the child. */}
      <div className="mt-6 rounded-2xl bg-panel p-4 text-sm">
        <button onClick={() => setPanel((p) => !p)} className="flex items-center gap-2 font-bold">
          {panel ? "▾" : "▸"} Demo panel
          <span className="rounded-full bg-butter px-3 py-0.5 text-xs text-butter-ink">For adults</span>
        </button>
        {panel && (
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3" data-testid="panel">
            <Item label="Lesson status" value={c.status} />
            <Item label="Stage" value={c.stage} />
            <Item label="Pass mark" value={c.settings.stagePass} />
            <Item label="Result so far" value={live ? Math.round(live.result) : "none"} />
            <Item label="Figure drawn" value={live ? `${Math.round(live.drawn * 100)}%` : "none"} />
            <Item label="Drawing on figure" value={live ? `${Math.round(live.onFigure * 100)}%` : "none"} />
            <Item label="Class" value={live?.class ?? "none"} />
            <Item label="Failed at this stage" value={`${c.failed} of ${c.settings.attemptLimit}`} />
            <Item label="Attempts at this stage" value={`${c.evaluable} of ${c.settings.attemptLimitMax}`} />
            <Item label="Failed in a row" value={`${c.streak} (suggest at ${c.settings.difficultyStreak})`} />
            <Item
              label="Extension"
              value={c.extended ? `${c.sinceExtension} of ${c.settings.attemptExtension} used` : "not given"}
            />
            <Item label="Attempt ends after" value={`${c.settings.attemptIdle} s with no drawing`} />
          </dl>
        )}
      </div>
      {dialog}
    </div>
  );
}

function Item({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs font-bold tracking-wide text-muted uppercase">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}
