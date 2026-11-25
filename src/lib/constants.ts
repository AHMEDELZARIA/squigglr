// The team-fixed values of the app, in one place so they are easy to find,
// to check against the SRS, and to change. Changing a value here changes it
// everywhere it is used.
//
// Not here:
// - the values an adult sets for each child (pass mark, attempt limits,
//   pauses): those are in lib/settings.ts, because they differ per child;
// - colours and sizes that only affect the look of a screen: those stay in
//   their component.

// ---------------------------------------------------------------------------
// The drawing area
// ---------------------------------------------------------------------------

/**
 * The drawing area is always this many units wide and tall, whatever the size
 * of the screen. A unit is a fraction of the canvas, not a pixel: 250 is a
 * quarter of the way across on any screen. Lessons, tolerances and saved
 * strokes all use these units.
 */
export const CANVAS_UNITS = 1000;

/** A quarter circle is drawn as this many short straight pieces. More pieces make a smoother curve. */
export const ARC_PIECES = 16;

// ---------------------------------------------------------------------------
// Scoring a drawing (lib/evaluation.ts)
// ---------------------------------------------------------------------------

/**
 * How far a stroke may be from the shape's line and still count as on it,
 * in percent of the diagonal of the box around the shape.
 * For the square (side 500, diagonal about 707) this is about 35 units.
 */
export const TRACE_TOL = 5;

/** How much of one part of the shape (for example one side) must be drawn for it to count, in percent. */
export const PART_COVER = 90;

/**
 * The least an attempt must have drawn, in total, to be judged at all: the
 * length of all its lines added up, in percent of the diagonal of the box
 * around the shape. Less than this (a tap or a tiny mark) is "too little to
 * judge": the attempt is not counted, and the child is asked to try again.
 * For the square (diagonal about 707) this is about 35 units.
 * The team's own choice, not taken from a source. It has the same value as
 * TRACE_TOL, but means something different, so the two can be changed apart.
 */
export const MIN_DRAWN = 5;

/**
 * With no guide, the smallest a drawing may be: its longer side, in percent of
 * the shape's longer side. Smaller than this and the attempt is not complete,
 * however neat.
 */
export const MIN_DRAW_SCALE = 40;

/**
 * With no guide, how much is left out at each end when finding the trimmed
 * box, in percent of the drawing's points. The x values are sorted and the
 * left and right edges are taken this far in from each end; the same for y.
 * A short stray mark only adds a few points at one end, so it is left out.
 * This value is the team's own choice, not taken from a source.
 */
export const TRIM_SHARE = 8;

/**
 * With no guide, the drawing is turned into points this many units apart
 * along each line before the boxes are found. Spacing them evenly means a
 * long line has more points than a short mark, whatever the drawing speed.
 */
export const SAMPLE_STEP = 12;

/**
 * The nudged fit may change the size of the drawing by at most this factor
 * compared with the trimmed-box fit: 1.05 is 5% bigger or smaller.
 * Without a limit, a square could be shrunk until it sat inside a circle's
 * tolerance band and passed the circle lesson.
 */
export const NUDGE_MAX_SCALE = 1.05;

/**
 * When nudging, a drawn point and a point of the shape are only paired up if
 * they are at most this many tolerances apart.
 */
export const NUDGE_REACH = 3;

/**
 * When measuring how much of one line lies near another, the line is checked
 * at points this many units apart. Smaller is more exact but slower.
 */
export const MEASURE_STEP = 4;

/**
 * With no guide, two strokes belong to the same group when they come this
 * close, in percent of the longer side of the whole drawing's box. Used to
 * find the main drawing and ignore a separate mark far away when fitting.
 */
export const GROUP_GAP = 10;

// ---------------------------------------------------------------------------
// The lesson rules
// ---------------------------------------------------------------------------

/** The most hints (a missing part glowing) one attempt gives before it ends. */
export const MAX_HINTS = 2;

/** Smallest rise in the average stage result, in points, that counts as improving. */
export const IMPROVE_MARGIN = 5;

// ---------------------------------------------------------------------------
// Timings (all in milliseconds)
// ---------------------------------------------------------------------------

/** How long the demonstration takes to draw the whole shape once. */
export const DEMO_DRAW_MS = 4000;

/** How long the finished shape stays on screen after the demonstration, before practice starts. */
export const DEMO_HOLD_MS = 1000;

/** How long the demonstration stage lasts in total, before practice starts by itself. */
export const DEMO_MS = DEMO_DRAW_MS + DEMO_HOLD_MS;

/** How long a passed attempt stays on screen with its feedback. */
export const SHOW_PASSED_MS = 2500;

/** How long an attempt that did not pass stays on screen with its feedback (there is more to look at). */
export const SHOW_NOT_PASSED_MS = 5000;

/** With only the dots to go by: how long with nothing drawn before the arrow goes all the way round. */
export const FULL_ARROW_MS = 8000;

/** For this long after a stylus touches the screen, finger and palm touches do not draw. */
export const PALM_MS = 1000;

/** How fast the arrow at the dots travels, in drawing units a second: slow enough for a young child to follow. */
export const ARROW_SPEED = 150;

/** How long the arrow rests at the end of its trip before setting off again. */
export const ARROW_REST_MS = 900;

/** While the stylus is held down, even held still, how often that counts as input (so the pause does not run). */
export const HELD_INPUT_MS = 250;

/** How often the lesson screen asks the lesson logic whether the child has paused (calls `tick`). */
export const TICK_MS = 500;
