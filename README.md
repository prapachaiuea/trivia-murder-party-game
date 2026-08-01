# Trivia Murder Party (web)

A browser version of the party game **Trivia Murder Party** (originally by Jackbox Games): answer trivia questions correctly to stay safe, or answer wrong and gamble your life in a split-second reflex trial. Static site + Firebase Realtime Database, deployable on GitHub Pages for free. No external trivia API &mdash; the question bank ships in the repo.

One link to share &mdash; `index.html` is a menu that sends each visitor to the right screen:

- **`host.html`** &mdash; the shared screen (the show). Put it on a TV, laptop, or iPad where everyone can see it.
- **`player.html`** &mdash; what each player opens on their own phone (the hot seat). This is where answers are picked and the reflex trial is played.

A link with a room code already in it (`index.html?room=BLUE2`) skips the menu and drops that visitor straight into the join screen.

## How it works

1. Open the site on the shared screen, tap **Open the Show**, then again to get a room code.
2. Everyone else opens the same link on their phone, taps **Take Your Seat**, and enters the code and their name.
3. The host begins the show (3&ndash;10 players). Every round, everyone alive gets the same multiple-choice question and a countdown.
4. Answer correctly and you're safe. Answer wrong (or run out of time) and you're **at risk** &mdash; you'll have to survive a **Reaction Tap** trial: tap the circle the instant it turns from red to green. Too early or too late, and you lose a life.
5. Everyone starts with 3 lives. Lose all three and you're eliminated &mdash; you keep watching, but you're done playing.
6. After the configured number of questions, or once only one player is left standing, the host screen shows who survived.

## Why the mini-game is judged locally, not over the network

A real-time reflex game can't be fairly synced frame-by-frame over WiFi/4G &mdash; whoever has less lag would always win. Instead, the host broadcasts a single "go" signal (a shared timestamp), and each phone runs its own copy of the reflex trial locally using its own clock. Only the final pass/fail result gets sent back once, at the end. This means the trial is fair regardless of anyone's connection speed &mdash; it's testing reflexes, not ping.

## Known limitation: the trivia file is public

This is a static site with no server-side code &mdash; `trivia.json` (including correct answers) ships as a plain file anyone can open in their browser's dev tools. Same trade-off documented in Insider, Quiplash, and Fibbing It: fine for a casual game with friends, not for anything with real stakes.

## Setup

### 1. Create a Firebase project

1. Go to the [Firebase Console](https://console.firebase.google.com) and create a new project (free **Spark** plan is enough).
2. **Build &rarr; Authentication &rarr; Sign-in method** &rarr; enable **Anonymous**.
3. **Build &rarr; Realtime Database &rarr; Create Database** &rarr; pick a region &rarr; start in **locked mode**.
4. **Realtime Database &rarr; Rules** tab &rarr; paste the contents of [`firebase-rules.json`](firebase-rules.json) &rarr; **Publish**.
5. **Project settings &rarr; Add app &rarr; Web app (`</>`)** &rarr; copy the generated config object into [`firebase-config.js`](firebase-config.js), replacing the `REPLACE_ME` placeholders.
6. **Authentication &rarr; Settings &rarr; Authorized domains** &rarr; add `<your-github-username>.github.io` (needed once you deploy to Pages).

This needs its **own** Firebase project &mdash; don't reuse Insider's, Wavelength's, Quiplash's, or Fibbing It's.

### 2. Run locally

No build step &mdash; just serve the folder statically (opening the HTML files directly via `file://` won't work because ES modules and fetch require an HTTP origin):

```bash
npx serve .
# or: python -m http.server 8080
```

Then open `index.html` and pick **Host** or **Join**; open it again in another tab to test the other role.

### 3. Deploy

Push this folder to a GitHub repo and enable **GitHub Pages** (Settings &rarr; Pages &rarr; deploy from branch). Share the repo's Pages URL (it serves `index.html` automatically) with your group.

## Editing the trivia bank

[`trivia.json`](trivia.json) is a flat array of `{ question, options: [4 strings], correctIndex }` entries, picked at random each round without repeats until the list runs out (then it starts reusing). Add, remove, or translate freely &mdash; no code changes needed.

## Project structure

```
index.html / landing.css       the menu — one link, routes to host or player
host.html / host.css           the shared screen (the show + candle row)
player.html / player.css       each player's phone (the hot seat + reflex trial)
tokens.css                     shared color/type tokens for all three pages
trivia.json                    the question bank
firebase-config.js             your Firebase project config (paste after setup)
firebase-rules.json            Realtime Database security rules (paste into Firebase console)
js/shared/                     firebase init, auth, trivia loader, room-code + storage utils, toast
js/host/                       host-only state, round orchestration, candle-row rendering, views
js/player/                     player-only state, answer/reflex-trial actions, views
```
