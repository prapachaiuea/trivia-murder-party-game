import { getState } from "../state.js";
import { submitMinigameResult } from "../actions.js";
import { serverNow } from "../../shared/utils/timer.js";
import { playSuccess, playFail } from "../../shared/audio.js";
import { t, onLangChange } from "../../shared/i18n.js";

// A large placeholder score for outright failures — never actually compared (the host only
// ranks entries whose outcome is "pass"), but the Firebase rule requires score to be a number.
const FAIL_SCORE = 999999;

const REFLEX_REACTION_WINDOW_MS = 1200;
const REFLEX_MIN_DELAY_MS = 1000;
const REFLEX_MAX_DELAY_MS = 3500;
const TRIPLE_ROUNDS = 3;

const NEEDLE_PERIOD_MS = 1400;
const NEEDLE_WINDOW_MS = 6000;

const COUNTDOWN_TARGET_MS = 5000;
const COUNTDOWN_START_WINDOW_MS = 3000;
const COUNTDOWN_MAX_HOLD_MS = 12000;

const MASH_WINDOW_MS = 4000;

const MEMORY_FLASH_ON_MS = 450;
const MEMORY_FLASH_OFF_MS = 250;
const MEMORY_INPUT_WINDOW_MS = 6000;

const PANEL_IDS = ["mg-reflex", "mg-triple", "mg-needle", "mg-countdown", "mg-mash", "mg-memory"];

let initialized = false;
let runningForStartAt = null;
let done = false;
let timeoutIds = [];
let rafId = null;

export function init() {
  if (initialized) return;
  initialized = true;
  onLangChange(() => render(getState()));
}

function clearScheduled() {
  timeoutIds.forEach((id) => clearTimeout(id));
  timeoutIds = [];
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function schedule(fn, delay) {
  const id = setTimeout(fn, delay);
  timeoutIds.push(id);
  return id;
}

function showPanel(type) {
  PANEL_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.hidden = id !== `mg-${type}`;
  });
}

// Every trial type's start function attaches its own click listeners to these persistent
// elements. Since a player can face several minigame rounds across one match, and each round
// calls the relevant start*() function fresh, listeners left over from an earlier round would
// otherwise keep firing alongside the current round's — cloning strips all of them so each
// round starts from a genuinely clean slate.
function resetListeners(ids) {
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.replaceWith(el.cloneNode(true));
  });
}

function setStatus(text) {
  const el = document.getElementById("tap-status");
  if (el) el.textContent = text;
}

// Shared by every trial: records the outcome, gives the player feedback, and disables further
// input. Only the first call sticks — a trial can only be won or lost once.
function finish(outcome, score, message) {
  if (done) return;
  done = true;
  clearScheduled();
  setStatus(message);
  if (outcome === "pass") playSuccess(); else playFail();
  submitMinigameResult(outcome, score).catch(() => {});
}

function startLocalGame(startAt, type, seq) {
  runningForStartAt = startAt;
  done = false;
  clearScheduled();
  resetListeners([
    "tap-zone", "triple-tap-zone", "needle-tap-btn", "countdown-btn", "mash-btn", "memory-grid",
  ]);
  showPanel(type);
  setStatus(t("minigame.getReady"));

  const waitMs = Math.max(0, startAt - serverNow());
  schedule(() => {
    if (type === "reflex") startReflex(1);
    else if (type === "triple") startReflex(TRIPLE_ROUNDS);
    else if (type === "needle") startNeedle();
    else if (type === "countdown") startCountdown();
    else if (type === "mash") startMash();
    else if (type === "memory") startMemory(seq);
  }, waitMs);
}

