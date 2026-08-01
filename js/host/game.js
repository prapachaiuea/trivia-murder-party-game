import { ref, set, update } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import { db } from "../shared/firebase-init.js";
import { getState } from "./state.js";
import { shuffle } from "../shared/utils/id.js";
import { loadTrivia } from "../shared/trivia.js";
import { serverNow } from "../shared/utils/timer.js";

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;
export const STARTING_LIVES = 3;
export const QUESTION_DURATION_MS = 15000;
export const MINIGAME_GO_DELAY_MS = 3000;
export const MINIGAME_WINDOW_MS = 7000;

function alivePlayerUids(players, lives) {
  return Object.keys(players).filter((uid) => (lives[uid] ?? STARTING_LIVES) > 0);
}

export async function setTotalRounds(roomId, totalRounds) {
  await update(ref(db, `rooms/${roomId}/public`), { totalRounds });
}

export async function startRound(roomId) {
  const { players, public: pub, lives } = getState();
  const uids = Object.keys(players);
  if (uids.length < MIN_PLAYERS) throw new Error("NOT_ENOUGH_PLAYERS");
  if (uids.length > MAX_PLAYERS) throw new Error("TOO_MANY_PLAYERS");

  const trivia = await loadTrivia();
  const used = pub?.usedQuestionIndices || [];
  const available = trivia.map((_, i) => i).filter((i) => !used.includes(i));
  const pool = shuffle(available.length > 0 ? available : trivia.map((_, i) => i));
  const questionIndex = pool[0];

  const liveUpdates = {};
  uids.forEach((uid) => {
    if (lives[uid] === undefined) liveUpdates[`rooms/${roomId}/lives/${uid}`] = STARTING_LIVES;
  });

  await set(ref(db, `rooms/${roomId}/answers`), null);
  await set(ref(db, `rooms/${roomId}/minigameResults`), null);
  if (Object.keys(liveUpdates).length > 0) await update(ref(db), liveUpdates);

  await update(ref(db, `rooms/${roomId}/public`), {
    phase: "question",
    roundNumber: (pub?.roundNumber || 0) + 1,
    questionIndex,
    usedQuestionIndices: [...used, questionIndex],
    atRiskUids: null,
    minigameStartAt: null,
    timer: { startAt: Date.now(), durationMs: QUESTION_DURATION_MS },
  });
}

// Marks anyone alive who answered wrong (or didn't answer) as "at risk" — they'll need
// to survive the mini-game next, or lose a life.
export async function advanceToReveal(roomId) {
  const { players, lives, answers, public: pub } = getState();
  const trivia = await loadTrivia();
  const question = trivia[pub.questionIndex];
  const alive = alivePlayerUids(players, lives);

  const atRiskUids = {};
  alive.forEach((uid) => {
    if (answers[uid] !== question.correctIndex) atRiskUids[uid] = true;
  });

  await update(ref(db, `rooms/${roomId}/public`), {
    phase: "reveal",
    atRiskUids: Object.keys(atRiskUids).length > 0 ? atRiskUids : null,
    timer: null,
  });
}

export async function startMinigame(roomId) {
  await set(ref(db, `rooms/${roomId}/minigameResults`), null);
  const startAt = serverNow() + MINIGAME_GO_DELAY_MS;
  await update(ref(db, `rooms/${roomId}/public`), {
    phase: "minigame",
    minigameStartAt: startAt,
    timer: { startAt, durationMs: MINIGAME_WINDOW_MS },
  });
}

// No one was at risk this round (everyone alive answered correctly) — skip straight
// to the tally instead of showing an empty mini-game screen.
export async function skipMinigame(roomId) {
  await update(ref(db, `rooms/${roomId}/public`), { phase: "round-end", timer: null });
}

export async function revealFate(roomId) {
  const { public: pub, lives, minigameResults } = getState();
  const atRisk = Object.keys(pub.atRiskUids || {});

  const lifeUpdates = {};
  atRisk.forEach((uid) => {
    if (minigameResults[uid] !== "pass") {
      lifeUpdates[`rooms/${roomId}/lives/${uid}`] = Math.max(0, (lives[uid] ?? 0) - 1);
    }
  });

  if (Object.keys(lifeUpdates).length > 0) await update(ref(db), lifeUpdates);
  await update(ref(db, `rooms/${roomId}/public`), { fateRevealed: true, timer: null });
}

export async function finishMinigameRound(roomId) {
  await update(ref(db, `rooms/${roomId}/public`), { phase: "round-end", fateRevealed: false });
}

export async function proceedAfterRoundEnd(roomId) {
  const { public: pub, players, lives } = getState();
  const alive = alivePlayerUids(players, lives);
  const outOfQuestions = pub.roundNumber >= pub.totalRounds;

  if (alive.length <= 1 || outOfQuestions) {
    await update(ref(db, `rooms/${roomId}/public`), { phase: "final" });
  } else {
    await startRound(roomId);
  }
}
