"use client";

import { useCallback, useEffect, useRef } from "react";
import { ARROW_REST_MS, ARROW_SPEED, CANVAS_UNITS, DEMO_DRAW_MS, HELD_INPUT_MS, PALM_MS } from "@/lib/constants";
import type { Guide, Path, Point, Stroke } from "@/lib/types";

// M01 Input Device and M02 Display in one component. It turns the browser's
// pointer events into strokes in drawing units (the area is always
// 1000 x 1000, whatever the screen), and paints the guide, the strokes, the
// demonstration and the "look here" marks.

/** Positions closer together than this, in drawing units, are thinned out. */
const MIN_STEP = 2;

/** The arrow that shows the child where to start and which way to go. */
interface Arrow {
  /** The path the arrow moves along. */
  path: Path;
  /** How far along the path it goes before resting, in drawing units. */
  reach: number;
}

/** A point on a path, and the direction of travel there (an angle in radians). */
/** One band of the glow over a missing stretch. */
interface GlowBand {
  colour: string;
  /** In drawing units. */
  width: number;
}

interface PointOnPath {
  at: Point;
  angle: number;
}

interface Props {
  guide: Guide;
  /** The finished strokes of the current attempt. */
  strokes: Stroke[];
  /** Called at each stylus lift with the finished stroke. */
  onStroke: (stroke: Stroke) => void;
  /** Called when the browser cuts a contact off (pointercancel). */
  onCancel: () => void;
  /** Called with the time of every accepted input, for the idle rules. */
  onInput: (time: number) => void;
  disabled?: boolean;
  /** When set, the paths are drawn one after another, once, and then stay on screen. */
  demonstration?: Path[];
  /** Places to point the child to, without drawing the missing line for them. */
  marks?: Point[];
  /** Stretches of the figure that were not drawn, shown as a glow. */
  glow?: Path[];
  /** Where the drawing starts, shown as a green dot, as in the demonstration. */
  startDot?: Point;
  /**
   * A small arrow that travels along the path from its start, to show which
   * way to go. It goes as far as `reach` (a distance along the path), rests,
   * and sets off again. It moves along the shape; it does not draw it. It is
   * only shown while the child is not drawing.
   */
  arrow?: Arrow;
}

function trace(ctx: CanvasRenderingContext2D, path: Point[], upTo = Infinity) {
  ctx.beginPath();
  let drawn = 0;
  path.forEach((p, i) => {
    if (i === 0) return ctx.moveTo(p.x, p.y);
    const a = path[i - 1];
    const len = Math.hypot(p.x - a.x, p.y - a.y);
    if (drawn >= upTo) return;
    const t = Math.min(1, (upTo - drawn) / len);
    ctx.lineTo(a.x + (p.x - a.x) * t, a.y + (p.y - a.y) * t);
    drawn += len;
  });
  if (path.length === 1) ctx.arc(path[0].x, path[0].y, 1, 0, Math.PI * 2);
  ctx.stroke();
}

/** The point a distance `d` along the path, and the direction of travel there. */
function along(path: Point[], d: number): PointOnPath {
  let left = d;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= len || i === path.length - 1) {
      const t = len === 0 ? 0 : Math.min(1, left / len);
      return { at: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, angle: Math.atan2(b.y - a.y, b.x - a.x) };
    }
    left -= len;
  }
  return { at: path[0], angle: 0 };
}

/** The length of the arrow's tail. */
const ARROW_TAIL = 70;

const pathLength = (path: Point[]) =>
  path.reduce((sum, p, i) => (i === 0 ? 0 : sum + Math.hypot(p.x - path[i - 1].x, p.y - path[i - 1].y)), 0);