// --- Reflex / Triple Flash: wait for red, tap the instant it turns green. Triple runs the
// same single-flash routine several times back to back and averages the reaction times; a
// miss on any single flash ends the whole attempt immediately as a fail. ---
function startReflex(totalRounds) {
  const circleId = totalRounds > 1 ? "triple-tap-circle" : "tap-circle";
  const progressEl = document.getElementById("triple-progress");
  const times = [];
  let roundState = "waiting";

  const circle = document.getElementById(circleId);
  const zone = document.getElementById(totalRounds > 1 ? "triple-tap-zone" : "tap-zone");
  if (circle) circle.className = "tap-circle";

  function runRound(roundIndex) {
    if (progressEl) {
      progressEl.textContent = totalRounds > 1
        ? t("minigame.roundProgress", { n: roundIndex + 1, total: totalRounds })
        : "";
    }
    roundState = "waiting";
    if (circle) circle.className = "tap-circle";
    setStatus(t("minigame.getReady"));
    roundState = "red";
    setStatus(t("minigame.waitGreen"));

    const delay = REFLEX_MIN_DELAY_MS + Math.random() * (REFLEX_MAX_DELAY_MS - REFLEX_MIN_DELAY_MS);
    schedule(() => {
      const greenAt = performance.now();
      roundState = "green";
      if (circle) circle.classList.add("is-go");
      setStatus(t("minigame.tapNow"));

      const tapHandler = () => {
        if (roundState !== "green") return;
        const reactionMs = performance.now() - greenAt;
        times.push(reactionMs);
        roundState = "done";
        if (zone) zone.removeEventListener("click", tapHandler);
        if (roundIndex + 1 < totalRounds) {
          runRound(roundIndex + 1);
        } else {
          const avg = times.reduce((a, b) => a + b, 0) / times.length;
          finish("pass", avg, t("minigame.survived"));
        }
      };
      if (zone) zone.addEventListener("click", tapHandler);

      schedule(() => {
        if (roundState === "green") {
          if (zone) zone.removeEventListener("click", tapHandler);
          finish("fail", FAIL_SCORE, t("minigame.tooSlow"));
        }
      }, REFLEX_REACTION_WINDOW_MS);
    }, delay);
  }

  // Early taps (before green) fail immediately regardless of which round is running.
  const earlyTapHandler = () => {
    if (roundState === "red") finish("fail", FAIL_SCORE, t("minigame.tooEarly"));
  };
  if (zone) zone.addEventListener("click", earlyTapHandler);

  runRound(0);
}

// --- Needle Stop: a dot sweeps back and forth; tap STOP as close to dead-center as possible.
// Position is computed from elapsed time with a fixed period, so every player is scored against
// the exact same formula regardless of frame timing — the animation is just a visual aid. ---
function startNeedle() {
  const dot = document.getElementById("needle-dot");
  const btn = document.getElementById("needle-tap-btn");
  const startedAt = performance.now();
  let stopped = false;

  setStatus(t("minigame.needleInstruction"));

  function tick() {
    const elapsed = performance.now() - startedAt;
    const pos = Math.sin((2 * Math.PI * elapsed) / NEEDLE_PERIOD_MS); // -1..1, 0 = center
    if (dot) dot.style.transform = `translateX(${pos * 45}%)`;
    if (!stopped) rafId = requestAnimationFrame(tick);
  }
  rafId = requestAnimationFrame(tick);

  function onStop() {
    if (stopped) return;
    stopped = true;
    const elapsed = performance.now() - startedAt;
    const offset = Math.abs(Math.sin((2 * Math.PI * elapsed) / NEEDLE_PERIOD_MS));
    finish("pass", offset, offset < 0.15 ? t("minigame.needlePerfect") : t("minigame.needleDone"));
  }
  if (btn) btn.addEventListener("click", onStop);

  schedule(() => {
    if (!stopped) {
      stopped = true;
      finish("fail", FAIL_SCORE, t("minigame.tooSlow"));
    }
  }, NEEDLE_WINDOW_MS);
}

// --- Blind Countdown: start, then stop when you think exactly 5 seconds have passed — no
// visible timer. Score is how far off (in ms) the guess was; must start within a few seconds
// of "go" and stop within a generous window after that, or it's an automatic fail. ---
function startCountdown() {
  const btn = document.getElementById("countdown-btn");
  const display = document.getElementById("countdown-display");
  let phase = "ready";
  let startedAt = null;

  setStatus(t("minigame.countdownInstructionStart"));
  if (display) display.textContent = "?";
  if (btn) {
    btn.textContent = t("minigame.startTimer");
    btn.disabled = false;
  }

  function onClick() {
    if (phase === "ready") {
      phase = "running";
      startedAt = performance.now();
      if (btn) btn.textContent = t("minigame.stopTimer");
      setStatus(t("minigame.countdownInstructionStop"));
    } else if (phase === "running") {
      phase = "done";
      const elapsed = performance.now() - startedAt;
      const diff = Math.abs(elapsed - COUNTDOWN_TARGET_MS);
      if (btn) btn.disabled = true;
      finish("pass", diff, t("minigame.countdownResult", { s: (elapsed / 1000).toFixed(2) }));
    }
  }
  if (btn) btn.addEventListener("click", onClick);

  schedule(() => {
    if (phase === "ready") {
      if (btn) btn.disabled = true;
      finish("fail", FAIL_SCORE, t("minigame.tooSlow"));
    }
  }, COUNTDOWN_START_WINDOW_MS);

  schedule(() => {
    if (phase === "running") {
      if (btn) btn.disabled = true;
      finish("fail", FAIL_SCORE, t("minigame.tooSlow"));
    }
  }, COUNTDOWN_START_WINDOW_MS + COUNTDOWN_MAX_HOLD_MS);
}

