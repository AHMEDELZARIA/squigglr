// M03 Audio Output. A soft chime when a step is done, a short tune when the
// lesson ends, and the helper's lines spoken aloud. Everything is made by
// the browser: there are no sound files. Lesson Control and the rules know
// nothing about sound; the lesson screen decides when to call these.

let context: AudioContext | null = null;
let on = true;

/** Whether sound is on. */
export function isEnabled(): boolean {
  return on;
}

/** Turns sound on or off, from the adult's "Helper talks" switch (NFR-UX-010). */
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
    if (context === null && typeof window.AudioContext !== "undefined") {
      context = new window.AudioContext();
    }
    if (context !== null) {
      void context.resume();
    }
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

/** One note of a tune. */
interface Note {
  /** In hertz. */
  frequency: number;
  /** Seconds from now. */
  at: number;
  /** Seconds. */
  length: number;
}

function play(notes: Note[]): void {
  if (!on || context === null) return;
  try {
    void context.resume();
    for (const n of notes) {
      note(n.frequency, n.at, n.length);
    }
  } catch {
    // Sound is a help, never a need.
  }
}

/** A step is done. */
export function chime(): void {
  play([
    { frequency: 784, at: 0, length: 0.35 },
    { frequency: 1047, at: 0.12, length: 0.5 },
  ]);
}

/** The lesson is over. */
export function tune(): void {
  play([
    { frequency: 523, at: 0, length: 0.3 },
    { frequency: 659, at: 0.15, length: 0.3 },
    { frequency: 784, at: 0.3, length: 0.3 },
    { frequency: 1047, at: 0.45, length: 0.7 },
  ]);
}

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
