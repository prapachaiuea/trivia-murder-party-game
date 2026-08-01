import { createRoom } from "../room.js";

let initialized = false;

export function init() {
  if (initialized) return;
  initialized = true;

  const btn = document.getElementById("btn-create-room");
  const errorEl = document.getElementById("setup-error");

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    errorEl.hidden = true;
    try {
      await createRoom();
    } catch (err) {
      console.error(err);
      errorEl.textContent = "Could not open the show. Check firebase-config.js and try again.";
      errorEl.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });
}

export function render() {}
