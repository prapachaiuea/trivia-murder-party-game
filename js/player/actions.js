import { ref, set } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";
import { db } from "../shared/firebase-init.js";
import { getState } from "./state.js";

export async function submitAnswer(choiceIndex) {
  const { roomId, uid } = getState();
  await set(ref(db, `rooms/${roomId}/answers/${uid}`), choiceIndex);
}

export async function submitMinigameResult(result) {
  const { roomId, uid } = getState();
  await set(ref(db, `rooms/${roomId}/minigameResults/${uid}`), result);
}
