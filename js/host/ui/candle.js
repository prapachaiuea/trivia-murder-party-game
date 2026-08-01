// Shared by lobby/round-end/final views — one candle per player, snuffed out at 0 lives.
// Player names are untrusted input, so this builds nodes directly rather than via innerHTML.
export function renderCandle(name, lives) {
  const li = document.createElement("li");
  li.className = `candle${lives <= 0 ? " is-out" : ""}`;

  const flame = document.createElement("div");
  flame.className = "candle-flame";

  const wax = document.createElement("div");
  wax.className = "candle-wax";

  const nameEl = document.createElement("div");
  nameEl.className = "candle-name";
  nameEl.textContent = name;

  const livesEl = document.createElement("div");
  livesEl.className = "candle-lives";
  livesEl.textContent = lives <= 0 ? "out" : "♥".repeat(lives);

  li.append(flame, wax, nameEl, livesEl);
  return li;
}
