# Climber Quest

A personal bouldering-training log. It tracks seven exercises across five ranks, keeps workout sets separate from personal records, and awards XP without letting XP replace a benchmark.

The app is a static Progressive Web App. It stores everything in `localStorage` on the device you are using.

## Run it locally

From the repository root:

```sh
python3 -m http.server 8765
```

Open `http://127.0.0.1:8765/climber-quest/`.

Logic tests, from `climber-quest/`:

```sh
node --test js/logic.test.mjs
```

## Publish on GitHub Pages

This repository is the user site `kristol.github.io`. GitHub Pages serves the `main` branch at the site root, so this folder is published at:

`https://kristol.github.io/climber-quest/`

1. Pull the latest `main` before you commit, so the other folders on the remote are not overwritten.
2. Commit the `climber-quest` folder and push `main`.
3. In the repository settings, GitHub Pages should already use the `main` branch and the root folder. No separate build is required.

Asset links, the manifest, and the service worker are relative, so the same folder also works under a project URL such as `https://username.github.io/repository-name/climber-quest/`.

## Install on iPhone

Safari will not show an automatic install button.

1. Open the HTTPS URL above in Safari.
2. Tap Share, then Add to Home Screen.
3. Open Climber from the new icon. It should launch without the Safari toolbar.
4. Use the app once while online so the shell can cache.
5. Turn on airplane mode, close the app, and open the icon again. The home screen should still load. Logging a workout does not need a connection after that.

An update banner reloads the new shell and does not clear saved progress.

## Backup

Settings explains the limit: nothing syncs between devices. Export JSON from Settings, move the file yourself, and import it on the other device. A file that fails validation is rejected and the progress already on the device stays in place.

Reset asks a second time before it erases this device's Climber Quest data.

## Levels and XP

Level 1, Initiate, is unlocked at the start. The known baselines are 3 strict pull-ups, 25 strict push-ups, and a 10-second strict L-sit. Those Level 1 matches are recorded with dates and do not grant XP. The 10 leg raises are stored only after you name the variation: lying, hanging knee, or hanging straight. Scapular pull-ups, the hollow-body hold, and reverse lunges start as **Not assessed**. Their Level 1 numbers are practice targets, not records.

The next rank shows a bar for each assessed exercise:

`progress = min(current record / next requirement, 1)`

Holds use seconds. Reverse lunges use the lower side, because both sides must meet the benchmark. Untested exercises stay labeled "Not assessed" and are left out of the average. The screen says how many exercises the percentage includes. The average never unlocks a rank. Every benchmark for the next rank has to be met, then you confirm the level-up. Each confirm grants 100 XP once. A rank stays unlocked if a record later drops. You do not re-test old ranks. Meeting every Master benchmark and confirming Level 5 completes the roadmap.

XP rates live in `js/config.js`:

| Work | XP |
|---|---:|
| Strict pull-up | 3 per rep |
| Strict push-up | 0.5 per rep |
| Leg raise | 1 per rep |
| L-sit | 0.5 per second |
| Scapular pull-up | 1 per rep |
| Hollow-body hold | 0.25 per second |
| Reverse lunge | 0.5 per rep on each side |

A quest's exercise XP is the rounded sum of the sets you actually logged. Targets never count. Saved completion bonuses are 10 XP for training, 5 XP for a climbing-day quest, and 3 XP for recovery. A new record is 10 XP. The first time an exercise meets a specific rank's benchmark is 20 XP. Editing a session replaces that session's exercise XP and does not grant the completion, record, or level bonus again. Cancelled sessions are not stored. Recovery never subtracts XP.

Milestone values and rates are only in `js/config.js`. Daily targets and rest length are edited in Settings.

## Tests and limits

`node --test js/logic.test.mjs` covers seeded baselines, untested exercises, separate leg-raise variations, XP rounding, edit-without-duplicate-bonus, discarded sessions, XP not unlocking a level, one-time Level 5 confirmation, rejected imports, and the manifest paths.

A desktop browser check at a 390×844 viewport covered setup, a saved training quest, refresh, editing that session without a second completion bonus, a separate benchmark, the level roadmap, and the records list. With the network switched off, a reload still opened the cached shell and the saved session was still there. A physical iPhone install was not performed. Offline use still depends on one successful online visit first.
