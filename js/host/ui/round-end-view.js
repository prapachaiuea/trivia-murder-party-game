import { getState } from "../state.js";
import { proceedAfterRoundEnd } from "../game.js";
import { showToast } from "../../shared/components.js";
import { renderCandle } from "./candle.js";

let initialized = false;

export function init() {
  if (initialized) return;
  initialized = true;

  document.getElementById("btn-proceed").addEventListener("click", async (e) => {
    const { roomId } = getState();
    e.target.disabled = true;
    try {
      await proceedAfterRoundEnd(roomId);
    } catch {
      showToast("Could not continue.", true);
    } finally {
      e.target.disabled = false;
    }
  });
}

export function render(state) {
  if (state.phase !== "round-end") return;

  const lives = state.lives || {};
  const players = state.players || {};
  const ranked = Object.entries(lives).sort((a, b) => b[1] - a[1]);

  const list = document.getElementById("candle-tally");
  list.innerHTML = "";
  ranked.forEach(([uid, count]) => {
    list.appendChild(renderCandle(players[uid]?.name || "?", count));
  });

  const alive = ranked.filter(([, count]) => count > 0);
  const outOfQuestions = (state.public?.roundNumber ?? 0) >= (state.public?.totalRounds ?? 0);

  const btn = document.getElementById("btn-proceed");
  btn.hidden = false;
  btn.textContent = alive.length <= 1 || outOfQuestions ? "See Final Results" : "Next Question";
}
