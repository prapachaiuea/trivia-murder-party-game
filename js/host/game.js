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

// Every trial type shares the same fate-decision rule (see computeMinigameLosers below) —
// only how each player's own outcome/score gets produced differs, over in the player view.
export const MINIGAME_TYPES = ["reflex", "triple", "needle", "countdown", "mash", "memory"];
export const MEMORY_SEQUENCE_LENGTH = 5;
export const MEMORY_TILE_COUNT = 4;
const MINIGAME_DURATION_MS = {
  reflex: 7000,
  triple: 18000,
  needle: 9500,
  countdown: 16000,
  mash: 8000,
  memory: 13500,
};

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
    minigameType: null,
    minigameSeq: null,
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
  const type = MINIGAME_TYPES[Math.floor(Math.random() * MINIGAME_TYPES.length)];
  const startAt = serverNow() + MINIGAME_GO_DELAY_MS;

  await update(ref(db, `rooms/${roomId}/public`), {
    phase: "minigame",
    minigameType: type,
    // Generated host-side and broadcast so every player memorizes and gets tested on the
    // exact same sequence — otherwise the "memory" trial wouldn't be a fair comparison.
    minigameSeq: type === "memory"
      ? Array.from({ length: MEMORY_SEQUENCE_LENGTH }, () => Math.floor(Math.random() * MEMORY_TILE_COUNT))
      : null,
    minigameStartAt: startAt,
    timer: { startAt, durationMs: MINIGAME_DURATION_MS[type] },
  });
}

// No one was at risk this round (everyone alive answered correctly) — skip straight
// to the tally instead of showing an empty mini-game screen.
export async function skipMinigame(roomId) {
  await update(ref(db, `rooms/${roomId}/public`), { phase: "round-end", timer: null });
}

// Each player submits { outcome: "pass" | "fail", score }, where a lower score is always the
// better performance. Anyone who outright fails their own attempt (tapped early, never
// engaged, ran out the clock) loses a life no matter what anyone else did. On top of that,
// once there are 2+ people who *did* complete a valid attempt, the single worst-scoring one
// among them also loses — that's what guarantees someone's fate gets decided even when
// everybody technically "passes" the individual trial, instead of everyone surviving together.
// A lone successful attempt is never punished this way since there's nobody worse to compare
// it against.
export function computeMinigameLosers(atRiskUids, minigameResults) {
  const results = minigameResults || {};
  const losers = new Set();

  atRiskUids.forEach((uid) => {
    const r = results[uid];
    if (!r || r.outcome !== "pass") losers.add(uid);
  });

  const survivors = atRiskUids.filter((uid) => results[uid]?.outcome === "pass");
  if (survivors.length >= 2) {
    let worstUid = survivors[0];
    survivors.forEach((uid) => {
      if (results[uid].score > results[worstUid].score) worstUid = uid;
    });
    losers.add(worstUid);
  }

  return losers;
}

export async function revealFate(roomId) {
  const { public: pub, lives, minigameResults } = getState();
  const atRisk = Object.keys(pub.atRiskUids || {});
  const losers = computeMinigameLosers(atRisk, minigameResults);

  const lifeUpdates = {};
  losers.forEach((uid) => {
    lifeUpdates[`rooms/${roomId}/lives/${uid}`] = Math.max(0, (lives[uid] ?? 0) - 1);
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

// "New Game" previously just called location.reload(), which reconnects to the SAME room —
// still sitting in phase:'final' — so it silently reloaded back onto the finished scoreboard
// instead of actually starting anything new. Worse here than in the other games: startRound()
// only seeds a fresh STARTING_LIVES entry for uids that don't already have one, so without
// nulling lives, a second game would begin with last game's eliminated players still at 0
// lives. lives/answers/minigameResults all have parent-level write rules for the host (see
// firebase-rules.json), so nulling each directly here is safe. totalRounds and
// usedQuestionIndices are deliberately left alone: the question-count setting should persist,
// and keeping the used-question history means a second game with the same group won't
// immediately repeat trivia from the first one.
export async function backToLobby(roomId) {
  await set(ref(db, `rooms/${roomId}/lives`), null);
  await set(ref(db, `rooms/${roomId}/answers`), null);
  await set(ref(db, `rooms/${roomId}/minigameResults`), null);
  await update(ref(db, `rooms/${roomId}/public`), {
    phase: "lobby",
    roundNumber: 0,
    questionIndex: null,
    atRiskUids: null,
    timer: null,
    minigameStartAt: null,
    minigameType: null,
    minigameSeq: null,
    fateRevealed: false,
  });
}
