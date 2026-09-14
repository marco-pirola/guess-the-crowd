/**
 * Tiny synthesized sound effects for game moments — plain oscillators/gain
 * envelopes via the Web Audio API, no audio files. Keeps this feature at
 * zero bundle-size cost and sidesteps any licensing question entirely (see
 * SoundContext.tsx for the enabled/disabled + persistence layer above this).
 *
 * Every export here is deliberately side-effect-only and failure-swallowing:
 * a missing AudioContext, a blocked autoplay policy, or any other Web Audio
 * error must never bubble up and affect gameplay (see AGENTS.md-adjacent
 * product rule: "sound failures must not affect gameplay").
 */

export type SoundName =
  | "answerLocked"
  | "everyoneAnswered"
  | "reveal"
  | "roundScore"
  | "action"
  | "finalResults"
  | "sliderTick";

interface ToneSpec {
  /** Seconds after the sound starts. */
  startOffset: number;
  /** Seconds this tone rings for. */
  duration: number;
  freq: number;
  /** If set, frequency glides from `freq` to this over `duration` (a quick sweep). */
  freqEnd?: number;
  type?: OscillatorType;
  peakGain?: number;
}

// Ordered from smallest/quietest to biggest/most celebratory — each event
// should be recognizably distinct from its neighbors, not just louder.
const SOUND_DEFINITIONS: Record<SoundName, ToneSpec[]> = {
  // A single short, dry click — confirms "your answer is locked in" without
  // drawing attention to itself.
  answerLocked: [{ startOffset: 0, duration: 0.055, freq: 720, type: "triangle", peakGain: 0.15 }],

  // Two quick ascending notes — a little brighter/more noticeable than the
  // plain click, but still a short notification, not a fanfare.
  everyoneAnswered: [
    { startOffset: 0, duration: 0.08, freq: 784.0, type: "sine", peakGain: 0.17 },
    { startOffset: 0.09, duration: 0.1, freq: 1046.5, type: "sine", peakGain: 0.18 },
  ],

  // A low "thump" layered under a quick upward sweep — reads as an impact/
  // unveil rather than a melodic note.
  reveal: [
    { startOffset: 0, duration: 0.09, freq: 130, type: "sine", peakGain: 0.22 },
    { startOffset: 0, duration: 0.14, freq: 260, freqEnd: 520, type: "triangle", peakGain: 0.2 },
  ],

  // A short three-note major arpeggio — the classic "reward" shape, kept
  // brief so it never overstays the moment.
  roundScore: [
    { startOffset: 0, duration: 0.09, freq: 523.25, type: "triangle", peakGain: 0.16 },
    { startOffset: 0.08, duration: 0.09, freq: 659.25, type: "triangle", peakGain: 0.17 },
    { startOffset: 0.16, duration: 0.13, freq: 783.99, type: "triangle", peakGain: 0.19 },
  ],

  // A single quiet descending blip — the app's standard action/navigation
  // sound: confirms a primary action (Play, Create/Join Room, Daily
  // Challenge, Next Round) without competing with the reveal/score sounds
  // either side of it.
  action: [{ startOffset: 0, duration: 0.07, freq: 520, freqEnd: 420, type: "sine", peakGain: 0.11 }],

  // A four-note ascending run that resolves into a held two-note chord —
  // longer and richer than roundScore's arpeggio so the very end of a game
  // reads as a distinct, bigger moment without turning into an actual jingle.
  finalResults: [
    { startOffset: 0, duration: 0.09, freq: 523.25, type: "triangle", peakGain: 0.18 },
    { startOffset: 0.09, duration: 0.09, freq: 659.25, type: "triangle", peakGain: 0.19 },
    { startOffset: 0.18, duration: 0.1, freq: 783.99, type: "triangle", peakGain: 0.2 },
    { startOffset: 0.28, duration: 0.24, freq: 1046.5, type: "triangle", peakGain: 0.22 },
    { startOffset: 0.28, duration: 0.24, freq: 784.0, type: "sine", peakGain: 0.14 },
  ],

  // The quietest, shortest sound in the whole system by design — a single
  // dry, high, near-instant click meant to read as tactile feedback on the
  // prediction slider's steps, not as a notification. Must never compete
  // with or be confused for answerLocked/reveal/etc.
  sliderTick: [{ startOffset: 0, duration: 0.02, freq: 1000, type: "square", peakGain: 0.05 }],
};

let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) {
    try {
      sharedContext = new Ctor();
    } catch {
      return null;
    }
  }
  return sharedContext;
}

/**
 * Best-effort unlock, meant to be called from inside a real user gesture
 * handler (a click/keydown) — never on its own at mount. Browsers only allow
 * `resume()` to actually take effect when it's called synchronously within
 * such a gesture; calling this early (e.g. on the very first pointerdown
 * anywhere on the page) gives a later, gesture-less sound — a Realtime
 * update from another player, say — the best chance of not being silently
 * blocked.
 */
export function primeAudioContext(): void {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      void ctx.resume().catch(() => {});
    }
  } catch {
    // Best-effort only.
  }
}

function scheduleTone(ctx: AudioContext, destination: AudioNode, tone: ToneSpec): void {
  const { startOffset, duration, freq, freqEnd, type = "sine", peakGain = 0.2 } = tone;
  const start = ctx.currentTime + startOffset;
  const end = start + duration;

  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (freqEnd !== undefined && freqEnd !== freq) {
    osc.frequency.linearRampToValueAtTime(freqEnd, end);
  }

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peakGain, start + Math.min(0.015, duration / 4));
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(start);
  osc.stop(end + 0.02);
}

/** Plays one short synthesized sound. Never throws — a blocked/unavailable AudioContext just means silence. */
export function playSoundEffect(name: SoundName): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => {});
    }
    const master = ctx.createGain();
    master.connect(ctx.destination);
    for (const tone of SOUND_DEFINITIONS[name]) {
      scheduleTone(ctx, master, tone);
    }
  } catch {
    // Web Audio unavailable/blocked — sound is best-effort only.
  }
}
