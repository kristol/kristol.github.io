import { LEVELS, QUEST_LABELS, formatTarget } from "./config.js";
import {
  EXERCISES,
  LEG_RAISE_VARIATIONS,
  PAIN_NOTICE,
  getExercise,
  isProgressExercise,
  variationLabel,
} from "./exercises.js";
import { compareValue, levelRequirementRows, summarizeProgress, unitNoun } from "./progression.js";
import {
  createInitialState,
  importState,
  loadDraft,
  loadState,
  saveDraft,
  saveState,
} from "./storage.js";
import {
  confirmLegRaiseBaseline,
  confirmLevelUp,
  dismissSetup,
  levelUpAvailable,
  previewWorkoutXp,
  saveWorkout,
  setPersonalRecord,
  suggestRecords,
} from "./xp.js";

let state = loadState();
let draft = loadDraft();
let message = "";
let confirmReset = false;
let fatigue = { fingers: false, elbows: false, shoulders: false, forearms: false };
let pendingSuggestions = [];
let holdTimer = null;
let holdTarget = null;
let clockTimer = null;
let restTimer = null;

const app = document.querySelector("#app");

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function route() {
  const raw = location.hash.replace(/^#/, "") || "/";
  const [path, query] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  return { parts, params: new URLSearchParams(query || "") };
}

function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

function commit(options = {}) {
  saveState(state);
  if (options.clearDraft) {
    draft = null;
    saveDraft(null);
  } else {
    saveDraft(draft);
  }
  render();
}

function stopHold() {
  if (holdTimer) clearInterval(holdTimer);
  holdTimer = null;
  holdTarget = null;
}

function stopClocks() {
  if (clockTimer) clearInterval(clockTimer);
  if (restTimer) clearInterval(restTimer);
  clockTimer = null;
  restTimer = null;
}

function questIds(type) {
  return Object.keys(state.settings.targets[type].exercises);
}

function createDraft(type) {
  const plan = state.settings.targets[type];
  const steps = [];
  if (type === "training") {
    steps.push({ exerciseId: "warmup", kind: "info", skipped: false, done: false });
  }
  for (const exerciseId of questIds(type)) {
    steps.push({
      exerciseId,
      kind: "work",
      skipped: false,
      rounds: Array.from({ length: plan.rounds }, () => ({ actual: null, actualLeft: null, actualRight: null })),
    });
  }
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    type,
    status: "in-progress",
    startedAt: Date.now(),
    elapsedSeconds: 0,
    fatigue: { ...fatigue },
    phase: "work",
    stepIndex: 0,
    restLeft: 0,
    editing: false,
    confirmDiscard: false,
    steps,
  };
}

function stepIssues(step) {
  if (!step || step.skipped) return [];
  if (step.kind === "info") return step.done ? [] : ["Warm-up"];
  const exercise = getExercise(step.exerciseId);
  const issues = [];
  step.rounds.forEach((round, index) => {
    const label = `${exercise.short}, round ${index + 1}`;
    if (exercise.unit === "perSide") {
      if (round.actualLeft == null || round.actualRight == null) issues.push(label);
    } else if (round.actual == null) issues.push(label);
  });
  return issues;
}

function allIssues() {
  return draft.steps.flatMap((step) => stepIssues(step));
}

function progressCopy(progress) {
  if (progress.average == null) {
    return "None of the exercises have an assessed record yet, so there is no percentage. Each benchmark still has to be met before a level-up.";
  }
  const percent = Math.round(progress.average * 100);
  const missed = progress.totalCount - progress.assessedCount;
  const lead = progress.atMax
    ? `${percent}% of the Master benchmarks are covered by your current assessed records.`
    : `${percent}% of the way to ${progress.targetTitle}, averaged across ${progress.assessedCount} assessed ${progress.assessedCount === 1 ? "exercise" : "exercises"}.`;
  const gap = missed
    ? ` ${missed} ${missed === 1 ? "exercise is" : "exercises are"} not assessed, so ${missed === 1 ? "it is" : "they are"} left out of this average.`
    : " Every exercise is included in the average.";
  return `${lead}${gap} The percentage does not unlock a level. Each benchmark still has to be met.`;
}

function remainingText(item) {
  if (!item.assessed) return item.statusLabel;
  if (item.met) return "Benchmark met";
  if (item.unit === "perSide") return `${item.remaining} more per side`;
  return `${item.remaining} ${unitNoun(item.unit, item.remaining)} to go`;
}

function recordLine(exerciseId) {
  const progress = summarizeProgress(state);
  const item = progress.items.find((entry) => entry.exerciseId === exerciseId);
  if (!item?.assessed) return item?.statusLabel || "Not assessed";
  if (exerciseId === "lunge") return `${item.left} left / ${item.right} right`;
  const noun = item.unit === "sec" ? "sec" : "reps";
  const variant = item.variantLabel ? ` · ${item.variantLabel}` : "";
  return `${item.value} ${noun}${variant}`;
}

function recentEvents() {
  return [...state.xpEvents]
    .filter((event) => event.amount > 0)
    .sort((a, b) => String(b.updatedAt || b.date).localeCompare(String(a.updatedAt || a.date)))
    .slice(0, 3);
}

function shell(title, body, logging = false) {
  document.body.classList.toggle("logging", logging);
  document.title = `${title} · Climber Quest`;
  const head = route().parts[0] || "home";
  const routeName = ["history", "session", "achievements", "guide", "guides", "settings", "install"].includes(head) ? "more" : head;
  const tabs = [
    ["home", "#/", "Home"],
    ["workout", "#/workout", "Train"],
    ["levels", "#/levels", "Levels"],
    ["records", "#/records", "Records"],
    ["more", "#/more", "More"],
  ];
  const nav = logging
    ? ""
    : `<nav class="tabbar">${tabs
        .map(([id, href, label]) => `<a class="${routeName === id || (id === "home" && routeName === "home") ? "active" : ""}" href="${href}">${label}</a>`)
        .join("")}</nav>`;
  return `<div class="app"><main class="stack loose">${body}</main></div>${nav}`;
}

function note() {
  if (!message) return "";
  return `<div class="banner warn"><p>${esc(message)}</p></div>`;
}

