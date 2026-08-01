import { getState } from "../state.js";
import { advanceToReveal } from "../game.js";
import { loadTrivia } from "../../shared/trivia.js";
import { serverNow, formatCountdown } from "../../shared/utils/timer.js";
import { showToast } from "../../shared/components.js";

let initialized = false;
let hasAutoAdvanced = false;
let trivia = [];

export function init() {
  if (initialized) return;
  initialized = true;

  loadTrivia().then((data) => { trivia = data; });

  document.getElementById("btn-skip-question").addEventListener("click", async () => {
    const { roomId } = getState();
    try {
      await advanceToReveal(roomId);
    } catch {
      showToast("Could not reveal the answer.", true);
    }
  });

  setInterval(tick, 250);
}

function tick() {
  const state = getState();
  if (state.phase !== "question" || !state.public?.timer) return;
  const { startAt, durationMs } = state.public.timer;
  const remaining = startAt + durationMs - serverNow();
  const el = document.getElementById("question-countdown");
  if (el) el.textContent = formatCountdown(remaining);

  if (remaining <= 0 && !hasAutoAdvanced) {
    hasAutoAdvanced = true;
    advanceToReveal(state.roomId).catch(() => {});
  }
}

export function render(state) {
  if (state.phase !== "question") {
    hasAutoAdvanced = false;
    return;
  }

  document.getElementById("question-round-number").textContent =
    `Question ${state.public?.roundNumber ?? 1} of ${state.public?.totalRounds ?? 1}`;

  const q = trivia[state.public?.questionIndex];
  document.getElementById("question-text").textContent = q ? q.question : "";

  const optionList = document.getElementById("option-list");
  optionList.innerHTML = "";
  (q?.options || []).forEach((opt) => {
    const li = document.createElement("li");
    li.textContent = opt;
    optionList.appendChild(li);
  });

  const list = document.getElementById("question-status-list");
  list.innerHTML = "";
  const lives = state.lives || {};
  Object.entries(state.players || {}).forEach(([uid, p]) => {
    if ((lives[uid] ?? 3) <= 0) return; // eliminated players don't play
    const li = document.createElement("li");
    const done = state.answers?.[uid] !== undefined;
    li.textContent = p.name;
    li.className = done ? "status-done" : "";
    list.appendChild(li);
  });
}
