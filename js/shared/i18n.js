// Language is stored under one shared key so a visitor's choice carries across every
// party-games title hosted on prapachaiuea.github.io (same origin, different paths).
const STORAGE_KEY = "pg-lang";

let lang = "en";
try {
  lang = localStorage.getItem(STORAGE_KEY) || "en";
} catch {
  // Private browsing / storage disabled — fall back to English silently.
}

const listeners = new Set();

const translations = {
  en: {
    "nav.menu": "Menu",
    "nav.home": "Home",
    "nav.leave": "Leave",
    "landing.eyebrowHost": "On the shared screen",
    "landing.taglineHost": "Open the show on the TV, laptop, or iPad everyone can see.",
    "landing.ctaHost": "Open the Show →",
    "landing.eyebrowPlayer": "On your phone",
    "landing.taglinePlayer": "Got a room code from the big screen? Take your seat and answer for your life.",
    "landing.ctaPlayer": "Take Your Seat →",
    "room.prefix": "Room",
    "mute.music": "Toggle music",
    "mute.sound": "Toggle sound",
    "shared.toastFirebaseFailed": "Failed to connect to Firebase — check firebase-config.js.",
    "shared.toastLeaveFailed": "Could not leave the room — check your connection.",
    "shared.toastConnectFailed": "Failed to connect. Check your Firebase config and connection.",
    "shared.toastRoomClosed": "The host closed this room.",
    "shared.toastContinueFailed": "Could not continue.",
    "shared.outOfLives": "You're out of lives.",
    "shared.watchSpectator": "Watch the show as a spectator.",
    "candle.out": "out",
    "setup.tagline": "Answer wrong and you'll have to survive to stay in the game.",
    "setup.createRoom": "Open the Show",
    "setup.createError": "Could not open the show. Check firebase-config.js and try again.",
    "lobby.instruction": "Players join at {link} using this code",
    "lobby.questions": "Questions",
    "lobby.startGame": "Begin the Show",
    "lobby.hintWaiting": "Waiting for players ({count}/{min} minimum)...",
    "lobby.hintTooMany": "Too many players — max {max}.",
    "lobby.hintReady": "Ready! {count} players in the room.",
    "lobby.toastNotEnough": "Need at least {min} players to start.",
    "lobby.toastTooMany": "Max {max} players per room.",
    "lobby.toastStartFailed": "Could not start the game.",
    "lobby.toastRoundsFailed": "Could not update question count.",
    "question.roundNumber": "Question {n} of {total}",
    "question.skip": "Everyone's Answered — Reveal",
    "question.toastRevealFailed": "Could not reveal the answer.",
    "question.eyebrow": "Answer correctly, or gamble your life",
    "question.answered": "Answer locked in.",
    "question.watchReveal": "Watch the big screen for the reveal.",
    "question.toastAnswerFailed": "Could not submit your answer — try again.",
    "reveal.eyebrow": "The correct answer was…",
    "reveal.hintAtRisk": "The wrong answers are about to face the reflex trial.",
    "reveal.hintSafe": "Everyone answered correctly — nobody's fate is on the line this round.",
    "reveal.startTrial": "Start the Reflex Trial",
    "reveal.continue": "Continue",
    "reveal.correctText": "Correct! You're safe this round.",
    "reveal.correctHint": "Watch the others face the reflex trial.",
    "reveal.wrongText": "Wrong answer.",
    "reveal.wrongHint": "Get ready — you'll need to survive the reflex trial.",
    "minigame.hostEyebrow": "Survive… or else",
    "minigame.getReadyCount": "Get ready… {n}",
    "minigame.tapNowStatus": "Tap when you see green!",
    "minigame.fateDecided": "Fate decided.",
    "minigame.revealFate": "Reveal Fate",
    "minigame.seeTally": "See the Tally",
    "minigame.eyebrow": "Tap the circle the instant it turns green",
    "minigame.getReady": "Get ready…",
    "minigame.waitGreen": "Wait for green…",
    "minigame.tapNow": "TAP NOW!",
    "minigame.tooEarly": "Too early!",
    "minigame.tooSlow": "Too slow!",
    "minigame.survived": "You survived!",
    "minigame.correctSafe": "You answered correctly.",
    "minigame.watchOthers": "Watch the others fight for their lives.",
    "roundEnd.title": "Who's Still Breathing?",
    "roundEnd.nextQuestion": "Next Question",
    "roundEnd.seeFinal": "See Final Results",
    "roundEnd.checkScreen": "Check the big screen for the tally.",
    "roundEnd.livesLeft": "Lives left: {hearts}",
    "final.soleSurvivor": "{name} is the sole survivor",
    "final.mostLives": "{name} survives with the most lives",
    "final.nobodyMadeIt": "Nobody made it out",
    "final.newGame": "New Show",
    "final.toastFailed": "Could not start a new game — check your connection.",
    "final.hostEyebrow": "The Show Is Over",
    "final.playerEyebrow": "The show is over",
    "final.survivedWith": "You survived with {hearts}",
    "final.didntMakeIt": "You didn't make it out.",
    "final.thanks": "Thanks for playing — look up for the final results.",
    "player.yourName": "Your name",
    "player.namePlaceholder": "e.g. Beam",
    "player.joiningRoom": "Joining room {code}",
    "player.roomCode": "Room code",
    "player.takeSeat": "Take Your Seat",
    "player.errorRoomNotFound": "That room code doesn't exist.",
    "player.errorRoomInProgress": "That game has already started — wait for it to finish.",
    "player.errorGeneric": "Something went wrong. Please try again.",
    "player.lobbyWaiting": "You're seated. Waiting for the show to begin…",
    "player.you": "(you)",
  },
  th: {
    "nav.menu": "เมนู",
    "nav.home": "หน้าแรก",
    "nav.leave": "ออก",
    "landing.eyebrowHost": "หน้าจอรวม เปิดให้ทุกคนดู",
    "landing.taglineHost": "เปิดโชว์ แล้วเอาไปเปิดที่จอทีวี โน้ตบุ๊ก หรือ iPad ที่ทุกคนเห็นได้",
    "landing.ctaHost": "เปิดโชว์ →",
    "landing.eyebrowPlayer": "เล่นจากมือถือคุณ",
    "landing.taglinePlayer": "มีรหัสห้องจากจอใหญ่แล้วใช่ไหม? นั่งลงแล้วตอบคำถามเพื่อเอาชีวิตรอด",
    "landing.ctaPlayer": "เข้านั่งประจำที่ →",
    "room.prefix": "ห้อง",
    "mute.music": "เปิด/ปิดเพลง",
    "mute.sound": "เปิด/ปิดเสียง",
    "shared.toastFirebaseFailed": "เชื่อมต่อ Firebase ไม่สำเร็จ — ลองเช็ค firebase-config.js ดูนะ",
    "shared.toastLeaveFailed": "ออกจากห้องไม่สำเร็จ — ลองเช็คการเชื่อมต่อดูนะ",
    "shared.toastConnectFailed": "เชื่อมต่อไม่สำเร็จ ลองเช็คการตั้งค่า Firebase และการเชื่อมต่อดูนะ",
    "shared.toastRoomClosed": "โฮสต์ปิดห้องนี้แล้ว",
    "shared.toastContinueFailed": "ไปต่อไม่สำเร็จ",
    "shared.outOfLives": "คุณหมดชีวิตแล้ว",
    "shared.watchSpectator": "ดูโชว์ในฐานะผู้ชมต่อไป",
    "candle.out": "ดับแล้ว",
    "setup.tagline": "ตอบผิดแล้วต้องเอาชีวิตรอดถึงจะอยู่ในเกมต่อได้",
    "setup.createRoom": "เปิดโชว์",
    "setup.createError": "เปิดโชว์ไม่สำเร็จ ลองเช็ค firebase-config.js แล้วลองใหม่อีกครั้ง",
    "lobby.instruction": "ผู้เล่นเข้าร่วมได้ที่ {link} โดยใช้รหัสนี้",
    "lobby.questions": "จำนวนคำถาม",
    "lobby.startGame": "เริ่มโชว์",
    "lobby.hintWaiting": "รอผู้เล่นอยู่ ({count}/{min} คนขั้นต่ำ)...",
    "lobby.hintTooMany": "ผู้เล่นเยอะไปหน่อย — สูงสุด {max} คน",
    "lobby.hintReady": "พร้อมแล้ว! มีผู้เล่น {count} คนในห้อง",
    "lobby.toastNotEnough": "ต้องมีผู้เล่นอย่างน้อย {min} คนถึงจะเริ่มได้",
    "lobby.toastTooMany": "ห้องนึงรับได้สูงสุด {max} คน",
    "lobby.toastStartFailed": "เริ่มเกมไม่สำเร็จ",
    "lobby.toastRoundsFailed": "อัปเดตจำนวนคำถามไม่สำเร็จ",
    "question.roundNumber": "คำถามที่ {n} จาก {total}",
    "question.skip": "ทุกคนตอบครบแล้ว — เปิดเผยคำตอบ",
    "question.toastRevealFailed": "เปิดเผยคำตอบไม่สำเร็จ",
    "question.eyebrow": "ตอบให้ถูก ไม่งั้นต้องเสี่ยงชีวิต",
    "question.answered": "ส่งคำตอบเรียบร้อย",
    "question.watchReveal": "ดูจอใหญ่เพื่อรอการเปิดเผยคำตอบ",
    "question.toastAnswerFailed": "ส่งคำตอบไม่สำเร็จ ลองใหม่อีกครั้ง",
    "reveal.eyebrow": "คำตอบที่ถูกต้องคือ...",
    "reveal.hintAtRisk": "คนตอบผิดกำลังจะต้องเผชิญบททดสอบไหวพริบ",
    "reveal.hintSafe": "ทุกคนตอบถูกหมด — รอบนี้ไม่มีใครต้องเสี่ยงชีวิต",
    "reveal.startTrial": "เริ่มบททดสอบไหวพริบ",
    "reveal.continue": "ไปต่อ",
    "reveal.correctText": "ถูกต้อง! รอบนี้คุณปลอดภัย",
    "reveal.correctHint": "ดูคนอื่นเผชิญบททดสอบไหวพริบ",
    "reveal.wrongText": "ตอบผิด",
    "reveal.wrongHint": "เตรียมตัวให้พร้อม — คุณต้องเอาชีวิตรอดจากบททดสอบไหวพริบ",
    "minigame.hostEyebrow": "รอดให้ได้... ไม่งั้นจบเห่",
    "minigame.getReadyCount": "เตรียมตัว... {n}",
    "minigame.tapNowStatus": "แตะทันทีที่เห็นสีเขียว!",
    "minigame.fateDecided": "ชะตากรรมถูกตัดสินแล้ว",
    "minigame.revealFate": "เปิดเผยชะตากรรม",
    "minigame.seeTally": "ดูผลสรุป",
    "minigame.eyebrow": "แตะวงกลมทันทีที่มันเปลี่ยนเป็นสีเขียว",
    "minigame.getReady": "เตรียมตัว...",
    "minigame.waitGreen": "รอสัญญาณสีเขียว...",
    "minigame.tapNow": "แตะเลย!",
    "minigame.tooEarly": "เร็วไปหน่อย!",
    "minigame.tooSlow": "ช้าไปหน่อย!",
    "minigame.survived": "คุณรอดแล้ว!",
    "minigame.correctSafe": "คุณตอบถูกแล้ว",
    "minigame.watchOthers": "ดูคนอื่นสู้เพื่อเอาชีวิตรอด",
    "roundEnd.title": "ใครยังหายใจอยู่บ้าง?",
    "roundEnd.nextQuestion": "คำถามต่อไป",
    "roundEnd.seeFinal": "ดูผลสรุปสุดท้าย",
    "roundEnd.checkScreen": "ดูผลสรุปที่จอใหญ่ได้เลย",
    "roundEnd.livesLeft": "ชีวิตที่เหลือ: {hearts}",
    "final.soleSurvivor": "{name} คือผู้รอดชีวิตเพียงหนึ่งเดียว",
    "final.mostLives": "{name} รอดชีวิตด้วยจำนวนชีวิตมากที่สุด",
    "final.nobodyMadeIt": "ไม่มีใครรอดเลย",
    "final.newGame": "โชว์ใหม่",
    "final.toastFailed": "เริ่มเกมใหม่ไม่สำเร็จ — ลองเช็คการเชื่อมต่อดูนะ",
    "final.hostEyebrow": "โชว์จบแล้ว",
    "final.playerEyebrow": "โชว์จบแล้ว",
    "final.survivedWith": "คุณรอดชีวิตด้วย {hearts}",
    "final.didntMakeIt": "คุณไม่รอดในรอบนี้",
    "final.thanks": "ขอบคุณที่เล่นด้วยกันนะ — เงยหน้าไปดูผลสรุปได้เลย",
    "player.yourName": "ชื่อของคุณ",
    "player.namePlaceholder": "เช่น บีม",
    "player.joiningRoom": "กำลังเข้าร่วมห้อง {code}",
    "player.roomCode": "รหัสห้อง",
    "player.takeSeat": "เข้านั่งประจำที่",
    "player.errorRoomNotFound": "ไม่พบรหัสห้องนี้",
    "player.errorRoomInProgress": "เกมนี้เริ่มไปแล้ว — รอให้จบก่อนนะ",
    "player.errorGeneric": "มีบางอย่างผิดพลาด ลองใหม่อีกครั้งนะ",
    "player.lobbyWaiting": "นั่งประจำที่แล้ว รอโชว์เริ่มต้น...",
    "player.you": "(คุณ)",
  },
};

export function getLang() {
  return lang;
}

export function setLang(next) {
  if (next !== "en" && next !== "th") return;
  if (next === lang) return;
  lang = next;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Ignore — the toggle still works for the rest of this session.
  }
  document.documentElement.lang = lang;
  applyStaticTranslations();
  listeners.forEach((fn) => fn(lang));
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

export function t(key, vars) {
  const dict = translations[lang] || translations.en;
  const str = dict[key] ?? translations.en[key] ?? key;
  return interpolate(str, vars);
}

// Static text marked up declaratively in HTML — anything set dynamically by a view's
// render() must instead call t() directly, since this only runs once per language switch.
export function applyStaticTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });
  root.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.getAttribute("data-i18n-title"));
  });
}

document.documentElement.lang = lang;

export function mountLangToggle() {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "lang-toggle";
  btn.setAttribute("aria-label", "Switch language / เปลี่ยนภาษา");
  function render() {
    btn.textContent = getLang() === "en" ? "ไทย" : "EN";
  }
  render();
  btn.addEventListener("click", () => {
    setLang(getLang() === "en" ? "th" : "en");
  });
  onLangChange(render);
  document.body.appendChild(btn);
  return btn;
}
