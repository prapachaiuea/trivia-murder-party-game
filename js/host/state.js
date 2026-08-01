const state = {
  uid: null,
  roomId: null,
  phase: "setup", // setup | lobby | question | reveal | minigame | round-end | final
  public: null,
  players: {},
  lives: {},
  answers: {},
  minigameResults: {},
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
