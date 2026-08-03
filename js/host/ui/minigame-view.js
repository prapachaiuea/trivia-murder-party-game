import { getState } from "../state.js";
import { revealFate, finishMinigameRound, computeMinigameLosers } from "../game.js";
import { serverNow } from "../../shared/utils/timer.js";
import { showToast } from "../../shared/components.js";
import { t, onLangChange } from "../../shared/i18n.js";

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
      showToast(t("shared.toastContinueFailed"), true);
    } finally {
      e.target.disabled = false;
    }
  });

  setInterval(tick, 250);
  onLangChange(() => render(getState()));
}

function tick() {
  const state = getState();
  if (state.phase !== "minigame") return;
  const statusEl = document.getElementById("minigame-status");
  if (!statusEl || state.public?.fateRevealed) return;

  const startAt = state.public?.minigameStartAt;
  if (!startAt) return;
  const remaining = startAt - serverNow();
  statusEl.textContent = remaining > 0
    ? t("minigame.getReadyCount", { n: Math.ceil(remaining / 1000) })
    : t("minigame.tapNowStatus");
}

export function render(state) {
  if (state.phase !== "minigame") return;

  const atRiskUids = Object.keys(state.public?.atRiskUids || {});
  const results = state.minigameResults || {};
  const fateRevealed = Boolean(state.public?.fateRevealed);
  // Before the reveal, each chip just shows that player's own submitted outcome. Once fate is
  // revealed, recompute the actual verdict — someone whose own attempt "passed" can still be
  // the one who loses a life for being the slowest of the group (see computeMinigameLosers).
  const losers = fateRevealed ? computeMinigameLosers(atRiskUids, results) : null;

  const type = state.public?.minigameType;
  const titleEl = document.getElementById("minigame-title");
  if (titleEl) titleEl.textContent = type ? t(`minigame.title.${type}`) : "";
  const ruleHintEl = document.getElementById("minigame-rule-hint");
  if (ruleHintEl) ruleHintEl.textContent = type ? t(`minigame.rule.${type}`) : "";

  const list = document.getElementById("minigame-status-list");
  list.innerHTML = "";
  atRiskUids.forEach((uid) => {
    const li = document.createElement("li");
    li.textContent = state.players?.[uid]?.name || "?";
    if (losers) {
      li.className = losers.has(uid) ? "status-fail" : "status-pass";
    } else {
      const outcome = results[uid]?.outcome;
      li.className = outcome === "pass" ? "status-pass" : outcome === "fail" ? "status-fail" : "";
    }
    list.appendChild(li);
  });

  const btn = document.getElementById("btn-reveal-fate");
  if (state.public?.fateRevealed) {
    document.getElementById("minigame-status").textContent = t("minigame.fateDecided");
    btn.textContent = t("minigame.seeTally");
  } else {
    btn.textContent = t("minigame.revealFate");
  }
}
