import {
  ref, set, update, onValue,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import { db } from "../shared/firebase-init.js";
import { getState, setState } from "./state.js";
import { generateRoomCode } from "../shared/utils/id.js";
import { saveLastRoom, getLastRoom, clearLastRoom } from "../shared/utils/storage.js";

const MAX_CODE_ATTEMPTS = 5;
let subscribedRoomId = null;
let unsubscribers = [];

export async function createRoom() {
  const { uid } = getState();

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const roomId = generateRoomCode();
    try {
      // First-writer-wins per security rules: claims the room code, or fails on collision.
      await set(ref(db, `rooms/${roomId}/public/host`), uid);
    } catch {
      continue;
    }
    await update(ref(db, `rooms/${roomId}/public`), {
      createdAt: Date.now(),
      phase: "lobby",
      roundNumber: 0,
      totalRounds: 8,
      questionIndex: null,
      usedQuestionIndices: [],
      atRiskUids: null,
      timer: null,
      minigameStartAt: null,
    });

    saveLastRoom("host", roomId);
    setState({ roomId, isHost: true });
    subscribeToRoom(roomId);
    return roomId;
  }
  throw new Error("COULD_NOT_CREATE_ROOM");
}

export async function rejoinLastRoom() {
  const roomId = getLastRoom("host");
  if (!roomId) return null;

  const { uid } = getState();
  return new Promise((resolve) => {
    onValue(
      ref(db, `rooms/${roomId}/public/host`),
      (snap) => {
        if (snap.val() === uid) {
          setState({ roomId });
          subscribeToRoom(roomId);
          resolve(roomId);
        } else {
          clearLastRoom("host");
          resolve(null);
        }
      },
      { onlyOnce: true }
    );
  });
}

function unsubscribeFromRoom() {
  unsubscribers.forEach((unsub) => unsub());
  unsubscribers = [];
  subscribedRoomId = null;
}

// Reloads afterward for a clean slate — same reasoning as the player side. Doesn't touch
// the room itself (no reason to kick players just because the host stepped away from this
// screen; they can reopen the room via the saved link, or someone else's screen stays live).
export async function leaveRoom() {
  const { roomId } = getState();
  if (!roomId) return;
  clearLastRoom("host");
  window.location.href = window.location.pathname;
}

export function subscribeToRoom(roomId) {
  if (subscribedRoomId === roomId) return;
  if (subscribedRoomId !== null) unsubscribeFromRoom();
  subscribedRoomId = roomId;

  unsubscribers.push(onValue(ref(db, `rooms/${roomId}/public`), (snap) => {
    const publicData = snap.val() || {};
    setState({ public: publicData, phase: publicData.phase || "lobby" });
  }));

  unsubscribers.push(onValue(ref(db, `rooms/${roomId}/players`), (snap) => {
    setState({ players: snap.val() || {} });
  }));

  unsubscribers.push(onValue(ref(db, `rooms/${roomId}/lives`), (snap) => {
    setState({ lives: snap.val() || {} });
  }));

  unsubscribers.push(onValue(ref(db, `rooms/${roomId}/answers`), (snap) => {
    setState({ answers: snap.val() || {} });
  }));

  unsubscribers.push(onValue(ref(db, `rooms/${roomId}/minigameResults`), (snap) => {
    setState({ minigameResults: snap.val() || {} });
  }));
}
