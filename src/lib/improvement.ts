// M09 Improvement Measure. The measure is this module's secret, so a different
// way of deciding "improving" changes only this file.

/** Smallest rise in the average stage result that counts as improvement. */
export const IMPROVE_MARGIN = 5;

/**
 * True when the average of the last `window` results is at least
 * IMPROVE_MARGIN above the average of the `window` results before them.
 * False when there are fewer than 2 * window results.
 */
export function improving(history: number[], window: number): boolean {
  const m = history.length;
  if (m < 2 * window) return false;
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const recent = avg(history.slice(m - window));
  const before = avg(history.slice(m - 2 * window, m - window));
  return recent - before >= IMPROVE_MARGIN;
}
