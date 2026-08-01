// Procedural background music + UI sound effects, generated entirely with the Web Audio
// API — no external audio files to source, license, or host. Shared by both the host
// screen and player consoles, but only the HOST calls updateForState() for the looping
// ambient bed — every phone in the room independently looping the same pad/pulse out of
// sync with each other and the TV speaker would be a mess. Players only get the one-shot
// SFX (playClick/playSuccess/playFail), which is safe for every device to play locally.

const MUTE_KEY = "triviamurder:musicMuted";

let ctx = null;
let masterGain = null;
let unlocked = false;
let muted = localStorage.getItem(MUTE_KEY) === "1";

let activeScene = null; // { stop(fadeMs) }
let currentSceneKey = null;
let lastPhase = null;
let tensionTimerId = null;
let currentTimerSnapshot = null; // { startAt, durationMs, serverNow } while the question clock runs

function ensureContext() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = ctx.createGain();
  masterGain.gain.value = muted ? 0 : 0.35;
  masterGain.connect(ctx.destination);
}

// Must be called synchronously from inside a real user-gesture handler (click/submit) —
// browsers block audio until one fires. Safe to call repeatedly; only does real work once.
export function unlockAudio() {
  ensureContext();
  if (ctx.state === "suspended") ctx.resume();
  unlocked = true;
}

export function isMuted() {
  return muted;
}

export function setMuted(next) {
  muted = next;
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  if (masterGain) {
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.35, ctx.currentTime + 0.3);
  }
}

function noteEnvelope(freq, { start, duration, peak = 0.18, type = "sine", destination }) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + duration * 0.15);
  gain.gain.linearRampToValueAtTime(0, start + duration);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

// A slow-breathing pad: detuned oscillators under a shared gain that gently swells via an
// LFO — used for the calm screens (lobby, reveal, round-end).
function startPad(freqs, { type = "sine", swell = 4 } = {}) {
  const sceneGain = ctx.createGain();
  sceneGain.gain.value = 0;
  sceneGain.connect(masterGain);

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 1 / swell;
  lfoGain.gain.value = 0.06;
  lfo.connect(lfoGain);
  lfoGain.connect(sceneGain.gain);
  lfo.start();

  const oscs = freqs.map((f) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = f;
    osc.connect(sceneGain);
    osc.start();
    return osc;
  });

  sceneGain.gain.setTargetAtTime(0.13, ctx.currentTime, 0.6);

  return {
    stop(fadeMs = 800) {
      const t = ctx.currentTime;
      sceneGain.gain.cancelScheduledValues(t);
      sceneGain.gain.setTargetAtTime(0, t, fadeMs / 3000);
      lfo.stop(t + fadeMs / 1000 + 0.5);
      oscs.forEach((o) => o.stop(t + fadeMs / 1000 + 0.5));
    },
  };
}

// A rhythmic pulse cycling through a short note pattern. `getBpm` is re-read on every beat
// so the question countdown can ramp tempo as the clock runs down; the minigame trial passes
// a fixed high BPM instead since its window is too short for a ramp to register.
function startPulse(freqs, { getBpm, type = "triangle" } = {}) {
  const sceneGain = ctx.createGain();
  sceneGain.gain.value = 0;
  sceneGain.connect(masterGain);
  sceneGain.gain.setTargetAtTime(0.16, ctx.currentTime, 0.4);

  let stopped = false;
  let i = 0;
  function beat() {
    if (stopped) return;
    const bpm = getBpm();
    const noteDur = 60 / bpm;
    noteEnvelope(freqs[i % freqs.length], {
      start: ctx.currentTime,
      duration: noteDur * 0.85,
      peak: 0.22,
      type,
      destination: sceneGain,
    });
    i += 1;
    tensionTimerId = setTimeout(beat, noteDur * 1000);
  }
  beat();

  return {
    stop(fadeMs = 500) {
      stopped = true;
      clearTimeout(tensionTimerId);
      const t = ctx.currentTime;
      sceneGain.gain.cancelScheduledValues(t);
      sceneGain.gain.setTargetAtTime(0, t, fadeMs / 3000);
    },
  };
}