function levelBanner() {
  const next = levelUpAvailable(state);
  if (!next) return "";
  const level = LEVELS.find((item) => item.id === next);
  return `<section class="banner good stack">
    <h2>${esc(level.title)} is ready</h2>
    <p>Every benchmark for this rank is met. Confirm to unlock it and take the 100 XP bonus once. XP on its own cannot do this.</p>
    <button class="primary" type="button" data-action="confirm-level">Confirm ${esc(level.title)}</button>
  </section>`;
}

function renderSetup() {
  document.body.classList.remove("logging");
  document.title = "Set up · Climber Quest";
  app.innerHTML = `<div class="app"><main class="stack loose">
    <header class="stack">
      <p class="eyebrow">Climber Quest</p>
      <h1>Which leg raises were the 10?</h1>
      <p class="muted">Your pull-ups, push-ups, and L-sit are already saved as self-reported baselines. The 10 leg raises stay unattached until you name the variation. Other variations will keep their own records.</p>
    </header>
    ${note()}
    <div class="stack">
      ${LEG_RAISE_VARIATIONS.map((item) => `<button class="choice" type="button" data-action="choose-variation" data-variant="${item.id}">
        <strong>${esc(item.label)}</strong>
        <span class="muted">${esc(item.detail)}</span>
      </button>`).join("")}
      <button class="ghost" type="button" data-action="setup-later">Not sure yet — leave leg raises unassessed</button>
    </div>
    <p class="notice">${esc(PAIN_NOTICE)}</p>
  </main></div>`;
}

function renderDashboard() {
  const progress = summarizeProgress(state);
  const percent = progress.average == null ? "—" : `${Math.round(progress.average * 100)}%`;
  const events = recentEvents();
  const workouts = state.workoutHistory.slice(0, 4);
  app.innerHTML = shell("Home", `
    ${note()}
    ${levelBanner()}
    <section class="hero card stack">
      <p class="eyebrow">Level ${progress.currentLevel}</p>
      <h1>${esc(progress.currentTitle)}</h1>
      <div class="stat-row">
        <div class="stat"><span class="muted">Total XP</span><b>${esc(state.totalXP)}</b></div>
        <div class="stat"><span class="muted">${progress.atMax ? "Master coverage" : `Toward ${progress.targetTitle}`}</span><b>${esc(percent)}</b></div>
      </div>
      <div class="bar ${progress.ready ? "met" : ""}"><span style="width:${progress.average == null ? 0 : Math.round(progress.average * 100)}%"></span></div>
      <p class="muted">${esc(progressCopy(progress))}</p>
    </section>
    <a class="primary" href="#/workout" style="display:flex;align-items:center;justify-content:center;text-decoration:none;">${draft ? "Resume workout" : "Start workout"}</a>
    <section class="card stack">
      <h2>${progress.atMax ? "Master benchmarks" : `Next rank: ${esc(progress.targetTitle)}`}</h2>
      <div class="list">
        ${progress.items.map((item) => `<a class="item" href="#/guide/${item.exerciseId}">
          <div class="row"><strong>${esc(item.name)}</strong><span>${esc(remainingText(item))}</span></div>
          ${item.assessed ? `<div class="bar ${item.met ? "met" : ""}"><span style="width:${Math.round(item.ratio * 100)}%"></span></div>
          <span class="muted">${esc(item.unit === "perSide" ? `${item.left} left / ${item.right} right` : item.value)} now · ${esc(item.requirement)} ${esc(item.unit === "sec" ? "sec" : item.unit === "perSide" ? "per side" : "reps")} required</span>` : `<span class="muted">${esc(item.statusLabel)}</span>`}
        </a>`).join("")}
      </div>
      ${progress.furthest ? `<p class="muted">Furthest from the next benchmark: ${esc(progress.furthest.name)}, ${esc(remainingText(progress.furthest))}.</p>` : ""}
    </section>
    <section class="card stack">
      <div class="row"><h2>Personal bests</h2><a href="#/records">All records</a></div>
      <div class="list">
        ${progress.items.map((item) => `<div class="item"><div class="row"><span>${esc(item.name)}</span><strong>${esc(recordLine(item.exerciseId))}</strong></div></div>`).join("")}
      </div>
    </section>
    <section class="card stack">
      <div class="row"><h2>Recent XP</h2><a href="#/history/xp">Ledger</a></div>
      ${events.length ? `<div class="list">${events.map((event) => `<div class="item"><div class="row"><span>+${esc(event.amount)} XP</span><span class="muted">${esc(formatDate(event.updatedAt || event.date))}</span></div><p class="muted">${esc(event.reason)}</p></div>`).join("")}</div>` : `<p class="muted">No XP yet. Finish a saved quest and the reason will show up here.</p>`}
    </section>
    <section class="card stack">
      <div class="row"><h2>Recent sessions</h2><a href="#/history">History</a></div>
      ${workouts.length ? `<div class="list">${workouts.map((workout) => `<a class="item" href="#/session/${workout.id}"><div class="row"><strong>${esc(QUEST_LABELS[workout.type])}</strong><span>+${esc((workout.exerciseXp || 0) + (workout.completionBonus || 0))} XP</span></div><span class="muted">${esc(formatDate(workout.date))}</span></a>`).join("")}</div>` : `<p class="muted">No saved sessions yet.</p>`}
    </section>
  `);
}

function renderWorkoutPicker() {
  const tired = Object.values(fatigue).some(Boolean);
  app.innerHTML = shell("Train", `
    ${note()}
    <header class="stack">
      <p class="eyebrow">Today</p>
      <h1>Choose a quest</h1>
      <p class="muted">Training stays short and leaves something for climbing. Targets are practice numbers, not tests.</p>
    </header>
    <section class="card stack">
      <h2>How do the arms feel?</h2>
      <div class="choice-row" style="flex-wrap:wrap">
        ${["fingers", "elbows", "shoulders", "forearms"].map((key) => `<button class="pill ${fatigue[key] ? "on" : ""}" type="button" data-action="toggle-fatigue" data-key="${key}">${esc(key)}</button>`).join("")}
      </div>
      ${tired ? `<p class="notice">Hard pull-ups are a poor idea while any of these are fatigued. A climbing-day or recovery quest is the better fit. You can still start training and skip the pulls.</p>` : `<p class="muted">If fingers, elbows, shoulders, or forearms are tired, skip hard pulling today.</p>`}
    </section>
    ${questCard("training", "The Level 1 circuit, adjusted to your targets and today's recovery.")}
    ${questCard("climbing", "Mobility, easy core, and balance. No pull-ups and no scapular pulls.")}
    ${questCard("recovery", "A short check-in. Recovery cannot lower XP, drop a level, or punish a missed day.")}
    <p class="notice">${esc(PAIN_NOTICE)} This program does not include hangboard repeaters or campus-board work.</p>
  `);
}

