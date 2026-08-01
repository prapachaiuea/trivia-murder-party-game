const state = {
  uid: null,
  name: "",
  roomId: null,
  phase: "landing", // landing | lobby | question | reveal | minigame | round-end | final
  public: null,
  players: {},
  lives: {},
  myAnswer: null,
  myMinigameResult: null,
};

const listeners = new Set();

export function getState() {
  return state;
}

export function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
