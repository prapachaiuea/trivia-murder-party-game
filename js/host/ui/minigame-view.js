import { getState } from "../state.js";
import { revealFate, finishMinigameRound } from "../game.js";
import { serverNow } from "../../shared/utils/timer.js";
import { showToast } from "../../shared/components.js";

let initialized = false;

export function init() {
  if (initialized) return;
  initialized = true;

  document.getElementById("btn-reveal-fate").addEventListener("click", async (e) => {
    const { roomId, public: pub } = getState();
    e.target.disabled = true;
    try {
      if (pub?.fateRevealed) {
        await finishMinigameRound(roomId);
      } else {
        await revealFate(roomId);
      }
    } catch {
      showToast("Could not continue.", true);
    } finally {
      e.target.disabled = false;
    }
  });

  setInterval(tick, 250);
}

function tick() {
  const state = getState();
  if (state.phase !== "minigame") return;
  const statusEl = document.getElementById("minigame-status");
  if (!statusEl || state.public?.fateRevealed) return;

  const startAt = state.public?.minigameStartAt;
  if (!startAt) return;
  const remaining = startAt - serverNow();
  statusEl.textContent = remaining > 0 ? `Get ready… ${Math.ceil(remaining / 1000)}` : "Tap when you see green!";
}

export function render(state) {
  if (state.phase !== "minigame") return;

  const atRiskUids = Object.keys(state.public?.atRiskUids || {});
  const results = state.minigameResults || {};

  const list = document.getElementById("minigame-status-list");
  list.innerHTML = "";
  atRiskUids.forEach((uid) => {
    const li = document.createElement("li");
    li.textContent = state.players?.[uid]?.name || "?";
    const result = results[uid];
    li.className = result === "pass" ? "status-pass" : result === "fail" ? "status-fail" : "";
    list.appendChild(li);
  });

  const btn = document.getElementById("btn-reveal-fate");
  if (state.public?.fateRevealed) {
    document.getElementById("minigame-status").textContent = "Fate decided.";
    btn.textContent = "See the Tally";
  } else {
    btn.textContent = "Reveal Fate";
  }
}
