"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { DoorIcon, Footprints, Helper, StageGuide, Sticker } from "@/components/icons";
import { LessonIcon } from "@/components/LessonIcon";
import { Frame, buttonClass } from "@/components/Screen";
import * as audio from "@/lib/audio";
import * as catalogue from "@/lib/catalogue";
import { tolerance } from "@/lib/evaluation";
import { problemFeedback, feedback, stageLine } from "@/lib/feedback";
import { apply, applyAll, distance, inverse, length, toPath } from "@/lib/geometry";
import { DEMO_MS, FULL_ARROW_MS, MAX_HINTS, SHOW_NOT_PASSED_MS, SHOW_PASSED_MS, TICK_MS } from "@/lib/constants";
import { LessonControl } from "@/lib/lessonControl";
import * as settings from "@/lib/settings";
import * as stages from "@/lib/stages";
import type { DrawingProblem, DrawingProblemKind, DrawingStage, Evaluation, Figure, Fit, Guide, Path, Point, Report, Stage, Stroke } from "@/lib/types";

/** The part of the web address that names the lesson, e.g. "square" in /lesson/square. */
// A `type`, not an `interface`: Next.js needs this form for useParams.
type RouteParams = {
  id: string;
};

// M13 Child Screen (prototype S6 to S11, without its Start again button).
// It shows the lesson and relays input: each finished stroke goes to Lesson
// Control, which is also ticked twice a second. All the rules live in
// lib/lessonControl.ts; nothing here decides a pass.