function questCard(type, copy) {
  const plan = state.settings.targets[type];
  const names = Object.keys(plan.exercises).map((id) => getExercise(id)?.short || id).join(" · ");
  return `<button class="choice stack" type="button" data-action="begin-quest" data-type="${type}">
    <strong>${esc(QUEST_LABELS[type])}</strong>
    <span>${esc(copy)}</span>
    <span class="muted">${esc(plan.rounds)} round${plan.rounds > 1 ? "s" : ""} · ${esc(names)}</span>
  </button>`;
}

function renderLogger() {
  if (draft.phase === "review") return renderReview();
  if (draft.phase === "rest") return renderRest();
  const step = draft.steps[draft.stepIndex];
  const exercise = getExercise(step.exerciseId);
  const target = state.settings.targets[draft.type]?.exercises?.[step.exerciseId];
  const tired = draft.fatigue && Object.values(draft.fatigue).some(Boolean);
  const pulling = step.exerciseId === "pullups" || step.exerciseId === "scapular";
  app.innerHTML = shell(exercise.short, `
    <section class="logger">
      <div class="grow">
        ${note()}
        <div class="row">
          <div>
            <p class="eyebrow">${esc(QUEST_LABELS[draft.type])}</p>
            <p class="muted">${draft.editing ? "Editing a saved session" : `<span data-elapsed>${esc(formatClock((Date.now() - draft.startedAt) / 1000))}</span>`}</p>
          </div>
          <span class="muted">${draft.stepIndex + 1} / ${draft.steps.length}</span>
        </div>
        <h1>${esc(exercise.name)}</h1>
        <p>${esc(exercise.counts)}</p>
        ${target ? `<p class="muted">Target ${esc(formatTarget(target))}. Log what you actually did. The target is not a completed set.</p>` : `<p class="muted">About two easy minutes. This step does not score exercise XP.</p>`}
        ${tired && pulling ? `<p class="notice">You marked arm fatigue. Skip this if the pull would be hard today.</p>` : ""}
        <p class="notice">${esc(PAIN_NOTICE)}</p>
        ${step.kind === "info" ? "" : renderRounds(step)}
        ${step.skipped ? `<p class="muted">Skipped. It stays in your progression, and these sets will not score.</p>` : ""}
      </div>
      <div class="dock">
        ${step.kind === "info" && !step.done && !step.skipped ? `<button class="primary" type="button" data-action="warmup-done">Warm-up done</button>` : `<button class="primary" type="button" data-action="next-step">${draft.stepIndex === draft.steps.length - 1 ? "Review" : "Next"}</button>`}
        <div class="split">
          <button class="ghost" type="button" data-action="prev-step" ${draft.stepIndex === 0 ? "disabled" : ""}>Back</button>
          <button class="ghost" type="button" data-action="toggle-skip">${step.skipped ? "Undo skip" : "Skip"}</button>
        </div>
        <button class="ghost" type="button" data-action="ask-discard">${draft.editing ? "Cancel edit" : "Discard session"}</button>
        ${draft.confirmDiscard ? `<div class="banner warn stack"><p>${draft.editing ? "Leave without saving these edits? The stored session stays as it is." : "Discard this session? Nothing is saved and there is no completion XP."}</p><button class="danger" type="button" data-action="confirm-discard">${draft.editing ? "Leave without saving" : "Discard without XP"}</button></div>` : ""}
      </div>
    </section>
  `, true);
}

function renderRounds(step) {
  const exercise = getExercise(step.exerciseId);
  return `<div class="stack">${step.rounds.map((round, index) => `
    <section class="card stack">
      <div class="row"><h2>Round ${index + 1}</h2><span class="dots">${step.rounds.map((item, dot) => `<i class="${roundLogged(step, item) ? "on" : ""}" style="order:${dot}"></i>`).join("")}</span></div>
      ${exercise.unit === "perSide" ? sideStepper(step, index, "actualLeft", "Left") + sideStepper(step, index, "actualRight", "Right") : oneStepper(step, index)}
      ${exercise.unit === "sec" ? `<button class="ghost" type="button" data-action="toggle-hold" data-step="${draft.stepIndex}" data-round="${index}" data-hold="${draft.stepIndex}-${index}">${holdTarget && holdTarget.stepIndex === draft.stepIndex && holdTarget.roundIndex === index ? "Pause timer" : "Start timer"}</button>` : ""}
    </section>`).join("")}</div>`;
}

function roundLogged(step, round) {
  const exercise = getExercise(step.exerciseId);
  if (exercise.unit === "perSide") return round.actualLeft != null && round.actualRight != null;
  return round.actual != null;
}

function oneStepper(step, index) {
  const round = step.rounds[index];
  const exercise = getExercise(step.exerciseId);
  return `<div class="stepper">
    <button class="step" type="button" aria-label="Decrease" data-action="bump" data-step="${draft.stepIndex}" data-round="${index}" data-field="actual" data-delta="-1">−</button>
    <div class="count" data-count="${draft.stepIndex}-${index}">${round.actual == null ? "—" : esc(round.actual)}<small>${exercise.unit === "sec" ? "sec" : "reps"}</small></div>
    <button class="step" type="button" aria-label="Increase" data-action="bump" data-step="${draft.stepIndex}" data-round="${index}" data-field="actual" data-delta="1">+</button>
  </div>
  <button class="ghost" type="button" data-action="mark-zero" data-step="${draft.stepIndex}" data-round="${index}" data-field="actual">Log zero</button>`;
}

function sideStepper(step, index, field, label) {
  const value = step.rounds[index][field];
  return `<div class="stack"><span class="muted">${label}</span><div class="stepper">
    <button class="step" type="button" aria-label="Decrease ${label}" data-action="bump" data-step="${draft.stepIndex}" data-round="${index}" data-field="${field}" data-delta="-1">−</button>
    <div class="count">${value == null ? "—" : esc(value)}<small>reps</small></div>
    <button class="step" type="button" aria-label="Increase ${label}" data-action="bump" data-step="${draft.stepIndex}" data-round="${index}" data-field="${field}" data-delta="1">+</button>
  </div>
  <button class="ghost" type="button" data-action="mark-zero" data-step="${draft.stepIndex}" data-round="${index}" data-field="${field}">Log zero ${label.toLowerCase()}</button></div>`;
}

