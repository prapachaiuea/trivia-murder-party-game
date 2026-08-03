import { getState } from "../state.js";
import { startMinigame, skipMinigame } from "../game.js";
import { loadTrivia } from "../../shared/trivia.js";
import { showToast } from "../../shared/components.js";
import { t, onLangChange } from "../../shared/i18n.js";

let initialized = false;
let trivia = [];

export function init() {
  if (initialized) return;
  initialized = true;

  loadTrivia().then((data) => { trivia = data; });

  document.getElementById("btn-start-minigame").addEventListener("click", async (e) => {
    const { roomId, public: pub } = getState();
    const hasAtRisk = Boolean(pub?.atRiskUids);
    e.target.disabled = true;
    try {
      if (hasAtRisk) await startMinigame(roomId);
      else await skipMinigame(roomId);
    } catch {
      showToast(t("shared.toastContinueFailed"), true);
    } finally {
      e.target.disabled = false;
    }
  });

  onLangChange(async () => {
    trivia = await loadTrivia();
    render(getState());
  });
}

export function render(state) {
  if (state.phase !== "reveal") return;

  const q = trivia[state.public?.questionIndex];
  document.getElementById("reveal-answer").textContent = q ? q.options[q.correctIndex] : "";

  const atRiskUids = state.public?.atRiskUids || {};
  const list = document.getElementById("reveal-status-list");
  list.innerHTML = "";
  const lives = state.lives || {};
  Object.entries(state.players || {}).forEach(([uid, p]) => {
    if ((lives[uid] ?? 3) <= 0) return;
    const li = document.createElement("li");
    li.textContent = p.name;
    li.className = atRiskUids[uid] ? "status-wrong" : "status-correct";
    list.appendChild(li);
  });

  const hasAtRisk = Object.keys(atRiskUids).length > 0;
  document.getElementById("reveal-hint").textContent = hasAtRisk
    ? t("reveal.hintAtRisk")
    : t("reveal.hintSafe");
  document.getElementById("btn-start-minigame").textContent = hasAtRisk
    ? t("reveal.startTrial")
    : t("reveal.continue");
}
