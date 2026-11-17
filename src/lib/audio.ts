// M03 Audio Output. A soft chime when a step is done, a short tune when the
// lesson ends, and the helper's lines spoken aloud. Everything is made by
// the browser: there are no sound files. Lesson Control and the rules know
// nothing about sound; the lesson screen decides when to call these.

let context: AudioContext | null = null;
let on = true;

/** Turns sound on or off, from the learner's audio setting (NFR-UX-010). */
export function setEnabled(enabled: boolean): void {
  on = enabled;
  if (!enabled && typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}

/**
 * Browsers only allow sound after a tap. Call this from a tap (the adult's
 * "Start lesson") so the lesson can make sound from then on.
 */
export function unlock(): void {
  try {
    const Ctx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!context && Ctx) context = new Ctx();
    void context?.resume();
    // An empty line wakes the browser's voice, which also needs a tap first.
    if (typeof speechSynthesis !== "undefined") speechSynthesis.speak(new SpeechSynthesisUtterance(""));
  } catch {
    // No sound on this device. The lesson works without it.
  }
}

/** One soft note. `at` is seconds from now. */
function note(frequency: number, at: number, length: number): void {
  if (!context) return;
  const start = context.currentTime + at;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, start + length);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + length);
}

function play(notes: [frequency: number, at: number, length: number][]): void {
  if (!on) return;
  try {
    void context?.resume();
    notes.forEach((n) => note(...n));
  } catch {
    // Sound is a help, never a need.
  }
}

/** A step is done. */
export const chime = () =>
  play([
    [784, 0, 0.35],
    [1047, 0.12, 0.5],
  ]);

/** The lesson is over. */
export const tune = () =>
  play([
    [523, 0, 0.3],
    [659, 0.15, 0.3],
    [784, 0.3, 0.3],
    [1047, 0.45, 0.7],
  ]);

/** Says one of the helper's lines, in place of whatever it was saying. */
export function say(text: string): void {
  if (!on || typeof speechSynthesis === "undefined") return;
  try {
    speechSynthesis.cancel();
    const line = new SpeechSynthesisUtterance(text);
    line.rate = 0.9;
    line.pitch = 1.2;
    speechSynthesis.speak(line);
  } catch {
    // The text is still on screen.
  }
}

/** Stops anything being said, for when the lesson screen is left. */
export function hush(): void {
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}