function renderRest() {
  app.innerHTML = shell("Rest", `
    <section class="logger">
      <div class="grow stack">
        <p class="eyebrow">Rest</p>
        <h1 data-rest>${esc(draft.restLeft)}</h1>
        <p class="muted">Seconds. Skip it if you are ready. Rest length can be changed in settings.</p>
      </div>
      <div class="dock">
        <button class="primary" type="button" data-action="skip-rest">Skip rest</button>
        <button class="ghost" type="button" data-action="rest-back">Back to last exercise</button>
      </div>
    </section>
  `, true);
}

function renderReview() {
  const preview = previewWorkoutXp(state, draft);
  const existing = state.workoutHistory.find((item) => item.id === draft.id);
  const delta = existing ? preview.volume - (existing.exerciseXp || 0) : preview.total;
  const issues = allIssues();
  app.innerHTML = shell("Review", `
    <section class="stack">
      ${note()}
      <header class="stack">
        <p class="eyebrow">${esc(QUEST_LABELS[draft.type])}</p>
        <h1>${draft.editing ? "Save changes" : "Finish quest"}</h1>
      </header>
      <section class="card list">
        ${draft.steps.map((step) => {
          const exercise = getExercise(step.exerciseId);
          if (step.kind === "info") return `<div class="item"><strong>${esc(exercise.name)}</strong><span class="muted">${step.skipped ? "Skipped" : step.done ? "Done" : "Not marked"}</span></div>`;
          const detail = step.skipped ? "Skipped" : step.rounds.map((round) => {
            if (exercise.unit === "perSide") return `${round.actualLeft ?? "—"}L/${round.actualRight ?? "—"}R`;
            return round.actual ?? "—";
          }).join(" + ");
          const target = state.settings.targets[draft.type]?.exercises?.[step.exerciseId];
          return `<div class="item"><div class="row"><strong>${esc(exercise.name)}</strong><span>${esc(detail)}</span></div>${target ? `<span class="muted">Target ${esc(formatTarget(target))}</span>` : ""}</div>`;
        }).join("")}
      </section>
      <section class="card stack">
        <div class="row"><span>Exercise XP</span><strong>${esc(preview.volume)}</strong></div>
        <div class="row"><span>Quest bonus</span><strong>${esc(preview.completion)}${preview.editing ? " already awarded" : ""}</strong></div>
        <p class="muted">${preview.editing ? `Saving changes the exercise XP by ${delta >= 0 ? "+" : ""}${delta}. Completion, records, and level bonuses are not awarded again.` : `Saving adds ${preview.total} XP. Planned targets are not included.`}</p>
      </section>
      ${issues.length ? `<div class="banner warn"><p>Log or skip these before saving: ${esc(issues.join(", "))}.</p></div>` : ""}
      <button class="primary" type="button" data-action="save-workout" ${issues.length ? "disabled" : ""}>${draft.editing ? "Save changes" : "Save workout"}</button>
      <button class="ghost" type="button" data-action="back-to-steps">Back to exercises</button>
      <button class="ghost" type="button" data-action="ask-discard">${draft.editing ? "Cancel edit" : "Discard session"}</button>
      ${draft.confirmDiscard ? `<div class="banner warn stack"><p>${draft.editing ? "Leave without saving these edits?" : "Discard this session with no completion XP?"}</p><button class="danger" type="button" data-action="confirm-discard">Confirm</button></div>` : ""}
    </section>
  `, true);
}

function renderDone() {
  const workout = state.workoutHistory[0];
  app.innerHTML = shell("Saved", `
    <header class="stack">
      <p class="eyebrow">Saved</p>
      <h1>Quest logged</h1>
      ${workout ? `<p class="muted">${esc(QUEST_LABELS[workout.type])} · +${esc((workout.exerciseXp || 0) + (workout.completionBonus || 0))} XP</p>` : ""}
    </header>
    ${levelBanner()}
    ${pendingSuggestions.length ? `<section class="card stack"><h2>Possible records</h2><p class="muted">A workout set never overwrites a record on its own. Open a benchmark if you want to test one.</p>${pendingSuggestions.map((item) => `<a class="text-button" href="#/records/${item.exerciseId}?suggest=${item.value}">${esc(getExercise(item.exerciseId).name)}: a set reached ${esc(item.value)}</a>`).join("")}</section>` : ""}
    <a class="primary" href="#/" style="display:flex;align-items:center;justify-content:center;text-decoration:none;">Back home</a>
  `);
}

function renderLevels() {
  app.innerHTML = shell("Levels", `
    ${note()}
    ${levelBanner()}
    <header class="stack">
      <p class="eyebrow">Roadmap</p>
      <h1>Five ranks</h1>
      <p class="muted">Future ranks stay visible and locked. A rank opens only when every benchmark for it is met. Collected XP never substitutes for that.</p>
    </header>
    <div class="roadmap">
      ${LEVELS.map((level) => {
        const status = level.id < state.currentLevel ? "unlocked" : level.id === state.currentLevel ? "current" : "locked";
        const done = state.completedLevels[level.id] || state.completedLevels[String(level.id)];
        const rows = levelRequirementRows(state, level.id);
        return `<article class="node ${status}">
          <div class="rail"><span class="dot"></span><i></i></div>
          <div class="body stack">
            <div class="row"><h2>${esc(level.title)}</h2><span class="muted">${status === "locked" ? "Locked" : status === "current" ? "Current" : "Unlocked"}</span></div>
            <p class="muted">${level.id === 1 ? "Starting rank." : status === "locked" ? "Benchmarks open this rank, not XP." : `Reached ${esc(formatDate(done?.date))}.`} ${status !== "locked" && level.id <= state.currentLevel ? "It stays unlocked even if a record later drops." : ""}</p>
            <div class="list">
              ${rows.map((row) => `<div class="item"><div class="row"><span>${esc(row.name)}</span><strong>${row.met ? "Met" : row.assessed ? "Not yet" : "Not assessed"}</strong></div><span class="muted">${esc(row.requirement)} ${esc(row.unit === "sec" ? "sec" : row.unit === "perSide" ? "per side" : "reps")}${row.milestoneDate ? ` · ${esc(formatDate(row.milestoneDate))}` : ""}</span></div>`).join("")}
            </div>
          </div>
        </article>`;
      }).join("")}
    </div>
  `);
}

