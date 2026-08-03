import { getState } from "../state.js";
import { backToLobby } from "../game.js";
import { showToast } from "../../shared/components.js";
import { renderCandle } from "./candle.js";
import { t, onLangChange } from "../../shared/i18n.js";

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
      showToast(t("final.toastFailed"), true);
    } finally {
      e.target.disabled = false;
    }
  });

  onLangChange(() => render(getState()));
}

export function render(state) {
  if (state.phase !== "final") return;

  const lives = state.lives || {};
  const players = state.players || {};
  const ranked = Object.entries(lives).sort((a, b) => b[1] - a[1]);
  const alive = ranked.filter(([, count]) => count > 0);

  document.getElementById("winner-name").textContent = alive.length === 1
    ? t("final.soleSurvivor", { name: players[alive[0][0]]?.name || "?" })
    : alive.length > 1
      ? t("final.mostLives", { name: players[alive[0][0]]?.name || "?" })
      : t("final.nobodyMadeIt");

  const list = document.getElementById("final-candle-row");
  list.innerHTML = "";
  ranked.forEach(([uid, count]) => {
    list.appendChild(renderCandle(players[uid]?.name || "?", count));
  });
}
