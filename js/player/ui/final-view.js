import { getState } from "../state.js";
import { playSuccess, playFail } from "../../shared/audio.js";
import { t, onLangChange } from "../../shared/i18n.js";

let announced = false;

export function init() {
  onLangChange(() => render(getState()));
}

export function render(state) {
  if (state.phase !== "final") {
    announced = false;
    return;
  }
  const myLives = state.lives?.[state.uid] ?? 0;
  const el = document.getElementById("final-lives");
  el.textContent = myLives > 0 ? t("final.survivedWith", { hearts: "♥".repeat(myLives) }) : t("final.didntMakeIt");

  if (!announced) {
    announced = true;
    if (myLives > 0) playSuccess(); else playFail();
  }
}
