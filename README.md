# GuerdoLandia 💜

A tamagotchi of **yourself**. The little character is you: when you eat, rest, move,
and reach out to people, it thrives. When you don't, it gets hungry, tired, lonely
or unwell, and gently tells you so. Your life tasks become **quests** that the
character acts out while you do them.

## Features

- **Character creator**: a Mii-style builder with skin tone, face shape, 13 hairstyles,
  eyes, brows, nose, mouth, facial hair, glasses, hats, build, height and outfit colours.
  Every option shows a live preview, and there's a 🎲 random button.
- **Vitals**: Fed, Hydrated, Rested, Connected, Moved and Joy all decay in real time.
  Health is derived from them: *Excellent / Normal / Poor*, or *Unwell* if you say you feel sick.
  Low needs change the character's mood (hungry, lonely, tired…) and show up as speech-bubble
  alerts and optional notifications.
- **Self-care log**: tap what you actually did ("Ate a meal", "Talked with someone",
  "Went outside", …) to refill needs and earn kindness XP. Toggle sleep mode at night.
- **Natural-language quests**: type "Find 10 jobs to apply to" and the app
  - picks an animation (`desk`, `exercise`, `build`, `clean`, `meditate`, `cook`, `eat`,
    `read`, `social`, `walk`, `create`, `sleep`) with an offline keyword classifier
    (`src/game/classifier.ts`). You can override the pick.
  - spots counts ("10 jobs", "three chapters") and gives the quest a progress counter.
- **Calendar**: a week strip plus a day timeline. Tap an hour to schedule a block, or use
  📅 *Schedule* on a quest. Syncs both ways with **Google Calendar**.
- **Timer**: Pomodoro (configurable focus, break, long break and rounds), a set length,
  or the length of a scheduled block. The character performs the quest's animation while
  the countdown runs, and focused minutes are credited to the quest and your stats.
- Installable **PWA** that works offline. Data stays on your device, with JSON export and import.

Open `#gallery` (Settings → Animation gallery) to see every animation and mood.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests (classifier, stats, timer, calendar merge)
npm run build    # static site in dist/
```

## Google Calendar setup

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project and
   enable the **Google Calendar API**.
2. Configure the OAuth consent screen (External, add yourself as a test user).
3. Create an **OAuth client ID** of type *Web application*. Under *Authorized JavaScript
   origins*, add every origin you'll use, e.g. `http://localhost:5173` and
   `https://<you>.github.io`.
4. Paste the client ID into **More → Google Calendar** in the app, or set
   `VITE_GOOGLE_CLIENT_ID` in `.env.local` (see `.env.example`).
5. Open **Calendar → Connect Google Calendar**.

Sync pushes your blocks to your primary calendar, tagged so they round-trip with their
quest and animation. It also pulls your other timed events into the timeline and
classifies them. Deleting a block deletes its Google event. The access token lives
only in this browser tab's session storage.

## Android

**Recommended: install the PWA.** Deploy the site (see below), open it in Chrome on
Android, and choose *Add to Home screen* / *Install app*. You get a full-screen app
with an icon, offline support and notifications, and Google sign-in works normally.

**Native APK (optional)**: Capacitor is configured (`capacitor.config.ts`):

```bash
npm run android:add    # once; needs Android Studio / SDK
npm run android:sync
npm run android:open
```

Note: Google blocks OAuth inside embedded WebViews, so Calendar sync does not work in
the Capacitor build without adding a native Google sign-in plugin. Use the PWA if
you need sync.

## Hosted copy on claude.ai

A single-file build runs as a private claude.ai page:

```bash
VITE_EMBEDDED=1 npm run build && python3 scripts/build-embedded.py guerdolandia.html
```

That host blocks Google sign-in, service workers and downloads. So Calendar sync,
offline mode and Export are unavailable there; use **Copy backup** instead.

## Deploying (GitHub Pages)

`.github/workflows/deploy.yml` runs the tests, builds and deploys on every push to `main`
or the working branch. One-time setup: make the repo public (Pages on private repos needs
a paid plan), then **Settings → Pages → Source: GitHub Actions**. The site is then at
**https://guerdonl.github.io/GuerdoLandia/**.

HTTPS is automatic on github.io and is what makes install, offline mode, notifications and
Google sign-in possible. Notes:

- Everything is loaded from the same site or over `https://`, so nothing gets blocked as
  mixed content.
- The build uses relative paths, so it works under the `/GuerdoLandia/` sub-path.
- For Google Calendar, the authorized JavaScript origin is `https://guerdonl.github.io`
  (no path, no trailing slash).
- Each deploy gets its own service-worker cache. Open copies of the app show
  "A new version is ready. Tap to update"; your saved data is untouched.
- Saved data belongs to the `guerdonl.github.io` origin. Keep the same address, or move
  data with Copy backup / restore.

## Code map

| Path | What |
| --- | --- |
| `src/avatar/Avatar.tsx`, `avatar.css` | Parametric SVG character, props and per-activity animations |
| `src/avatar/options.ts` | Creator options, palettes and randomiser |
| `src/game/classifier.ts` | Quest text → animation, plus count parsing |
| `src/game/stats.ts` | Decay rates, care actions, health, mood and alerts |
| `src/store.ts` | App state (zustand, persisted to localStorage), quests, blocks and timer logic |
| `src/google/calendar.ts` | Google Identity Services and Calendar REST sync |
| `src/screens/*` | Home, Creator, Quests, Calendar, Timer, Settings |

Tuning ideas: change decay speeds in `DECAY_PER_HOUR`, add words to the `LEXICON` in
the classifier, or add a new animation by adding an `Activity`, a lexicon entry, props
in `Avatar.tsx` and keyframes in `avatar.css`.
