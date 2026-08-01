export function init() {}

export function render(state) {
  if (state.phase !== "final") return;
  const myLives = state.lives?.[state.uid] ?? 0;
  const el = document.getElementById("final-lives");
  el.textContent = myLives > 0 ? `You survived with ${"♥".repeat(myLives)}` : "You didn't make it out.";
}
