"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useAdultCheck } from "@/components/AdultCheck";
import { Avatar } from "@/components/Avatar";
import { DrawingCanvas, type Tool } from "@/components/DrawingCanvas";
import {
  DoorIcon,
  EraserIcon,
  Footprints,
  Helper,
  LockIcon,
  PencilIcon,
  RestartIcon,
  StageGuide,
  Sticker,
} from "@/components/icons";
import { LessonIcon } from "@/components/LessonIcon";
import { Frame, buttonClass } from "@/components/Screen";
import * as catalogue from "@/lib/catalogue";
import { tolerance } from "@/lib/evaluation";
import { difficultyFeedback, feedback, stageLine } from "@/lib/feedback";
import { apply, applyAll, distance, inverse, toPath } from "@/lib/geometry";
import { LessonControl } from "@/lib/lessonControl";
import * as profiles from "@/lib/profiles";
import { records } from "@/lib/records";
import * as settings from "@/lib/settings";
import type { DrawingStage, Figure, Guide, Path, Point, Report, Stage, Stroke } from "@/lib/types";

// M13 Child Screen (prototype S6 to S11). It shows the lesson and relays
// input: each finished stroke goes to Lesson Control, which is also ticked
// twice a second. All the rules live in lib/lessonControl.ts; nothing here
// decides a pass.

const ORDER: Stage[] = ["D", "T", "E", "I"];
const STEP_LABELS = ["Watch", "Full outline", "Endpoints only", "On my own"];
const STEP: Record<DrawingStage, { number: number; name: string }> = {
  T: { number: 1, name: "Full outline" },
  E: { number: 2, name: "Endpoints only" },
  I: { number: 3, name: "On my own" },
};
const NO_GUIDE: Guide = { outline: [], endpoints: [] };
/** How long a finished attempt stays on screen with its feedback: longer when there is something to look at. */
const SHOW_PASSED_MS = 2500;
const SHOW_NOT_PASSED_MS = 5000;

/** The stretches of a part of the figure that no drawn line comes near. */
function undrawn(part: Path, drawn: Path[], tol: number): Path[] {
  const runs: Path[] = [];
  let run: Path = [];
  for (let i = 1; i < part.length; i++) {
    const a = part[i - 1];
    const b = part[i];
    const pieces = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 10));
    for (let j = 0; j <= pieces; j++) {
      const p = { x: a.x + ((b.x - a.x) * j) / pieces, y: a.y + ((b.y - a.y) * j) / pieces };
      if (distance(p, drawn) > tol) run.push(p);
      else if (run.length > 0) {
        runs.push(run);
        run = [];
      }
    }
  }
  if (run.length > 0) runs.push(run);
  return runs.filter((r) => r.length > 1);
}