function renderRecords() {
  const progress = summarizeProgress(state);
  app.innerHTML = shell("Records", `
    ${note()}
    <header class="stack">
      <p class="eyebrow">Benchmarks</p>
      <h1>Personal records</h1>
      <p class="muted">Workout sets stay in history. A record changes only when you save a benchmark here.</p>
    </header>
    <div class="stack">
      ${progress.items.map((item) => `<a class="choice" href="#/records/${item.exerciseId}">
        <strong>${esc(item.name)}</strong>
        <span>${esc(recordLine(item.exerciseId))}</span>
        <span class="muted">${item.assessed ? esc(item.source === "baseline" ? "Self-reported baseline" : "Recorded benchmark") : "Assess this safely before treating the Level 1 number as yours."}</span>
      </a>`).join("")}
    </div>
  `);
}

function renderRecordForm(exerciseId) {
  const exercise = getExercise(exerciseId);
  if (!exercise || !isProgressExercise(exerciseId)) {
    app.innerHTML = shell("Records", `<p>That exercise has no benchmark.</p>`);
    return;
  }
  const suggest = route().params.get("suggest");
  const needsFull = exerciseId === "lsit" || exerciseId === "hollow";
  const variant = state.settings.legRaiseVariation;
  app.innerHTML = shell(exercise.short, `
    ${note()}
    <header class="stack">
      <p class="eyebrow">Benchmark</p>
      <h1>${esc(exercise.name)}</h1>
      <p>${esc(exercise.counts)}</p>
      <p class="muted">Current: ${esc(recordLine(exerciseId))}. Does not count: ${esc(exercise.doesNotCount)}</p>
    </header>
    <p class="notice">${esc(PAIN_NOTICE)}</p>
    <form class="card stack" data-form="record">
      <input type="hidden" name="exerciseId" value="${esc(exerciseId)}" />
      ${exerciseId === "legRaises" ? `<label class="field">Variation<select name="variant">${LEG_RAISE_VARIATIONS.map((item) => `<option value="${item.id}" ${item.id === variant ? "selected" : ""}>${esc(item.label)}</option>`).join("")}</select></label>` : ""}
      ${exercise.unit === "perSide" ? `<label class="field">Left reps<input name="left" inputmode="numeric" min="0" required value="${esc(suggest || "")}" /></label><label class="field">Right reps<input name="right" inputmode="numeric" min="0" required value="${esc(suggest || "")}" /></label>` : `<label class="field">${exercise.unit === "sec" ? "Seconds" : "Reps"}<input name="value" inputmode="numeric" min="0" required value="${esc(suggest || "")}" /></label>`}
      ${needsFull ? `<label class="check"><input type="checkbox" name="full" value="yes" /><span>This was the full benchmark position. Tucked or one-leg practice cannot be saved as the record.</span></label>` : `<input type="hidden" name="full" value="yes" />`}
      <button class="primary" type="submit">Save benchmark</button>
    </form>
    <a href="#/guide/${exerciseId}">Form guide</a>
  `);
}

function renderHistory(view) {
  const sessions = state.workoutHistory;
  const records = state.recordHistory || [];
  const events = [...state.xpEvents].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  app.innerHTML = shell("History", `
    <header class="stack">
      <p class="eyebrow">History</p>
      <h1>${view === "records" ? "Record history" : view === "xp" ? "XP ledger" : "Sessions"}</h1>
    </header>
    <div class="choice-row" style="flex-wrap:wrap">
      <a class="pill ${view === "sessions" ? "on" : ""}" href="#/history">Sessions</a>
      <a class="pill ${view === "records" ? "on" : ""}" href="#/history/records">Records</a>
      <a class="pill ${view === "xp" ? "on" : ""}" href="#/history/xp">XP</a>
    </div>
    <section class="card list">
      ${view === "records" ? records.map((entry) => `<div class="item"><div class="row"><strong>${esc(getExercise(entry.exerciseId)?.name || entry.exerciseId)}</strong><span>${esc(entry.left != null ? `${entry.left}L/${entry.right}R` : entry.value)}</span></div><span class="muted">${esc(entry.source === "baseline" ? "Self-reported baseline" : "Benchmark")} · ${esc(entry.variant ? variationLabel(entry.variant) : "")} ${esc(formatDate(entry.date))}</span></div>`).join("") || `<p>No records yet.</p>` : ""}
      ${view === "xp" ? events.map((event) => `<div class="item"><div class="row"><strong>${event.amount >= 0 ? "+" : ""}${esc(event.amount)} XP</strong><span class="muted">${esc(formatDate(event.updatedAt || event.date))}</span></div><p class="muted">${esc(event.reason)}</p></div>`).join("") || `<p>No XP yet.</p>` : ""}
      ${view === "sessions" ? sessions.map((workout) => `<a class="item" href="#/session/${workout.id}"><div class="row"><strong>${esc(QUEST_LABELS[workout.type])}</strong><span>+${esc((workout.exerciseXp || 0) + (workout.completionBonus || 0))} XP</span></div><span class="muted">${esc(formatDate(workout.date))}</span></a>`).join("") || `<p>No saved sessions yet.</p>` : ""}
    </section>
  `);
}

function renderSession(id) {
  const workout = state.workoutHistory.find((item) => item.id === id);
  if (!workout) {
    app.innerHTML = shell("History", `<p>That session is not on this device.</p>`);
    return;
  }
  const events = state.xpEvents.filter((event) => event.workoutId === id);
  app.innerHTML = shell("Session", `
    <header class="stack">
      <p class="eyebrow">${esc(formatDate(workout.date))}</p>
      <h1>${esc(QUEST_LABELS[workout.type])}</h1>
      <p class="muted">${esc(formatClock(workout.elapsedSeconds || 0))} · Exercise XP ${esc(workout.exerciseXp || 0)} · Quest bonus ${esc(workout.completionBonus || 0)}</p>
    </header>
    <section class="card list">
      ${workout.steps.map((step) => {
        const exercise = getExercise(step.exerciseId);
        const detail = step.kind === "info" ? (step.skipped ? "Skipped" : "Done") : step.skipped ? "Skipped" : (step.rounds || []).map((round) => exercise?.unit === "perSide" ? `${round.actualLeft ?? 0}L/${round.actualRight ?? 0}R` : (round.actual ?? 0)).join(" + ");
        return `<div class="item"><div class="row"><strong>${esc(exercise?.name || step.exerciseId)}</strong><span>${esc(detail)}</span></div></div>`;
      }).join("")}
    </section>
    ${events.length ? `<section class="card list">${events.map((event) => `<div class="item"><strong>+${esc(event.amount)} XP</strong><p class="muted">${esc(event.reason)}</p></div>`).join("")}</section>` : ""}
    <button class="primary" type="button" data-action="edit-session" data-id="${esc(workout.id)}">Edit session</button>
    <a href="#/history">All sessions</a>
  `);
}

