import { loadTrivia } from "../../shared/trivia.js";
import { playSuccess, playFail } from "../../shared/audio.js";

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
    textEl.textContent = "You're out of lives.";
    hintEl.textContent = "Watch the show as a spectator.";
    return;
  }

  const q = trivia[state.public?.questionIndex];
  const gotItRight = state.myAnswer === q?.correctIndex;

  if (gotItRight) {
    textEl.textContent = "Correct! You're safe this round.";
    hintEl.textContent = "Watch the others face the reflex trial.";
  } else {
    textEl.textContent = "Wrong answer.";
    hintEl.textContent = "Get ready — you'll need to survive the reflex trial.";
  }

  const roundNumber = state.public?.roundNumber;
  if (announcedForRound !== roundNumber) {
    announcedForRound = roundNumber;
    if (gotItRight) playSuccess(); else playFail();
  }
}
