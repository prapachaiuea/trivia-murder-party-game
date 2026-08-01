import { getState } from "../state.js";
import { submitMinigameResult } from "../actions.js";
import { serverNow } from "../../shared/utils/timer.js";

const REACTION_WINDOW_MS = 1200;
const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 3500;

let initialized = false;
let runningForStartAt = null;
let gameState = "idle"; // idle | waiting | red | green | done
let timeoutIds = [];

export function init() {
  if (initialized) return;
  initialized = true;

  document.getElementById("tap-zone").addEventListener("click", onTap);
}

function clearScheduled() {
  timeoutIds.forEach((id) => clearTimeout(id));
  timeoutIds = [];
}

function schedule(fn, delay) {
  const id = setTimeout(fn, delay);
  timeoutIds.push(id);
  return id;
}

function onTap() {
  if (gameState === "red") {
    finish("fail", "Too early!");
  } else if (gameState === "green") {
    finish("pass", "You survived!");
  }
}

function finish(result, message) {
  if (gameState === "done") return;
  gameState = "done";
  clearScheduled();
  const circle = document.getElementById("tap-circle");
  if (circle) circle.className = `tap-circle is-result-${result}`;
  const statusEl = document.getElementById("tap-status");
  if (statusEl) statusEl.textContent = message;
  submitMinigameResult(result).catch(() => {});
}

function startLocalGame(startAt) {
  runningForStartAt = startAt;
  gameState = "waiting";
  clearScheduled();

  const circle = document.getElementById("tap-circle");
  const statusEl = document.getElementById("tap-status");
  if (circle) circle.className = "tap-circle";
  if (statusEl) statusEl.textContent = "Get ready…";

  const waitMs = Math.max(0, startAt - serverNow());
  schedule(() => {
    gameState = "red";
    if (statusEl) statusEl.textContent = "Wait for green…";
    const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
    schedule(() => {
      gameState = "green";
      if (circle) circle.classList.add("is-go");
      if (statusEl) statusEl.textContent = "TAP NOW!";
      schedule(() => {
        if (gameState === "green") finish("fail", "Too slow!");
      }, REACTION_WINDOW_MS);
    }, delay);
  }, waitMs);
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

  const startAt = state.public?.minigameStartAt;
  if (startAt && startAt !== runningForStartAt) {
    startLocalGame(startAt);
  }
}