function renderAchievements() {
  const items = state.achievementHistory || [];
  app.innerHTML = shell("Achievements", `
    <header class="stack">
      <p class="eyebrow">Achievements</p>
      <h1>What has been earned</h1>
      <p class="muted">Baseline matches are listed with dates and no XP. Later bonuses are awarded once.</p>
    </header>
    <section class="card list">
      ${items.map((item) => `<div class="item"><div class="row"><strong>${esc(item.title)}</strong><span class="muted">${esc(formatDate(item.date))}</span></div><p class="muted">${esc(item.detail)}</p></div>`).join("") || `<p>None yet.</p>`}
    </section>
  `);
}

function renderGuide(id) {
  const exercise = getExercise(id);
  if (!exercise) {
    app.innerHTML = shell("Guide", `<p>Unknown exercise.</p>`);
    return;
  }
  app.innerHTML = shell(exercise.short, `
    <header class="stack">
      <p class="eyebrow">Form</p>
      <h1>${esc(exercise.name)}</h1>
      <p>${esc(exercise.summary)}</p>
    </header>
    <section class="card stack">
      <h2>What counts</h2>
      <p>${esc(exercise.counts)}</p>
      <h2>What does not</h2>
      <p>${esc(exercise.doesNotCount)}</p>
      <h2>Cues</h2>
      <div class="list">${exercise.cues.map((cue) => `<div class="item">${esc(cue)}</div>`).join("")}</div>
    </section>
    <p class="notice">${esc(PAIN_NOTICE)}</p>
    ${isProgressExercise(id) ? `<a class="text-button" href="#/records/${id}">Record a benchmark</a>` : ""}
  `);
}

function renderGuides() {
  app.innerHTML = shell("Guides", `
    <header class="stack"><p class="eyebrow">Guides</p><h1>How each exercise counts</h1></header>
    <div class="links">${EXERCISES.map((exercise) => `<a href="#/guide/${exercise.id}">${esc(exercise.name)}</a>`).join("")}</div>
  `);
}

function renderMore() {
  app.innerHTML = shell("More", `
    <header class="stack"><p class="eyebrow">More</p><h1>Log and settings</h1></header>
    <div class="links">
      <a href="#/history">Workout history</a>
      <a href="#/history/records">Personal-record history</a>
      <a href="#/history/xp">XP history</a>
      <a href="#/achievements">Achievements</a>
      <a href="#/guides">Exercise instructions</a>
      <a href="#/settings">Settings and backup</a>
      <a href="#/install">Install on iPhone</a>
    </div>
  `);
}

function renderInstall() {
  app.innerHTML = shell("Install", `
    <header class="stack">
      <p class="eyebrow">iPhone</p>
      <h1>Add Climber to your home screen</h1>
      <p class="muted">Safari does not show an automatic install prompt for this app. Use these steps after the site is published over HTTPS.</p>
    </header>
    <section class="card stack">
      <p>1. Publish this repository with GitHub Pages, then open https://kristol.github.io/climber-quest/ in Safari.</p>
      <p>2. Tap Share, then Add to Home Screen.</p>
      <p>3. Open Climber from the new icon. It should launch without the Safari toolbar.</p>
      <p>4. Open it once online so the shell can cache. Then turn on airplane mode, close the app, and open the icon again. The home screen should still load.</p>
    </section>
    <p class="muted">Progress is stored in this browser profile only. Export a backup before you change phones.</p>
  `);
}

function renderSettings() {
  const targets = state.settings.targets;
  app.innerHTML = shell("Settings", `
    ${note()}
    <header class="stack">
      <p class="eyebrow">Settings</p>
      <h1>This device only</h1>
      <p class="muted">Workouts, records, and XP live in local storage on this phone or browser. They do not sync to another device. Export a JSON backup when you want a copy, then import that file on the other device.</p>
    </header>
    <form class="stack" data-form="settings">
      <label class="field">Rest between exercises (seconds)<input name="restSeconds" inputmode="numeric" min="0" value="${esc(state.settings.restSeconds)}" /></label>
      <label class="field">Leg-raise variation used for progress
        <select name="legRaiseVariation">
          <option value="">Not chosen</option>
          ${LEG_RAISE_VARIATIONS.map((item) => `<option value="${item.id}" ${state.settings.legRaiseVariation === item.id ? "selected" : ""}>${esc(item.label)}</option>`).join("")}
        </select>
      </label>
      ${state.personalRecords.legRaises?.pendingBaseline != null && state.settings.legRaiseVariation && !state.personalRecords.legRaises.variations?.[state.settings.legRaiseVariation]?.assessed ? `<button class="ghost" type="button" data-action="assign-baseline">Assign the 10-rep baseline to ${esc(variationLabel(state.settings.legRaiseVariation))}</button>` : ""}
      ${Object.entries(targets).map(([quest, plan]) => `<details class="card" ${quest === "training" ? "open" : ""}>
        <summary><strong>${esc(QUEST_LABELS[quest])} targets</strong></summary>
        <div class="stack" style="margin-top:12px">
          ${Object.entries(plan.exercises).map(([id, target]) => `<div class="split">
            <label class="field">${esc(getExercise(id)?.short || id)} min<input name="target-${quest}-${id}-min" inputmode="numeric" min="0" value="${esc(target.min)}" /></label>
            <label class="field">max<input name="target-${quest}-${id}-max" inputmode="numeric" min="0" value="${esc(target.max)}" /></label>
          </div>`).join("")}
        </div>
      </details>`).join("")}
      <button class="primary" type="submit">Save settings</button>
    </form>
    <section class="card stack">
      <h2>Backup</h2>
      <button class="ghost" type="button" data-action="export-data">Export JSON</button>
      <label class="field">Import JSON<input type="file" accept="application/json,.json" data-action="import-file" /></label>
    </section>
    <section class="card stack">
      <h2>Reset</h2>
      <p class="muted">This deletes workouts, records, and XP stored by Climber Quest on this device.</p>
      ${confirmReset ? `<button class="danger" type="button" data-action="reset-confirm">Yes, erase progress</button><button class="ghost" type="button" data-action="reset-cancel">Keep my progress</button>` : `<button class="danger" type="button" data-action="reset-ask">Reset progress</button>`}
    </section>
  `);
}