export function DrawingCanvas(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const current = useRef<Stroke | null>(null);
  const pointerId = useRef<number | null>(null);
  /** When a stylus last touched. A palm resting beside it must not draw. */
  const penAt = useRef(0);
  const latest = useRef(props);
  latest.current = props;

  const paint = useCallback((demoProgress?: number, arrowAt?: number) => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;
    const now = latest.current;
    const guide = now.guide;
    const strokes = now.strokes;
    const demonstration = now.demonstration;
    const startDot = now.startDot;
    const arrow = now.arrow;
    let marks: Point[] = [];
    if (now.marks !== undefined) {
      marks = now.marks;
    }
    let glow: Path[] = [];
    if (now.glow !== undefined) {
      glow = now.glow;
    }
    const scale = canvas.width / CANVAS_UNITS;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, CANVAS_UNITS, CANVAS_UNITS);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // The glow over a stretch that was not drawn: a wide pale band, under everything else.
    // Two bands: a wide very pale one, then a narrower, stronger one on top.
    const bands: GlowBand[] = [
      { colour: "#fdf8e6", width: 130 },
      { colour: "#f9e7a0", width: 80 },
    ];
    for (const band of bands) {
      ctx.strokeStyle = band.colour;
      ctx.lineWidth = band.width;
      glow.forEach((p) => trace(ctx, p));
    }

    // Marks that show where something is missing: a soft glow, drawn under the strokes.
    marks.forEach((p) => {
      ctx.fillStyle = "#f9e7a0";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#7a5c00";
      ctx.lineWidth = 5;
      ctx.setLineDash([14, 14]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // The guide: a dashed outline (stage T) or dots at the endpoints (stage E).
    ctx.strokeStyle = "#8e84d6";
    ctx.lineWidth = 8;
    ctx.setLineDash([22, 22]);
    guide.outline.forEach((p) => trace(ctx, p));
    ctx.setLineDash([]);
    ctx.fillStyle = "#8e84d6";
    guide.endpoints.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
      ctx.fill();
    });

    // Where to start, and which way to go.
    if (startDot) {
      ctx.fillStyle = "#2e8b6e";
      ctx.beginPath();
      ctx.arc(startDot.x, startDot.y, 24, 0, Math.PI * 2);
      ctx.fill();
    }
    if (arrow && arrowAt !== undefined && current.current === null) {
      // The arrow: a head with a short tail behind it, at `arrowAt` along the path.
      const head = along(arrow.path, arrowAt);
      ctx.strokeStyle = "#2e8b6e";
      ctx.fillStyle = "#2e8b6e";
      ctx.lineWidth = 10;
      ctx.beginPath();
      for (let d = Math.max(0, arrowAt - ARROW_TAIL); d <= arrowAt; d += 8) {
        const p = along(arrow.path, d).at;
        if (d === Math.max(0, arrowAt - ARROW_TAIL)) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.lineTo(head.at.x, head.at.y);
      ctx.stroke();
      ctx.translate(head.at.x, head.at.y);
      ctx.rotate(head.angle);
      ctx.beginPath();
      ctx.moveTo(30, 0);
      ctx.lineTo(-12, -24);
      ctx.lineTo(-12, 24);
      ctx.closePath();
      ctx.fill();
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
    }

    // The demonstration: each part drawn in turn.
    if (demonstration && demoProgress !== undefined) {
      const total = demonstration.reduce((sum, p) => sum + pathLength(p), 0);
      let budget = demoProgress * total;
      ctx.strokeStyle = "#23304a";
      ctx.lineWidth = 14;
      for (const part of demonstration) {
        if (budget <= 0) break;
        trace(ctx, part, budget);
        budget -= pathLength(part);
      }
      // A green dot shows where the drawing starts.
      const first = demonstration[0]?.[0];
      if (first) {
        ctx.fillStyle = "#2e8b6e";
        ctx.beginPath();
        ctx.arc(first.x, first.y, 22, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // The child's strokes, exactly as drawn. Dark ink, so the child's line stands
    // out over the lavender guide: 4:1 contrast, above the 3:1 that WCAG 2.2
    // (1.4.11 Non-text Contrast) asks for. The old blue (#3a4fa0) gave only 2.3:1.
    ctx.strokeStyle = "#23304a";
    ctx.lineWidth = 12;
    strokes.forEach((s) => trace(ctx, s.points));
    if (current.current) trace(ctx, current.current.points);
  }, []);

  // Keep the canvas sharp at any size, and repaint when it is resized.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const resize = () => {
      const side = canvas.clientWidth * (window.devicePixelRatio || 1);
      canvas.width = side;
      canvas.height = side;
      paint();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [paint]);

  // The arrow's trip is timed from when it first appears, or its reach
  // changes, and not from each repaint of the screen around it.
  let arrowReach: number | undefined = undefined;
  if (props.arrow !== undefined) {
    arrowReach = props.arrow.reach;
  }
  const arrowSince = useRef(0);
  useEffect(() => {
    arrowSince.current = performance.now();
  }, [arrowReach]);

  // Repaint when what should be shown changes, and run the demonstration or the arrow.
  useEffect(() => {
    if (!props.demonstration && arrowReach === undefined) return void paint();
    let frame = 0;
    const start = performance.now();
    const loop = (now: number) => {
      if (props.demonstration) {
        // The demonstration draws the shape once over DEMO_DRAW_MS, then keeps the
        // finished shape on screen until practice starts. It does not loop, so it
        // never starts drawing again just before the stage changes.
        const progress = (now - start) / DEMO_DRAW_MS;
        paint(Math.min(1, progress));
      } else if (arrowReach !== undefined) {
        const trip = (arrowReach / ARROW_SPEED) * 1000;
        const elapsed = (now - arrowSince.current) % (trip + ARROW_REST_MS);
        paint(undefined, Math.min(arrowReach, (elapsed / 1000) * ARROW_SPEED));
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [props.demonstration, arrowReach, props.startDot, props.guide, props.strokes, props.marks, props.glow, paint]);

  /** Maps a pointer position to drawing units, so a point keeps its place if the canvas is resized. */
  /** Maps a pointer position to drawing units, so a point keeps its place if the canvas is resized. */
  const toPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const unit = (v: number) => Math.round(v * CANVAS_UNITS * 10) / 10; // a tenth of a unit is finer than any screen
    return {
      x: unit((e.clientX - rect.left) / rect.width),
      y: unit((e.clientY - rect.top) / rect.height),
      t: Date.now(),
    };
  };

  /** Adds the pointer's position to the stroke being drawn. `last` is the point at the stylus lift. */
  const add = (e: React.PointerEvent<HTMLCanvasElement>, last = false) => {
    const stroke = current.current;
    if (!stroke) return;
    const p = toPoint(e);
    latest.current.onInput(p.t);
    // A position that is not on the drawing area cannot be mapped to it, and is left out (SAF-AHM-002).
    if (p.x < 0 || p.x > CANVAS_UNITS || p.y < 0 || p.y > CANVAS_UNITS) return;
    const before = stroke.points[stroke.points.length - 1];
    // The same position reported twice counts once (SAF-AHM-001). Positions
    // closer together than the eye can tell are thinned out, which keeps a
    // long drawing quick to check and small to save.
    if (before) {
      const moved = Math.hypot(p.x - before.x, p.y - before.y);
      if (moved === 0 || (moved < MIN_STEP && !last)) return;
    }
    stroke.points.push(p);
    paint();
  };

  // While the stylus is held down, even held still, the child is still
  // drawing: that is input, and the pause that ends an attempt must not run.
  useEffect(() => {
    const timer = setInterval(() => {
      if (pointerId.current !== null) latest.current.onInput(Date.now());
    }, HELD_INPUT_MS);
    return () => clearInterval(timer);
  }, []);

  // If the drawing area is switched off in the middle of a stroke, the
  // unfinished stroke is dropped. It belongs to no attempt.
  useEffect(() => {
    if (props.disabled && pointerId.current !== null) {
      current.current = null;
      pointerId.current = null;
      paint();
    }
  }, [props.disabled, paint]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Drawing area"
      className="aspect-square w-full rounded-3xl border-2 border-dashed border-line bg-white"
      onPointerDown={(e) => {
        if (props.disabled) return;
        const pen = e.pointerType === "pen";
        if (pen) penAt.current = Date.now();
        // A stylus wins over a resting palm: a touch is ignored while a stylus
        // is in use, and a stylus takes over from a touch already down.
        if (e.pointerType === "touch" && Date.now() - penAt.current < PALM_MS) return;
        if (pointerId.current !== null) {
          if (!pen) return; // one contact at a time
          current.current = null;
        }
        pointerId.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        current.current = { points: [] };
        add(e);
      }}
      onPointerMove={(e) => {
        if (e.pointerId !== pointerId.current) return;
        if (e.pointerType === "pen") penAt.current = Date.now();
        add(e);
      }}
      onPointerUp={(e) => {
        if (e.pointerId !== pointerId.current) return;
        add(e, true);
        pointerId.current = null;
        const stroke = current.current;
        current.current = null;
        // A contact that never touched the drawing area leaves no stroke.
        if (stroke && stroke.points.length > 0) props.onStroke(stroke);
        else paint();
      }}
      onPointerCancel={(e) => {
        if (e.pointerId !== pointerId.current) return;
        const wasDrawing = current.current !== null;
        current.current = null;
        pointerId.current = null;
        paint();
        if (wasDrawing) props.onCancel();
      }}
    />
  );
}
