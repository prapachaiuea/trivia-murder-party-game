// namespace ("host" | "player") keeps the two apps' remembered sessions from colliding
// when both are opened in the same browser (e.g. testing solo across two tabs).
export function saveLastRoom(namespace, roomId) {
  localStorage.setItem(`triviamurder:${namespace}:lastRoomId`, roomId);
}

export function getLastRoom(namespace) {
  return localStorage.getItem(`triviamurder:${namespace}:lastRoomId`);
}

export function clearLastRoom(namespace) {
  localStorage.removeItem(`triviamurder:${namespace}:lastRoomId`);
}

export function saveLastName(name) {
  localStorage.setItem("triviamurder:player:lastName", name);
}

export function getLastName() {
  return localStorage.getItem("triviamurder:player:lastName") || "";
}
