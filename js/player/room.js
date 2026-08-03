import {
  ref, set, get, remove, onValue, onDisconnect,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import { db } from "../shared/firebase-init.js";
import { getState, setState } from "./state.js";
import { saveLastRoom, saveLastName, clearLastRoom } from "../shared/utils/storage.js";
import { showToast } from "../shared/components.js";
import { t } from "../shared/i18n.js";

let subscribedRoomId = null;
let roomUnsubscribers = [];
let answerUnsub = null;
let minigameResultUnsub = null;
let hadRealPublicData = false;
let roomClosedHandled = false;

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
  hadRealPublicData = false;
  roomClosedHandled = false;

  roomUnsubscribers.push(onValue(ref(db, `rooms/${roomId}/public`), (snap) => {
    const publicData = snap.val();
    if (!publicData) {
      // Room's gone (host closed it) — don't render a blank/broken screen, just tell the
      // player and back out. Delayed reload gives the toast time to be seen.
      if (hadRealPublicData && !roomClosedHandled) {
        roomClosedHandled = true;
        showToast(t("shared.toastRoomClosed"), true);
        setTimeout(() => leaveRoom(), 2000);
      }
      setState({ public: {}, phase: "lobby" });
      return;
    }
    hadRealPublicData = true;
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

// Reloads afterward rather than resetting state in place — the landing form's "joining room
// X" mode is a one-time check made at init(), not reactive, so a same-page reset would leave
// the join form stuck pointed at the room just left.
export async function leaveRoom() {
  const { roomId, uid } = getState();
  if (!roomId) return;

  try {
    await onDisconnect(ref(db, `rooms/${roomId}/players/${uid}/online`)).cancel();
    await remove(ref(db, `rooms/${roomId}/players/${uid}`));
  } catch {
    // Best-effort — still leave locally even if the write fails (e.g. offline).
  }

  clearLastRoom("player");
  window.location.href = window.location.pathname;
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