function startClocks() {
  stopClocks();
  const elapsed = document.querySelector("[data-elapsed]");
  if (elapsed && draft && !draft.editing) {
    clockTimer = setInterval(() => {
      const node = document.querySelector("[data-elapsed]");
      if (!node || !draft) return;
      node.textContent = formatClock((Date.now() - draft.startedAt) / 1000);
    }, 1000);
  }
  if (draft?.phase === "rest") {
    restTimer = setInterval(() => {
      if (!draft || draft.phase !== "rest") return;
      draft.restLeft -= 1;
      const node = document.querySelector("[data-rest]");
      if (node) node.textContent = String(Math.max(0, draft.restLeft));
      if (draft.restLeft <= 0) {
        draft.phase = "work";
        draft.stepIndex += 1;
        saveDraft(draft);
        render();
      }
    }, 1000);
  }
}

function render() {
  stopClocks();
  if (!state.settings.setupComplete) {
    renderSetup();
    return;
  }
  const { parts } = route();
  const [head, second] = parts;
  if (!head) renderDashboard();
  else if (head === "workout") draft ? renderLogger() : renderWorkoutPicker();
  else if (head === "done") renderDone();
  else if (head === "levels") renderLevels();
  else if (head === "records" && second) renderRecordForm(second);
  else if (head === "records") renderRecords();
  else if (head === "history") renderHistory(second === "records" ? "records" : second === "xp" ? "xp" : "sessions");
  else if (head === "session" && second) renderSession(decodeURIComponent(second));
  else if (head === "achievements") renderAchievements();
  else if (head === "guide" && second) renderGuide(second);
  else if (head === "guides") renderGuides();
  else if (head === "settings") renderSettings();
  else if (head === "install") renderInstall();
  else if (head === "more") renderMore();
  else renderDashboard();
  startClocks();
}

function bump(data, delta) {
  stopHold();
  const step = draft.steps[Number(data.step)];
  const round = step.rounds[Number(data.round)];
  const field = data.field || "actual";
  if (round[field] == null) round[field] = delta > 0 ? 1 : 0;
  else round[field] = Math.max(0, round[field] + delta);
  message = "";
  commit();
}

function goNext() {
  stopHold();
  const issues = stepIssues(draft.steps[draft.stepIndex]);
  if (issues.length) {
    message = `Log each side or round, or skip the exercise. Still open: ${issues.join(", ")}.`;
    commit();
    return;
  }
  message = "";
  if (draft.stepIndex >= draft.steps.length - 1) {
    draft.phase = "review";
    commit();
    return;
  }
  const rest = Number(state.settings.restSeconds) || 0;
  if (rest > 0) {
    draft.phase = "rest";
    draft.restLeft = rest;
  } else {
    draft.stepIndex += 1;
  }
  commit();
}

function saveCurrentWorkout() {
  const issues = allIssues();
  if (issues.length) {
    message = `Log or skip these before saving: ${issues.join(", ")}.`;
    render();
    return;
  }
  if (!draft.editing) draft.elapsedSeconds = Math.max(1, Math.round((Date.now() - draft.startedAt) / 1000));
  pendingSuggestions = draft.type === "training" ? suggestRecords(state, draft) : [];
  saveWorkout(state, draft);
  draft = null;
  saveDraft(null);
  saveState(state);
  message = "";
  go("#/done");
}

function saveRecord(form) {
  const data = new FormData(form);
  const exerciseId = String(data.get("exerciseId"));
  const exercise = getExercise(exerciseId);
  const full = data.get("full") === "yes";
  const payload = {
    exerciseId,
    variant: data.get("variant") ? String(data.get("variant")) : undefined,
    value: data.get("value"),
    left: data.get("left"),
    right: data.get("right"),
    form: full ? "full" : "partial",
    source: "benchmark",
  };
  const probe = exercise.unit === "perSide"
    ? Math.min(Number(payload.left) || 0, Number(payload.right) || 0)
    : Number(payload.value) || 0;
  const current = compareValue(exerciseId, {
    ...state.personalRecords[exerciseId],
    assessed: exerciseId === "legRaises" ? Boolean(state.personalRecords.legRaises.variations?.[payload.variant || state.settings.legRaiseVariation]?.assessed) : state.personalRecords[exerciseId]?.assessed,
    ...(exerciseId === "legRaises" ? state.personalRecords.legRaises.variations?.[payload.variant || state.settings.legRaiseVariation] : {}),
  });
  if (current != null && probe < current && data.get("replaceLower") !== "yes") {
    message = "That is lower than the saved record. Tick “Replace with a lower record” if you mean to correct it. No XP is removed either way.";
    const box = form.querySelector("[name=replaceLower]");
    if (!box) {
      form.insertAdjacentHTML("beforeend", `<label class="check"><input type="checkbox" name="replaceLower" value="yes" /><span>Replace with a lower record</span></label>`);
    }
    const banner = document.createElement("div");
    banner.className = "banner warn";
    banner.innerHTML = `<p>${esc(message)}</p>`;
    form.prepend(banner);
    return;
  }
  const result = setPersonalRecord(state, payload);
  if (result.error) {
    message = result.error;
    render();
    return;
  }
  message = "Record saved. Progress now uses this benchmark.";
  pendingSuggestions = [];
  saveState(state);
  go("#/records");
}

function saveSettings(form) {
  const data = new FormData(form);
  state.settings.restSeconds = Math.max(0, Math.round(Number(data.get("restSeconds")) || 0));
  const variation = String(data.get("legRaiseVariation") || "") || null;
  state.settings.legRaiseVariation = variation;
  state.exerciseVariants.legRaises = variation;
  for (const [quest, plan] of Object.entries(state.settings.targets)) {
    for (const id of Object.keys(plan.exercises)) {
      const min = Math.max(0, Math.round(Number(data.get(`target-${quest}-${id}-min`)) || 0));
      const max = Math.max(min, Math.round(Number(data.get(`target-${quest}-${id}-max`)) || min));
      plan.exercises[id].min = min;
      plan.exercises[id].max = max;
    }
  }
  message = "Settings saved.";
  commit();
}

