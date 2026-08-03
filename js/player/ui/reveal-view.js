import { getState } from "../state.js";
import { loadTrivia } from "../../shared/trivia.js";
import { playSuccess, playFail } from "../../shared/audio.js";
import { t, onLangChange } from "../../shared/i18n.js";

let initialized = false;
let trivia = [];

// Tracks which round the correct/wrong sound has already played for — render() fires on
// every state change, not just the reveal transition, so without this the cue would repeat
// on unrelated updates (another player's lives changing, etc.) while this screen is showing.
let announcedForRound = null;

export function init() {
  if (initialized) return;
  initialized = true;
  loadTrivia().then((data) => { trivia = data; });
  onLangChange(() => render(getState()));
}

export function render(state) {
  if (state.phase !== "reveal") {
    announcedForRound = null;
    return;
  }

  const myLives = state.lives?.[state.uid] ?? 3;
  const textEl = document.getElementById("reveal-result-text");
  const hintEl = document.getElementById("reveal-result-hint");

  if (myLives <= 0) {
    textEl.textContent = t("shared.outOfLives");
    hintEl.textContent = t("shared.watchSpectator");
    return;
  }

  const q = trivia[state.public?.questionIndex];
  const gotItRight = state.myAnswer === q?.correctIndex;

  if (gotItRight) {
    textEl.textContent = t("reveal.correctText");
    hintEl.textContent = t("reveal.correctHint");
  } else {
    textEl.textContent = t("reveal.wrongText");
    hintEl.textContent = t("reveal.wrongHint");
  }

  const roundNumber = state.public?.roundNumber;
  if (announcedForRound !== roundNumber) {
    announcedForRound = roundNumber;
    if (gotItRight) playSuccess(); else playFail();
  }
}