export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ask, dialog } = useAdultCheck();
  const control = useRef<LessonControl | null>(null);
  const lastInput = useRef<number | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const [avatar, setAvatar] = useState("");
  const [strokes, setStrokesState] = useState<Stroke[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [marks, setMarks] = useState<Point[]>([]);
  const [glow, setGlow] = useState<Path[]>([]);
  const [showing, setShowing] = useState(false); // a finished attempt is on screen
  const [card, setCard] = useState(false); // the go-back card is open
  const [panel, setPanel] = useState(true);
  const [tool, setTool] = useState<Tool>("pencil");

  const setStrokes = (next: Stroke[]) => {
    strokesRef.current = next;
    setStrokesState(next);
  };

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
    const figure: Figure = catalogue.lesson(control.current!.lessonId).figure;
    // The glow is worked out on the figure, then laid back over the drawing
    // where the child made it. (With a guide the two are the same place.)
    const fit = control.current!.lastFinal?.fit ?? { scale: 1, dx: 0, dy: 0 };
    const back = inverse(fit);
    const drawn = applyAll(fit, strokesRef.current.map(toPath));
    setGlow(
      applyAll(
        back,
        r.difficulties
          .filter((d) => d.kind === "missedPart")
          .flatMap((d) => undrawn(figure.parts[d.index], drawn, tolerance(figure))),
      ),
    );
    setMarks(
      r.difficulties.filter((d) => d.kind === "missedEndpoint").map((d) => apply(back, figure.endpoints[d.index])),
    );
    const passed = r.feedback[0] === "stagePassed" || r.feedback[0] === "lessonComplete";
    setShowing(true);
    setTool("pencil");
    setTimeout(
      () => {
        setStrokes([]);
        setMarks([]);
        setGlow([]);
        setShowing(false);
        setReport((current) => (current === r ? null : current));
        lastInput.current = Date.now(); // the idle clocks start again once the child can draw
      },
      passed ? SHOW_PASSED_MS : SHOW_NOT_PASSED_MS,
    );
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
  const suggested = c.status === "suggested";

  // What the helper says: the latest feedback, or else the line for this stage.
  const bubble = !running
    ? feedback(c.ending === "completed" ? "lessonComplete" : "lessonEnded").message
    : report
      ? feedback(report.feedback[0]).message
      : stageLine(c.stage);
  const hints = report && running ? [...new Set(report.difficulties.map((d) => d.kind))] : [];

  const onStroke = (stroke: Stroke) => {
    if (!running || c.stage === "D") return;
    const stage = c.stage;
    setStrokes([...strokesRef.current, stroke]);
    show(c.addStroke(stroke), stage);
    refresh();
  };

  /** The eraser was lifted: the drawing that is left is checked like any other stylus lift. */
  const onErase = (left: Stroke[]) => {
    if (!running || c.stage === "D") return;
    const stage = c.stage;
    setStrokes(left);
    show(c.replaceStrokes(left), stage);
    refresh();
  };

  /** "Start again": wipes this try. The attempt is kept apart as interrupted and is not counted. */
  const startAgain = () => {
    c.interrupt();
    setStrokes([]);
    setReport(null);
    refresh();
  };

  const openCard = async () => {
    if (await ask()) setCard(true); // only an adult can answer (SAF-RAY-001)
  };

  const answer = (accept: boolean, stage?: DrawingStage) => {
    c.answerSuggestion(accept, stage);
    if (accept) setStrokes([]);
    setReport(null);
    setCard(false);
    lastInput.current = Date.now();
    refresh();
  };

  const leave = async (to: string) => {
    if (await ask()) router.push(to);
  };

  const childButton =
    "flex h-16 w-16 items-center justify-center rounded-2xl border-[3px] border-ink bg-white hover:bg-lavender disabled:border-line disabled:text-line";

  return (
    <>
      <Frame brand={false} className="!p-4 sm:!p-5">
        <div className="flex items-start justify-between">
          <div>
            <Footprints reached={running ? ORDER.indexOf(c.stage) : 3} labels={STEP_LABELS} avatar={avatar} />
            {/* With no guide, a small picture reminds the child what to draw. */}
            {running && c.stage === "I" && (
              <div className="mt-3 flex h-20 w-20 items-center justify-center rounded-2xl border-[3px] border-ink bg-white">
                <LessonIcon figure={lesson.figure} className="h-14 w-14" />
              </div>
            )}
          </div>
          {avatar && <Avatar avatar={avatar} />}
        </div>

        <div className="relative mx-auto -mt-4 flex w-full max-w-[min(100%,max(26rem,calc(100vh-10.5rem)))] items-center gap-3">
          {/* The child's tools: draw, or rub out a part of the drawing. */}
          <div className={`flex flex-col gap-3 ${running && c.stage !== "D" ? "" : "invisible"}`}>
            {(
              [
                { value: "pencil", label: "Pencil", Icon: PencilIcon },
                { value: "eraser", label: "Eraser", Icon: EraserIcon },
              ] as const
            ).map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => setTool(value)}
                aria-label={label}
                aria-pressed={tool === value}
                className={`flex h-16 w-16 items-center justify-center rounded-2xl border-[3px] ${
                  tool === value ? "border-brand bg-lavender-deep text-brand" : "border-ink bg-white"
                }`}
              >
                <Icon className="h-8 w-8" />
              </button>
            ))}
          </div>
          <div className="relative min-w-0 flex-1">
            <DrawingCanvas
              tool={tool}
              onErase={onErase}
              guide={c.stage === "D" || !running ? NO_GUIDE : catalogue.guide(c.lessonId, c.stage)}
              strokes={strokes}
              marks={marks}
              glow={glow}
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
                className="absolute bottom-5 left-1/2 flex h-24 w-24 -translate-x-1/2 items-center justify-center rounded-full border-[3px] border-ink bg-green text-5xl text-white"
              >
                ▶
              </button>
            )}

            {!running && (
              <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-white">
                <Sticker className="h-3/5 w-3/5" />
              </div>
            )}
          </div>
          <div className="w-16 shrink-0" aria-hidden="true" />
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3" aria-live="polite">
            <Helper className="h-20 w-[4.25rem] shrink-0" />
            <div>
              <p className="rounded-[2rem] border-[3px] border-ink bg-white px-6 py-3 text-2xl font-bold">{bubble}</p>
              {hints.length > 0 && (
                <p className="mt-1 pl-6 text-lg font-bold text-butter-ink">
                  {hints
                    .slice(0, 2)
                    .map((kind) => difficultyFeedback(kind).message)
                    .join(" ")}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {running && suggested && (
              <button onClick={openCard} className={`${buttonClass} border-brand text-brand`}>
                <LockIcon className="h-5 w-5" />
                Grown-ups
              </button>
            )}
            {running && c.stage !== "D" && (
              <button
                onClick={startAgain}
                disabled={showing || strokes.length === 0}
                aria-label="Start again"
                className={childButton}
              >
                <RestartIcon className="h-8 w-8" />
              </button>
            )}
            {running && (
              <button onClick={() => leave("/")} aria-label="Leave the lesson (grown-ups)" className={childButton}>
                <DoorIcon className="h-8 w-8" />
              </button>
            )}
            {!running && (
              <button onClick={() => leave("/grown-ups")} className={buttonClass}>
                <LockIcon className="h-5 w-5" />
                Grown-ups
              </button>
            )}
          </div>
        </div>
      </Frame>

      {/* The go-back suggestion (UC-005). It waits behind the Grown-ups button, which appears when a
          suggestion is pending, and never blocks practice. Nothing is said to the child about it. */}
      {card && suggested && c.stage !== "D" && c.stage !== "T" && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4"
          role="dialog"
          aria-label="Go back a step?"
        >
          <div className="w-full max-w-2xl rounded-3xl border-4 border-ink bg-white p-6 sm:p-8">
            <p className="flex items-center gap-2 text-xl font-bold">
              <LockIcon className="h-6 w-6" />
              Grown-ups
            </p>
            <p className="mt-3 text-2xl">
              {avatar} has tried step {STEP[c.stage].number}, &ldquo;{STEP[c.stage].name}&rdquo;, {c.streak} times in a
              row.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <StepTile figure={lesson.figure} stage={c.stage} caption="Now" />
              <span className="text-4xl" aria-hidden="true">
                →
              </span>
              <StepTile figure={lesson.figure} stage="T" caption="Back to" strong />
              {c.stage === "I" && <StepTile figure={lesson.figure} stage="E" caption="Or back to" strong />}
            </div>
            <p className="mt-5 text-2xl">Go back to an earlier step?</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                onClick={() => answer(true, "T")}
                className="rounded-2xl border-[3px] border-ink bg-white px-5 py-3 text-xl font-bold hover:bg-lavender"
              >
                Yes, go back to step 1
              </button>
              {c.stage === "I" && (
                <button
                  onClick={() => answer(true, "E")}
                  className="rounded-2xl border-[3px] border-ink bg-white px-5 py-3 text-xl font-bold hover:bg-lavender"
                >
                  Yes, go back to step 2
                </button>
              )}
              <button
                onClick={() => answer(false)}
                className="rounded-2xl border-2 border-ink bg-white px-5 py-3 text-xl font-bold hover:bg-lavender"
              >
                No, keep trying step {STEP[c.stage].number}
              </button>
            </div>
            <p className="mt-4 text-muted">Either way, {avatar} carries on alone once you hand the tablet back.</p>
          </div>
        </div>
      )}

      {/* For the demonstration to the teaching team, not for the child. */}
      <div className="mx-auto mt-5 max-w-5xl rounded-3xl bg-white p-5 text-sm">
        <button onClick={() => setPanel((p) => !p)} className="flex items-center gap-2 font-bold">
          {panel ? "▾" : "▸"} Demo panel
          <span className="rounded-full bg-butter px-3 py-0.5 text-xs text-butter-ink">For adults</span>
        </button>
        {panel && (
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4" data-testid="panel">
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
    </>
  );
}

function StepTile({
  figure,
  stage,
  caption,
  strong = false,
}: {
  figure: Figure;
  stage: DrawingStage;
  caption: string;
  strong?: boolean;
}) {
  return (
    <div className="text-center">
      <div
        className={`relative h-28 w-28 rounded-2xl bg-white ${strong ? "border-4 border-brand" : "border-2 border-ink"}`}
      >
        <span className="absolute top-1.5 left-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-white text-sm font-bold">
          {STEP[stage].number}
        </span>
        <StageGuide figure={figure} stage={stage} className="h-full w-full p-3" />
      </div>
      <p className="mt-1 text-muted">
        {caption}: {STEP[stage].name}
      </p>
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