async function readImport(file) {
  const text = await file.text();
  const result = importState(state, text);
  if (!result.ok) {
    message = result.error;
    render();
    return;
  }
  state = result.state;
  message = "Backup imported. Rewards already in the file were not granted again.";
  saveState(state);
  render();
}

function runAction(data) {
  const action = data.action;
  if (action === "choose-variation") {
    const result = confirmLegRaiseBaseline(state, data.variant);
    message = result.error || "";
    commit();
    return;
  }
  if (action === "setup-later") {
    dismissSetup(state);
    message = "Leg raises stay unassessed until you pick a variation in settings.";
    commit();
    return;
  }
  if (action === "toggle-fatigue") {
    fatigue[data.key] = !fatigue[data.key];
    render();
    return;
  }
  if (action === "begin-quest") {
    stopHold();
    draft = createDraft(data.type);
    message = "";
    saveDraft(draft);
    go("#/workout");
    return;
  }
  if (action === "bump") {
    bump(data, Number(data.delta));
    return;
  }
  if (action === "mark-zero") {
    stopHold();
    draft.steps[Number(data.step)].rounds[Number(data.round)][data.field || "actual"] = 0;
    message = "";
    commit();
    return;
  }
  if (action === "toggle-hold") {
    const stepIndex = Number(data.step);
    const roundIndex = Number(data.round);
    if (holdTarget && holdTarget.stepIndex === stepIndex && holdTarget.roundIndex === roundIndex) {
      stopHold();
      saveDraft(draft);
      render();
      return;
    }
    stopHold();
    const round = draft.steps[stepIndex].rounds[roundIndex];
    if (round.actual == null) round.actual = 0;
    holdTarget = { stepIndex, roundIndex };
    holdTimer = setInterval(() => {
      if (!draft || !holdTarget) return;
      const live = draft.steps[holdTarget.stepIndex]?.rounds[holdTarget.roundIndex];
      if (!live) return stopHold();
      live.actual += 1;
      const node = document.querySelector(`[data-count="${holdTarget.stepIndex}-${holdTarget.roundIndex}"]`);
      if (node) node.firstChild.textContent = String(live.actual);
      saveDraft(draft);
    }, 1000);
    render();
    return;
  }
  if (action === "warmup-done") {
    draft.steps[draft.stepIndex].done = true;
    goNext();
    return;
  }
  if (action === "toggle-skip") {
    stopHold();
    const step = draft.steps[draft.stepIndex];
    step.skipped = !step.skipped;
    if (step.kind === "info" && step.skipped) step.done = false;
    message = "";
    goNext();
    return;
  }
  if (action === "next-step") {
    goNext();
    return;
  }
  if (action === "prev-step") {
    stopHold();
    if (draft.stepIndex > 0) draft.stepIndex -= 1;
    draft.phase = "work";
    message = "";
    commit();
    return;
  }
  if (action === "skip-rest") {
    draft.phase = "work";
    draft.stepIndex += 1;
    commit();
    return;
  }
  if (action === "rest-back") {
    draft.phase = "work";
    commit();
    return;
  }
  if (action === "back-to-steps") {
    draft.phase = "work";
    draft.stepIndex = draft.steps.length - 1;
    message = "";
    commit();
    return;
  }
  if (action === "ask-discard") {
    draft.confirmDiscard = true;
    commit();
    return;
  }
  if (action === "confirm-discard") {
    stopHold();
    draft = null;
    message = "";
    saveDraft(null);
    go("#/");
    return;
  }
  if (action === "save-workout") {
    saveCurrentWorkout();
    return;
  }
  if (action === "confirm-level") {
    const result = confirmLevelUp(state);
    message = result.awarded ? `${result.level.title} unlocked. +100 XP.` : "That rank is not ready.";
    commit();
    return;
  }
  if (action === "edit-session") {
    const workout = state.workoutHistory.find((item) => item.id === data.id);
    if (!workout) return;
    stopHold();
    draft = structuredClone(workout);
    draft.phase = "work";
    draft.stepIndex = 0;
    draft.editing = true;
    draft.confirmDiscard = false;
    draft.status = "in-progress";
    saveDraft(draft);
    go("#/workout");
    return;
  }
  if (action === "export-data") {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `climber-quest-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }
  if (action === "assign-baseline") {
    if (!state.settings.legRaiseVariation) return;
    confirmLegRaiseBaseline(state, state.settings.legRaiseVariation);
    message = "Baseline assigned to this variation. No bonus XP was added.";
    commit();
    return;
  }
  if (action === "reset-ask") {
    confirmReset = true;
    render();
    return;
  }
  if (action === "reset-cancel") {
    confirmReset = false;
    render();
    return;
  }
  if (action === "reset-confirm") {
    stopHold();
    state = createInitialState();
    draft = null;
    confirmReset = false;
    message = "Progress on this device was erased.";
    saveDraft(null);
    saveState(state);
    go("#/");
  }
}

app.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.dataset.action === "import-file") return;
  if (button.tagName === "A") return;
  runAction(button.dataset);
});

app.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (form.dataset.form === "record" || form.dataset.form === "settings") {
    event.preventDefault();
    if (form.dataset.form === "record") saveRecord(form);
    else saveSettings(form);
  }
});

app.addEventListener("change", (event) => {
  const input = event.target;
  if (input?.dataset?.action === "import-file" && input.files?.[0]) readImport(input.files[0]);
});

window.addEventListener("hashchange", render);
document.addEventListener("visibilitychange", () => {
  if (draft) saveDraft(draft);
});

function registerWorker() {
  if (!("serviceWorker" in navigator)) return;
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.register("./sw.js").then((registration) => {
    const announce = () => {
      if (hadController && registration.waiting) {
        document.querySelector("#update-banner").hidden = false;
      }
    };
    registration.addEventListener("updatefound", () => {
      registration.installing?.addEventListener("statechange", announce);
    });
    announce();
  }).catch(() => {});
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });
}

document.querySelector("#apply-update").addEventListener("click", async () => {
  const registration = await navigator.serviceWorker.getRegistration();
  registration?.waiting?.postMessage("skip-waiting");
});

registerWorker();
render();