/** The names on the progress trail, one for each stage, in order. */
const STEP_LABELS: string[] = stages.STAGES.map((step) => step.name);
const NO_GUIDE: Guide = { outline: [], endpoints: [] };
const NO_FIT: Fit = { scale: 1, dx: 0, dy: 0 };

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
  const { id } = useParams<RouteParams>();
  const router = useRouter();
  const control = useRef<LessonControl | null>(null);
  const lastInput = useRef<number | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const [strokes, setStrokesState] = useState<Stroke[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [marks, setMarks] = useState<Point[]>([]);
  const [glow, setGlow] = useState<Path[]>([]);
  const [showing, setShowing] = useState(false); // a finished attempt is on screen
  const [card, setCard] = useState(false); // the go-back card is open
  const [panel, setPanel] = useState(true);
  /** While a finished attempt is on screen: the stage it was made at, so its guide stays under it. */
  const [shownStage, setShownStage] = useState<Stage | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** True while the go-back card is open. The lesson waits. */
  const paused = useRef(false);
  /** True once the child has been shown what is missing in the attempt on screen. */
  const hinted = useRef(false);
  /** When the current stage came up, for the demonstration and the arrow. */
  const stageSince = useRef(Date.now());
  const [arrowFull, setArrowFull] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const setStrokes = (next: Stroke[]) => {
    strokesRef.current = next;
    setStrokesState(next);
  };

  // Start the lesson with the values the adult chose on the Lesson ready screen.
  useEffect(() => {
    if (!catalogue.LESSONS.some((l) => l.id === id)) {
      router.replace("/");
      return;
    }
    // The starting stage comes from the web address, for example /lesson/square?start=E.
    const asked = new URLSearchParams(window.location.search).get("start");
    let start: DrawingStage = "T";
    if (asked === "E" || asked === "I") {
      start = asked;
    }
    const c = new LessonControl({});
    c.select(id, start, settings.chosen());
    control.current = c;
    stageSince.current = Date.now();
    refresh();
    return () => {
      audio.hush();
      if (clearTimer.current) clearTimeout(clearTimer.current);
      c.stop(); // leaving the screen ends the lesson as unfinished
    };
  }, [id, router]);

  /**
   * Lights up what the drawing on screen still lacks. The glow is worked out
   * on the figure, then laid back over the drawing where the child made it.
   * (With a guide the two are the same place.)
   */
  const highlight = useCallback((problems: DrawingProblem[], fit: Fit) => {
    const c = control.current;
    if (c === null) return;
    const figure: Figure = catalogue.lesson(c.lessonId).figure;
    const back = inverse(fit);
    const drawn = applyAll(fit, strokesRef.current.map(toPath));
    setGlow(
      applyAll(
        back,
        problems
          .filter((d) => d.kind === "missedPart")
          .flatMap((d) => undrawn(figure.parts[d.index], drawn, tolerance(figure))),
      ),
    );
    setMarks(
      problems.filter((d) => d.kind === "missedEndpoint").map((d) => apply(back, figure.endpoints[d.index])),
    );
  }, []);

  /** Shows what Lesson Control reported after an event. */
  const show = useCallback(
    (r: Report, stageOfAttempt: Stage) => {
      if (r.feedback.length === 0) return;
      setReport(r);
      const c = control.current;
      if (c === null || r.feedback[0] === "checkIn") return;

      if (r.feedback[0] === "fillIn") {
        // A hint: the drawing stays and the child can go on drawing. What is
        // missing glows until they finish it or the attempt ends.
        hinted.current = true;
        highlight(r.problems, fitOf(currentEvaluation(c)));
        return;
      }

      // An attempt just ended: leave it on screen for a moment, then clear it.
      const passed = r.feedback[0] === "stagePassed" || r.feedback[0] === "lessonComplete";
      if (passed) {
        setGlow([]);
        setMarks([]);
        audio.chime();
      } else {
        highlight(r.problems, fitOf(lastEvaluation(c)));
      }
      if (r.feedback.includes("lessonComplete") || r.feedback.includes("lessonEnded")) audio.tune();
      // A child who has already been shown the glow does not need it held up as long again.
      const hold = passed || hinted.current ? SHOW_PASSED_MS : SHOW_NOT_PASSED_MS;
      hinted.current = false;
      setCelebrate(passed);
      setShowing(true);
      setShownStage(stageOfAttempt);
      clearTimer.current = setTimeout(() => {
        setStrokes([]);
        setMarks([]);
        setGlow([]);
        setShowing(false);
        setShownStage(null);
        setCelebrate(false);
        setArrowFull(false);
        setReport((current) => (current === r ? null : current));
        lastInput.current = Date.now(); // the idle clocks start again once the child can draw
        stageSince.current = Date.now();
      }, hold);
    },
    [highlight],
  );

  // Tick: lets an idle attempt end, and runs the lesson's idle rules.
  useEffect(() => {
    const timer = setInterval(() => {
      const c = control.current;
      if (!c || showing || paused.current) return;
      const stage = c.stage;
      const running = c.status === "active" || c.status === "suggested";
      // The demonstration plays, then practice starts by itself (UC-003 step 1).
      if (running && stage === "D" && Date.now() - stageSince.current >= DEMO_MS) {
        c.beginPractice();
        lastInput.current = Date.now();
        stageSince.current = Date.now();
        refresh();
        return;
      }
      // With only the dots to go by and nothing drawn for a while, the arrow goes all the way round.
      if (running && stage === "E" && strokesRef.current.length === 0) {
        let last = stageSince.current;
        if (lastInput.current !== null && lastInput.current > last) {
          last = lastInput.current;
        }
        setArrowFull(Date.now() - last >= FULL_ARROW_MS);
      }
      show(c.tick(lastInput.current), stage);
      refresh();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [show, showing]);

  // The helper says its line aloud whenever the line changes.
  const line = useRef("");
  const spoken = useRef("");
  useEffect(() => {
    if (line.current && line.current !== spoken.current) {
      spoken.current = line.current;
      audio.say(line.current);
    }
  });

  const c = control.current;
  if (!c) return null;
  const lesson = catalogue.lesson(c.lessonId);
  const running = c.status === "active" || c.status === "suggested";
  // The evaluation the demo panel shows: the attempt in progress, or the one just finished while it is on screen.
  let live = currentEvaluation(c);
  if (live === null && showing) {
    live = lastEvaluation(c);
  }
  const suggested = c.status === "suggested";
  // The guide on screen: the current stage's, or, while a finished attempt is
  // still showing, the one that attempt was drawn over.
  let guideStage: Stage = "D";
  if (shownStage !== null) {
    guideStage = shownStage;
  } else if (running) {
    guideStage = c.stage;
  }
  const guide = guideStage === "D" ? NO_GUIDE : catalogue.guide(c.lessonId, guideStage);

  // What the helper says: the latest feedback, or else the line for this stage.
  const bubble = !running
    ? feedback(c.ending === "completed" ? "lessonComplete" : "lessonEnded").message
    : report
      ? feedback(report.feedback[0]).message
      : stageLine(c.stage);
  line.current = bubble;
  // Under the bubble: what was seen in the drawing. Not after a hint, where the bubble already says it.
  const hints: DrawingProblemKind[] = [];
  if (report !== null && running && report.feedback[0] !== "fillIn") {
    for (const problem of report.problems) {
      if (!hints.includes(problem.kind)) {
        hints.push(problem.kind); // each kind once
      }
    }
  }
  // With a guide: a green dot where the drawing starts, as in the demonstration.
  const drawing = running && !showing && c.stage !== "D";
  const startDot = drawing && (c.stage === "T" || c.stage === "E") ? lesson.figure.parts[0][0] : undefined;
  // With only the dots to go by, an arrow travels from the start dot to the next dot, to show which
  // way to go. If nothing is drawn for a while, it goes on round the whole shape, dot to dot.
  const outline = lesson.figure.parts.flat();
  const arrowOn = drawing && c.stage === "E" && strokes.length === 0;

  const onStroke = (stroke: Stroke) => {
    if (!running || c.stage === "D") return;
    const stage = c.stage;
    setStrokes(strokesRef.current.concat([stroke]));
    const r = c.addStroke(stroke);
    // After a hint, the glow follows the drawing: what has been filled in stops glowing.
    const now = currentEvaluation(c);
    if (r.feedback.length === 0 && hinted.current && c.attempt !== null && now !== null) {
      highlight(c.attempt.missing(), now.fit);
    }
    show(r, stage);
    refresh();
  };

  /**
   * Opens the go-back card. While it is open the lesson waits: the adult's
   * time at the card is not the child's pause, so no attempt ends and no idle
   * clock runs. (The full app puts this behind the adult check; the POC has none.)
   */
  const openCard = () => {
    paused.current = true;
    setCard(true);
  };

  const answer = (accept: boolean, stage: DrawingStage | null) => {
    c.answerSuggestion(accept, stage);
    if (accept) setStrokes([]);
    setReport(null);
    setCard(false);
    paused.current = false;
    lastInput.current = Date.now();
    refresh();
  };

  const leave = () => router.push("/");

  const childButton =
    "flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-edge bg-white hover:bg-lavender disabled:border-line disabled:text-line";

  return (
    <>
      <Frame brand={false} className="!p-4 sm:!p-5">
        {/* The progress trail, with a small picture beside it at every stage that reminds the child
            what to draw. The row keeps its height when the picture is gone, so nothing moves. */}
        <div className="flex min-h-16 items-center gap-6">
          <Footprints reached={reachedStep(c)} labels={STEP_LABELS} />
          {running && (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-edge bg-white">
              <LessonIcon figure={lesson.figure} className="h-11 w-11" />
            </div>
          )}
        </div>

        {/* The drawing area: as big as the screen allows while staying square. Its width is the
            smallest of the full width and the screen height minus about 16rem, which is the room
            the progress trail above and the helper below need. dvh is the visible height,
            so the browser's own toolbar on a tablet is not counted. Never smaller than 22rem. The
            area starts below the trail, so it never covers the footsteps. */}
        <div className="relative mx-auto mt-3 w-full max-w-[min(100%,max(22rem,calc(100dvh-16rem)))]">
          <div className={`relative min-w-0 flex-1 ${celebrate ? "pop-gently" : ""}`}>
            <DrawingCanvas
              guide={guide}
              startDot={startDot}
              arrow={
                arrowOn
                  ? { path: outline, reach: arrowFull ? length(outline) : length(lesson.figure.parts[0]) }
                  : undefined
              }
              strokes={strokes}
              marks={marks}
              glow={glow}
              demonstration={running && c.stage === "D" ? lesson.figure.parts : undefined}
              disabled={!running || c.stage === "D" || showing}
              onStroke={onStroke}
              onCancel={() => {
                c.interrupt();
                hinted.current = false;
                setStrokes([]);
                setGlow([]);
                setMarks([]);
                setReport(null);
                refresh();
              }}
              onInput={(t) => {
                lastInput.current = t;
                if (report !== null && report.feedback[0] === "checkIn") setReport(null);
              }}
            />

            {!running && (
              <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-white">
                <Sticker className="pop h-3/5 w-3/5" />
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3" aria-live="polite">
            <Helper className="h-20 w-[4.25rem] shrink-0" />
            <div>
              <p className="rounded-[2rem] border-2 border-edge bg-white px-6 py-3 text-2xl font-bold">{bubble}</p>
              {hints.length > 0 && (
                <p className="mt-1 pl-6 text-lg font-bold text-butter-ink">
                  {hints
                    .slice(0, 2)
                    .map((kind) => problemFeedback(kind).message)
                    .join(" ")}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {running && suggested && (
              <button onClick={openCard} className={`${buttonClass} border-brand text-brand`}>
                Grown-ups
              </button>
            )}
            {running && (
              <button onClick={leave} aria-label="Leave the lesson (grown-ups)" className={childButton}>
                <DoorIcon className="h-8 w-8" />
              </button>
            )}
            {!running && (
              <button onClick={leave} className={buttonClass}>
                Back to the lessons
              </button>
            )}
          </div>
        </div>
      </Frame>

      {/* The go-back suggestion (UC-005). It waits behind the Grown-ups button, which appears when a
          suggestion is pending, and never blocks practice. Nothing is said to the child about it. */}
      {card && suggested && c.stage !== "D" && (
        <GoBackCard
          figure={lesson.figure}
          stage={c.stage}
          streak={c.streak}
          onAnswer={answer}
          onLater={() => {
            setCard(false);
            paused.current = false;
            lastInput.current = Date.now();
          }}
        />
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
            <Item label="Class" value={live !== null ? live.class : "none"} />
            <Item label="Failed at this stage" value={`${c.failed} of ${c.settings.attemptLimit}`} />
            <Item label="Attempts at this stage" value={`${c.evaluable} of ${c.settings.attemptLimitMax}`} />
            <Item label="Failed in a row" value={`${c.streak} (suggest at ${c.settings.failStreak})`} />
            <Item
              label="Extension"
              value={c.extended ? `${c.sinceExtension} of ${c.settings.attemptExtension} used` : "not given"}
            />
            <Item label="Attempt ends after" value={`${c.settings.attemptIdle} s with no drawing`} />
            <Item label="Hints this attempt" value={`${c.attempt !== null ? c.attempt.hints : 0} of ${MAX_HINTS}`} />
          </dl>
        )}
      </div>
    </>
  );
}

interface StepTileProps {
  figure: Figure;
  stage: DrawingStage;
  caption: string;
  strong?: boolean;
}

function StepTile({
  figure,
  stage,
  caption,
  strong = false,
}: StepTileProps) {
  return (
    <div className="text-center">
      <div
        className={`relative h-28 w-28 rounded-2xl bg-white ${strong ? "border-4 border-brand" : "border-2 border-edge"}`}
      >
        <span className="absolute top-1.5 left-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-edge bg-white text-sm font-bold">
          {stages.info(stage).number}
        </span>
        <StageGuide figure={figure} stage={stage} className="h-full w-full p-3" />
      </div>
      <p className="mt-1 text-muted">
        {caption}: {stages.info(stage).name}
      </p>
    </div>
  );
}

interface ItemProps {
  label: string;
  value: string | number;
}

function Item({ label, value }: ItemProps) {
  return (
    <div>
      <dt className="text-xs font-bold tracking-wide text-muted uppercase">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}

/** The evaluation of the attempt in progress, or null if nothing has been drawn in it. */
function currentEvaluation(c: LessonControl): Evaluation | null {
  if (c.attempt === null) {
    return null;
  }
  return c.attempt.last;
}

/** The evaluation of the attempt that ended last, or null. */
function lastEvaluation(c: LessonControl): Evaluation | null {
  if (c.lastAttempt === null) {
    return null;
  }
  return c.lastAttempt.last;
}

/** How the drawing was laid over the figure, or no change at all if there is no evaluation. */
function fitOf(evaluation: Evaluation | null): Fit {
  if (evaluation === null) {
    return NO_FIT;
  }
  return evaluation.fit;
}

/** The step reached on the progress trail: the current stage, or the last one once the lesson is complete. */
function reachedStep(c: LessonControl): number {
  if (c.ending === "completed") {
    return stages.STAGES.length - 1;
  }
  return stages.position(c.stage);
}

interface GoBackCardProps {
  figure: Figure;
  /** The stage the child is stuck at. */
  stage: DrawingStage;
  /** How many attempts in a row did not pass. */
  streak: number;
  /** The adult's answer: accept with the stage to go back to, or decline with null. */
  onAnswer: (accept: boolean, stage: DrawingStage | null) => void;
  onLater: () => void;
}

/**
 * The go-back suggestion (UC-005). It waits behind the Grown-ups button,
 * which appears when a suggestion is pending, and never blocks practice.
 * Nothing is said to the child about it. There is one button for each
 * earlier drawing stage, so a new stage would need no change here.
 */
function GoBackCard({ figure, stage, streak, onAnswer, onLater }: GoBackCardProps) {
  const now = stages.info(stage);
  const choices = stages.earlier(stage);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-label="Go back a step?">
      <div className="w-full max-w-2xl rounded-3xl border border-edge shadow-card bg-white p-6 sm:p-8">
        <p className="text-xl font-bold">Grown-ups</p>
        <p className="mt-3 text-2xl">
          The child has tried step {now.number}, &ldquo;{now.name}&rdquo;, {streak} times in a row.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <StepTile figure={figure} stage={stage} caption="Now" />
          <span className="text-4xl" aria-hidden="true">
            →
          </span>
          {choices.map((earlier) => (
            <StepTile key={earlier} figure={figure} stage={earlier} caption="Back to" strong />
          ))}
        </div>
        <p className="mt-5 text-2xl">Go back to an earlier step?</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {choices.map((earlier) => (
            <button
              key={earlier}
              onClick={() => onAnswer(true, earlier)}
              className="rounded-2xl border-2 border-edge bg-white px-5 py-3 text-xl font-bold hover:bg-lavender"
            >
              Yes, go back to step {stages.info(earlier).number}
            </button>
          ))}
          <button
            onClick={() => onAnswer(false, null)}
            className="rounded-2xl border-2 border-edge bg-white px-5 py-3 text-xl font-bold hover:bg-lavender"
          >
            No, keep trying step {now.number}
          </button>
        </div>
        <p className="mt-4 text-muted">Either way, the child carries on alone once you hand the tablet back.</p>
        <button onClick={onLater} className="mt-3 font-bold text-brand underline">
          Decide later
        </button>
      </div>
    </div>
  );
}
