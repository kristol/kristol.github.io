import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createInitialState, importState } from "./storage.js";
import { summarizeProgress } from "./progression.js";
import {
  confirmLegRaiseBaseline,
  confirmLevelUp,
  levelUpAvailable,
  saveWorkout,
  setPersonalRecord,
  workoutVolumeXp,
} from "./xp.js";

const date = "2026-10-26T12:00:00.000Z";

function workout(overrides = {}) {
  return {
    id: "w1",
    date,
    type: "training",
    status: "completed",
    steps: [
      { exerciseId: "pullups", rounds: [{ actual: 2 }, { actual: 2 }] },
      { exerciseId: "pushups", rounds: [{ actual: 1 }, { actual: 0 }] },
      { exerciseId: "hollow", rounds: [{ actual: 1 }, { actual: 0 }] },
    ],
    ...overrides,
  };
}

test("known baselines are seeded and untested work stays untested", () => {
  const state = createInitialState(date);
  assert.equal(state.personalRecords.pullups.value, 3);
  assert.equal(state.personalRecords.pushups.value, 25);
  assert.equal(state.personalRecords.lsit.value, 10);
  assert.equal(state.personalRecords.scapular.assessed, false);
  assert.equal(state.personalRecords.hollow.assessed, false);
  assert.equal(state.personalRecords.lunge.assessed, false);
  assert.equal(state.totalXP, 0);
  assert.equal(state.xpEvents.length, 0);
  assert.equal(state.currentLevel, 1);

  const progress = summarizeProgress(state);
  assert.equal(progress.assessedCount, 3);
  assert.equal(progress.totalCount, 7);
  assert.equal(progress.items.find((item) => item.exerciseId === "scapular").statusLabel, "Not assessed");
  assert.equal(progress.items.find((item) => item.exerciseId === "legRaises").statusLabel, "Variation not chosen");
  const expected = (3 / 5 + 25 / 30 + 10 / 15) / 3;
  assert.ok(Math.abs(progress.average - expected) < 1e-9);
  assert.equal(progress.ready, false);
  assert.equal(levelUpAvailable(state), null);
});

test("leg-raise variations are stored separately", () => {
  const state = createInitialState(date);
  confirmLegRaiseBaseline(state, "lying", date);
  assert.equal(state.totalXP, 0);
  assert.equal(state.personalRecords.legRaises.variations.lying.value, 10);
  assert.ok(state.completedMilestones["req:1:legRaises"]);
  assert.equal(state.xpEvents.some((event) => event.id === "req:1:legRaises"), false);

  setPersonalRecord(state, { exerciseId: "legRaises", variant: "hangingKnee", value: 4, date, source: "benchmark" });
  state.settings.legRaiseVariation = "lying";
  let progress = summarizeProgress(state);
  assert.equal(progress.items.find((item) => item.exerciseId === "legRaises").value, 10);

  state.settings.legRaiseVariation = "hangingKnee";
  progress = summarizeProgress(state);
  assert.equal(progress.items.find((item) => item.exerciseId === "legRaises").value, 4);
  assert.equal(state.personalRecords.legRaises.variations.lying.value, 10);
});

test("workout XP rounds the sum and ignores planned targets", () => {
  const rounded = workoutVolumeXp(workout());
  assert.equal(rounded, Math.round(4 * 3 + 1 * 0.5 + 1 * 0.25));
  const skipped = workoutVolumeXp(workout({
    steps: [{ exerciseId: "pullups", skipped: true, rounds: [{ actual: 20 }, { actual: 20 }] }],
  }));
  assert.equal(skipped, 0);
});

test("saving, editing, and discarding do not duplicate bonuses", () => {
  const state = createInitialState(date);
  saveWorkout(state, workout(), date);
  assert.equal(state.workoutHistory.length, 1);
  assert.equal(state.xpEvents.filter((event) => event.id === "workout:w1:completion").length, 1);
  assert.equal(state.xpEvents.filter((event) => event.id === "workout:w1:volume").length, 1);
  const completion = state.xpEvents.find((event) => event.id === "workout:w1:completion");
  assert.equal(completion.amount, 10);
  const firstTotal = state.totalXP;

  const edited = workout();
  edited.steps[0].rounds[0].actual = 1;
  saveWorkout(state, edited, date);
  assert.equal(state.workoutHistory.length, 1);
  assert.equal(state.xpEvents.filter((event) => event.id === "workout:w1:completion").length, 1);
  assert.equal(state.xpEvents.filter((event) => event.id === "workout:w1:volume").length, 1);
  assert.ok(state.totalXP < firstTotal);
  assert.equal(state.xpEvents.find((event) => event.id === "workout:w1:completion").amount, 10);

  const before = state.totalXP;
  saveWorkout(state, workout({ id: "nope", status: "discarded" }), date);
  assert.equal(state.totalXP, before);
  assert.equal(state.workoutHistory.length, 1);
});