// A single resolving chord, not looped — for the final results screen.
function playSting(freqs, { type = "sine", duration = 1.6 } = {}) {
  const stingGain = ctx.createGain();
  stingGain.connect(masterGain);
  const t = ctx.currentTime;
  freqs.forEach((f, idx) => {
    noteEnvelope(f, { start: t + idx * 0.04, duration, peak: 0.2, type, destination: stingGain });
  });
}

// Short one-shot UI feedback, safe for every device (host or player) to play locally.
// playClick() is meant to be wired to a single delegated listener covering every button.
export function playClick() {
  if (!unlocked) return;
  ensureContext();
  noteEnvelope(720, { start: ctx.currentTime, duration: 0.06, peak: 0.12, type: "square", destination: masterGain });
}

export function playSuccess() {
  if (!unlocked) return;
  ensureContext();
  const t = ctx.currentTime;
  noteEnvelope(523.25, { start: t, duration: 0.12, peak: 0.18, type: "sine", destination: masterGain });
  noteEnvelope(783.99, { start: t + 0.09, duration: 0.18, peak: 0.18, type: "sine", destination: masterGain });
}

export function playFail() {
  if (!unlocked) return;
  ensureContext();
  const t = ctx.currentTime;
  noteEnvelope(220.0, { start: t, duration: 0.16, peak: 0.16, type: "sawtooth", destination: masterGain });
  noteEnvelope(174.61, { start: t + 0.1, duration: 0.22, peak: 0.16, type: "sawtooth", destination: masterGain });
}

function questionTensionBpm() {
  if (!currentTimerSnapshot) return 100;
  const { startAt, durationMs, serverNow } = currentTimerSnapshot;
  const remaining = startAt + durationMs - serverNow();
  if (remaining < 5000) return 176;
  if (remaining < 10000) return 140;
  return 104;
}

const SCENES = {
  // F2 clashing against F#2 a half-step away creates a fast, rough beating — genuinely
  // "wrong" sounding rather than moody, which is what a horror game-show calls for.
  ambient: () => startPad([87.31, 92.5, 130.81], { type: "triangle", swell: 8 }), // F2(clash)-F#2-C3
  tension: () => startPulse([293.66, 415.3, 493.88, 587.33], { type: "sawtooth", getBpm: questionTensionBpm }), // D4-Ab4-B4-D5, tritone dread
  minigame: () => startPulse([293.66, 329.63, 349.23, 440.0], { type: "sawtooth", getBpm: () => 172 }),
};

function sceneKeyForPhase(phase) {
  if (phase === "question") return "tension";
  if (phase === "minigame") return "minigame";
  return "ambient"; // setup, lobby, reveal, round-end, final
}

// Called from the same state-subscription that already drives routing/rendering, HOST ONLY.
// Only acts on an actual phase change (not every Firebase snapshot) so it never restarts
// mid-loop.
export function updateForState(state, { serverNow } = {}) {
  if (!unlocked) return;
  ensureContext();

  const activePhase = state.roomId ? state.phase : "setup";

  currentTimerSnapshot =
    activePhase === "question" && state.public?.timer && serverNow
      ? { ...state.public.timer, serverNow }
      : null;

  if (activePhase === lastPhase) return;
  lastPhase = activePhase;

  if (activePhase === "final") playSting([92.5, 110.0, 138.59, 185.0], { duration: 2.0, type: "sine" }); // F#2-A2-C#3-F#3

  const sceneKey = sceneKeyForPhase(activePhase);
  if (sceneKey !== currentSceneKey) {
    if (activeScene) activeScene.stop();
    activeScene = SCENES[sceneKey]();
    currentSceneKey = sceneKey;
  }
}
