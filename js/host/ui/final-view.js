import { getState } from "../state.js";
import { backToLobby } from "../game.js";
import { showToast } from "../../shared/components.js";
import { renderCandle } from "./candle.js";

let initialized = false;

export function init() {
  if (initialized) return;
  initialized = true;

  document.getElementById("btn-new-game").addEventListener("click", async (e) => {
    const { roomId } = getState();
    e.target.disabled = true;
    try {
      await backToLobby(roomId);
    } catch {
      showToast("Could not start a new game — check your connection.", true);
    } finally {
      e.target.disabled = false;
    }
  });
}

export function render(state) {
  if (state.phase !== "final") return;

  const lives = state.lives || {};
  const players = state.players || {};
  const ranked = Object.entries(lives).sort((a, b) => b[1] - a[1]);
  const alive = ranked.filter(([, count]) => count > 0);

  document.getElementById("winner-name").textContent = alive.length === 1
    ? `${players[alive[0][0]]?.name || "?"} is the sole survivor`
    : alive.length > 1
      ? `${players[alive[0][0]]?.name || "?"} survives with the most lives`
      : "Nobody made it out";

  const list = document.getElementById("final-candle-row");
  list.innerHTML = "";
  ranked.forEach(([uid, count]) => {
    list.appendChild(renderCandle(players[uid]?.name || "?", count));
  });
}
