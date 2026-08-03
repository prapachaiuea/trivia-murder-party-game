import { getState } from "../state.js";
import { submitAnswer } from "../actions.js";
import { loadTrivia } from "../../shared/trivia.js";
import { showToast } from "../../shared/components.js";
import { t, onLangChange } from "../../shared/i18n.js";

let initialized = false;
let trivia = [];
const LETTERS = ["A", "B", "C", "D"];

export function init() {
  if (initialized) return;
  initialized = true;
  loadTrivia().then((data) => { trivia = data; });
  onLangChange(async () => {
    trivia = await loadTrivia();
    render(getState());
  });
}

export function render(state) {
  if (state.phase !== "question") return;

  const active = document.getElementById("question-active");
  const answered = document.getElementById("question-answered");
  const eliminated = document.getElementById("question-eliminated");

  const myLives = state.lives?.[state.uid] ?? 3;
  if (myLives <= 0) {
    active.hidden = true;
    answered.hidden = true;
    eliminated.hidden = false;
    return;
  }
  eliminated.hidden = true;

  if (state.myAnswer !== null && state.myAnswer !== undefined) {
    active.hidden = true;
    answered.hidden = false;
    return;
  }
  answered.hidden = true;
  active.hidden = false;

  const q = trivia[state.public?.questionIndex];
  document.getElementById("my-question").textContent = q ? q.question : "";

  const container = document.getElementById("answer-options");
  container.innerHTML = "";
  (q?.options || []).forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "answer-option";
    btn.dataset.letter = LETTERS[i];
    btn.textContent = opt;
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await submitAnswer(i);
      } catch {
        showToast(t("question.toastAnswerFailed"), true);
        btn.disabled = false;
      }
    });
    container.appendChild(btn);
  });
}