// --- Mash: tap as many times as possible before the window closes. Fewest taps loses. ---
function startMash() {
  const btn = document.getElementById("mash-btn");
  const countEl = document.getElementById("mash-count");
  let count = 0;
  let open = true;

  if (countEl) countEl.textContent = "0";
  if (btn) btn.disabled = false;
  setStatus(t("minigame.mashInstruction"));

  function onClick() {
    if (!open) return;
    count += 1;
    if (countEl) countEl.textContent = String(count);
  }
  if (btn) btn.addEventListener("click", onClick);

  schedule(() => {
    open = false;
    if (btn) btn.disabled = true;
    if (count > 0) {
      finish("pass", -count, t("minigame.mashResult", { n: count }));
    } else {
      finish("fail", FAIL_SCORE, t("minigame.mashResult", { n: count }));
    }
  }, MASH_WINDOW_MS);
}

// --- Memory: watch a flashing sequence, then tap the tiles back in the same order. Getting
// further into the sequence before a mistake (or finishing it) beats a shorter correct streak. ---
function startMemory(seq) {
  const tiles = Array.from(document.querySelectorAll("#memory-grid .memory-tile"));
  const progressEl = document.getElementById("memory-progress");
  let correctStreak = 0;
  let acceptingInput = false;

  setStatus(t("minigame.memoryWatch"));
  if (progressEl) progressEl.textContent = "";

  seq.forEach((tileIndex, i) => {
    const onAt = i * (MEMORY_FLASH_ON_MS + MEMORY_FLASH_OFF_MS);
    schedule(() => {
      const tile = tiles[tileIndex];
      if (tile) tile.classList.add("is-flash");
      schedule(() => {
        if (tile) tile.classList.remove("is-flash");
      }, MEMORY_FLASH_ON_MS);
    }, onAt);
  });

  const playbackDuration = seq.length * (MEMORY_FLASH_ON_MS + MEMORY_FLASH_OFF_MS);
  schedule(() => {
    acceptingInput = true;
    setStatus(t("minigame.memoryRepeat"));
    if (progressEl) progressEl.textContent = t("minigame.memoryProgress", { n: correctStreak, total: seq.length });
  }, playbackDuration);

  function onTileClick(tileIndex) {
    if (!acceptingInput || done) return;
    if (tileIndex === seq[correctStreak]) {
      correctStreak += 1;
      if (progressEl) progressEl.textContent = t("minigame.memoryProgress", { n: correctStreak, total: seq.length });
      if (correctStreak === seq.length) {
        acceptingInput = false;
        finish("pass", -correctStreak, t("minigame.memoryComplete"));
      }
    } else {
      acceptingInput = false;
      if (correctStreak === 0) {
        finish("fail", FAIL_SCORE, t("minigame.memoryFail"));
      } else {
        finish("pass", -correctStreak, t("minigame.memoryPartial", { n: correctStreak }));
      }
    }
  }
  tiles.forEach((tile, i) => {
    tile.addEventListener("click", () => onTileClick(i));
  });

  schedule(() => {
    if (!done) {
      acceptingInput = false;
      if (correctStreak === 0) {
        finish("fail", FAIL_SCORE, t("minigame.tooSlow"));
      } else {
        finish("pass", -correctStreak, t("minigame.memoryPartial", { n: correctStreak }));
      }
    }
  }, playbackDuration + MEMORY_INPUT_WINDOW_MS);
}

export function render(state) {
  if (state.phase !== "minigame") return;

  const myLives = state.lives?.[state.uid] ?? 3;
  const atRisk = document.getElementById("minigame-at-risk");
  const spectator = document.getElementById("minigame-spectator");
  const eliminated = document.getElementById("minigame-eliminated");

  if (myLives <= 0) {
    atRisk.hidden = true;
    spectator.hidden = true;
    eliminated.hidden = false;
    return;
  }
  eliminated.hidden = true;

  const iAmAtRisk = Boolean(state.public?.atRiskUids?.[state.uid]);
  if (!iAmAtRisk) {
    atRisk.hidden = true;
    spectator.hidden = false;
    return;
  }
  spectator.hidden = true;
  atRisk.hidden = false;

  const type = state.public?.minigameType || "reflex";
  const eyebrow = document.getElementById("minigame-eyebrow");
  if (eyebrow) eyebrow.textContent = t(`minigame.instruction.${type}`);

  const startAt = state.public?.minigameStartAt;
  if (startAt && startAt !== runningForStartAt) {
    startLocalGame(startAt, type, state.public?.minigameSeq || []);
  }
}
