import {
  ref, set, get, onValue, onDisconnect,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import { db } from "../shared/firebase-init.js";
import { getState, setState } from "./state.js";
import { saveLastRoom, saveLastName, clearLastRoom } from "../shared/utils/storage.js";

let subscribedRoomId = null;
let roomUnsubscribers = [];
let answerUnsub = null;
let minigameResultUnsub = null;

export function getRoomIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const room = params.get("room");
  return room ? room.toUpperCase() : null;
}

function setRoomInUrl(roomId) {
  const url = new URL(window.location.href);
  url.searchParams.set("room", roomId);
  window.history.replaceState({}, "", url);
}

export async function joinRoom(roomId, name) {
  const { uid } = getState();
  saveLastName(name);

  const publicSnap = await get(ref(db, `rooms/${roomId}/public`));
  if (!publicSnap.exists()) {
    throw new Error("ROOM_NOT_FOUND");
  }
  const publicData = publicSnap.val();

  const playerRef = ref(db, `rooms/${roomId}/players/${uid}`);
  const existingSnap = await get(playerRef);
  if (!existingSnap.exists() && publicData.phase !== "lobby") {
    throw new Error("ROOM_IN_PROGRESS");
  }

  await set(playerRef, {
    name,
    joinedAt: existingSnap.exists() ? existingSnap.val().joinedAt : Date.now(),
    online: true,
  });
  onDisconnect(ref(db, `rooms/${roomId}/players/${uid}/online`)).set(false);

  saveLastRoom("player", roomId);
  setRoomInUrl(roomId);
  setState({ roomId, name });
  subscribeToRoom(roomId);
  return roomId;
}

function unsubscribeFromRoom() {
  roomUnsubscribers.forEach((unsub) => unsub());
  roomUnsubscribers = [];
  if (answerUnsub) answerUnsub();
  if (minigameResultUnsub) minigameResultUnsub();
  answerUnsub = null;
  minigameResultUnsub = null;
  subscribedRoomId = null;
}

export function subscribeToRoom(roomId) {
  if (subscribedRoomId === roomId) return;
  if (subscribedRoomId !== null) unsubscribeFromRoom();
  subscribedRoomId = roomId;

  roomUnsubscribers.push(onValue(ref(db, `rooms/${roomId}/public`), (snap) => {
    const publicData = snap.val() || {};
    setState({ public: publicData, phase: publicData.phase || "lobby" });
  }));

  roomUnsubscribers.push(onValue(ref(db, `rooms/${roomId}/players`), (snap) => {
    setState({ players: snap.val() || {} });
  }));

  roomUnsubscribers.push(onValue(ref(db, `rooms/${roomId}/lives`), (snap) => {
    setState({ lives: snap.val() || {} });
  }));

  const { uid } = getState();
  answerUnsub = onValue(ref(db, `rooms/${roomId}/answers/${uid}`), (snap) => {
    setState({ myAnswer: snap.val() });
  });
  minigameResultUnsub = onValue(ref(db, `rooms/${roomId}/minigameResults/${uid}`), (snap) => {
    setState({ myMinigameResult: snap.val() });
  });
}

export async function rejoinLastRoomIfAny(roomId, name) {
  if (!roomId || !name) return null;
  try {
    return await joinRoom(roomId, name);
  } catch {
    clearLastRoom("player");
    return null;
  }
}
