export function init() {}

export function render(state) {
  if (state.phase !== "round-end") return;
  const myLives = state.lives?.[state.uid] ?? 0;
  const el = document.getElementById("my-lives");
  el.textContent = myLives > 0 ? `Lives left: ${"♥".repeat(myLives)}` : "You're out of lives.";
}