test("XP cannot level the user up, and each rank is confirmed once", () => {
  const state = createInitialState(date);
  state.xpEvents.push({ id: "fake:xp", date, amount: 5000, kind: "volume", reason: "test" });
  state.totalXP = 5000;
  assert.equal(confirmLevelUp(state, date).awarded, false);
  assert.equal(state.currentLevel, 1);

  const master = {
    pullups: 20,
    pushups: 60,
    legRaises: 20,
    lsit: 60,
    scapular: 15,
    hollow: 60,
  };
  for (const [exerciseId, value] of Object.entries(master)) {
    const variant = exerciseId === "legRaises" ? "lying" : undefined;
    setPersonalRecord(state, { exerciseId, variant, value, date, source: "benchmark", form: "full" });
  }
  setPersonalRecord(state, { exerciseId: "lunge", left: 20, right: 20, date, source: "benchmark" });
  assert.equal(state.currentLevel, 1);

  let guards = 0;
  while (levelUpAvailable(state) && guards < 6) {
    assert.equal(confirmLevelUp(state, date).awarded, true);
    guards += 1;
  }
  assert.equal(state.currentLevel, 5);
  assert.equal(guards, 4);
  assert.equal(state.xpEvents.filter((event) => event.kind === "level").length, 4);
  assert.equal(confirmLevelUp(state, date).awarded, false);
  const levelFive = state.xpEvents.filter((event) => event.id === "level:5");
  assert.equal(levelFive.length, 1);
  assert.equal(levelFive[0].amount, 100);

  const repeat = setPersonalRecord(state, { exerciseId: "pullups", value: 21, date, source: "benchmark" });
  assert.equal(repeat.milestones.length, 0);
  const again = setPersonalRecord(state, { exerciseId: "pullups", value: 21, date, source: "benchmark" });
  assert.equal(again.prAwarded, false);
});

test("a bad import leaves the current state in place", () => {
  const current = createInitialState(date);
  current.totalXP = 12;
  const broken = importState(current, "{nope");
  assert.equal(broken.ok, false);
  assert.equal(broken.state, current);

  const duplicate = createInitialState(date);
  duplicate.xpEvents = [
    { id: "same", date, amount: 1, kind: "volume", reason: "one" },
    { id: "same", date, amount: 1, kind: "volume", reason: "two" },
  ];
  const rejected = importState(current, JSON.stringify(duplicate));
  assert.equal(rejected.ok, false);
  assert.equal(rejected.state, current);
  assert.equal(current.totalXP, 12);

  const valid = createInitialState(date);
  valid.xpEvents = [{ id: "kept", date, amount: 4, kind: "volume", reason: "Imported ledger." }];
  const accepted = importState(current, JSON.stringify(valid));
  assert.equal(accepted.ok, true);
  assert.equal(accepted.state.totalXP, 4);
  assert.notEqual(accepted.state, current);
});

test("the program text does not add muscle-ups", () => {
  const files = ["config.js", "exercises.js", "progression.js", "xp.js", "storage.js", "app.js"];
  for (const file of files) {
    const text = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
    assert.equal(/muscle[-\s]?up/i.test(text), false, file);
  }
});

test("the manifest and service worker are ready for a project subpath", () => {
  const manifest = JSON.parse(readFileSync(new URL("../manifest.webmanifest", import.meta.url), "utf8"));
  assert.equal(manifest.name, "Climber Quest");
  assert.equal(manifest.short_name, "Climber");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.background_color, "#0e1116");
  assert.equal(manifest.theme_color, "#12161c");
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512"));

  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /apple-touch-icon/);
  assert.match(html, /manifest\.webmanifest/);
  assert.equal(html.includes('src="/'), false);

  const worker = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  assert.match(worker, /climber-quest-v/);
  assert.match(worker, /skip-waiting/);
  assert.equal(worker.includes("localStorage"), false);
});
