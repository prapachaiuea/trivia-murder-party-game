import { getState } from "../state.js";
import { t, onLangChange } from "../../shared/i18n.js";

export function init() {
  onLangChange(() => render(getState()));
}

export function render(state) {
  if (state.phase !== "round-end") return;
  const myLives = state.lives?.[state.uid] ?? 0;
  const el = document.getElementById("my-lives");
  el.textContent = myLives > 0 ? t("roundEnd.livesLeft", { hearts: "♥".repeat(myLives) }) : t("shared.outOfLives");
}
