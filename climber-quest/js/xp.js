import { BONUS, COMPLETION_XP, LEVELS, QUEST_LABELS, XP_RATES, levelById } from "./config.js";
import { getExercise, variationLabel } from "./exercises.js";
import { activeRecord, compareValue, summarizeProgress } from "./progression.js";
import { recomputeTotal } from "./storage.js";

function stamp(date) {
  return date || new Date().toISOString();
}

function eventExists(state, id) {
  return state.xpEvents.some((event) => event.id === id);
}

function addEvent(state, event) {
  if (eventExists(state, event.id)) return false;
  state.xpEvents.unshift(event);
  return true;
}

function addAchievement(state, achievement) {
  if (state.achievementHistory.some((item) => item.id === achievement.id)) return;
  state.achievementHistory.unshift(achievement);
}

export function workoutVolumeXp(workout) {
  let sum = 0;
  for (const step of workout.steps || []) {
    if (step.kind === "info" || step.skipped) continue;
    const rate = XP_RATES[step.exerciseId];
    if (!rate) continue;
    for (const round of step.rounds || []) {
      if (step.exerciseId === "lunge") {
        sum += rate * ((Number(round.actualLeft) || 0) + (Number(round.actualRight) || 0));
      } else {
        sum += rate * (Number(round.actual) || 0);
      }
    }
  }
  return Math.round(sum);
}

export function volumeReason(workout) {
  const parts = [];
  for (const step of workout.steps || []) {
    if (step.kind === "info" || step.skipped) continue;
    const exercise = getExercise(step.exerciseId);
    if (!exercise || !XP_RATES[step.exerciseId]) continue;
    const bits = (step.rounds || []).map((round) => {
      if (step.exerciseId === "lunge") {
        return `${Number(round.actualLeft) || 0}L+${Number(round.actualRight) || 0}R`;
      }
      return String(Number(round.actual) || 0);
    });
    parts.push(`${exercise.short} ${bits.join(" + ")}`);
  }
  if (!parts.length) return "No scored sets were logged.";
  return `Logged work: ${parts.join("; ")}.`;
}

export function previewWorkoutXp(state, workout) {
  const volume = workoutVolumeXp(workout);
  const existing = state.workoutHistory.find((item) => item.id === workout.id);
  const completion = existing ? Number(existing.completionBonus) || 0 : COMPLETION_XP[workout.type] ?? 0;
  return {
    volume,
    completion,
    total: volume + completion,
    editing: Boolean(existing),
  };
}

export function saveWorkout(state, workout, date = new Date().toISOString()) {
  if (!workout || workout.status === "discarded") return state;
  const existing = state.workoutHistory.find((item) => item.id === workout.id);
  const volume = workoutVolumeXp(workout);
  const saved = structuredClone(workout);
  saved.status = "completed";
  saved.date = existing?.date || workout.date || date;
  saved.finishedAt = date;
  saved.exerciseXp = volume;
  saved.completionBonus = existing ? Number(existing.completionBonus) || 0 : COMPLETION_XP[workout.type] ?? 0;
  delete saved.phase;
  delete saved.stepIndex;
  delete saved.restLeft;
  delete saved.editing;

  if (existing) {
    const index = state.workoutHistory.findIndex((item) => item.id === workout.id);
    state.workoutHistory.splice(index, 1, saved);
  } else {
    state.workoutHistory.unshift(saved);
    addEvent(state, {
      id: `workout:${saved.id}:completion`,
      date,
      amount: saved.completionBonus,
      kind: "completion",
      workoutId: saved.id,
      reason: `Completed a saved ${QUEST_LABELS[saved.type] || "quest"}.`,
    });
  }

  const volumeEvent = {
    id: `workout:${saved.id}:volume`,
    date: existing?.date || date,
    updatedAt: date,
    amount: volume,
    kind: "volume",
    workoutId: saved.id,
    reason: volumeReason(saved),
  };
  const volumeIndex = state.xpEvents.findIndex((event) => event.id === volumeEvent.id);
  if (volumeIndex >= 0) state.xpEvents.splice(volumeIndex, 1, volumeEvent);
  else state.xpEvents.unshift(volumeEvent);

  recomputeTotal(state);
  return state;
}

function writeRecord(state, exerciseId, variant, record) {
  if (exerciseId === "legRaises") {
    state.personalRecords.legRaises.variations[variant] = record;
    return;
  }
  state.personalRecords[exerciseId] = record;
}

export function setPersonalRecord(state, input) {
  const date = stamp(input.date);
  const exerciseId = input.exerciseId;
  const variant = exerciseId === "legRaises" ? input.variant || state.settings.legRaiseVariation : null;
  if (exerciseId === "legRaises" && !variant) {
    return { state, error: "Choose a leg-raise variation before saving a record." };
  }
  if ((exerciseId === "lsit" || exerciseId === "hollow") && input.form !== "full") {
    return { state, error: "Only the full position can be saved as this record." };
  }

  const previous = activeRecord(
    exerciseId === "legRaises"
      ? { ...state, settings: { ...state.settings, legRaiseVariation: variant } }
      : state,
    exerciseId,
  );
  const previousValue = previous.assessed ? compareValue(exerciseId, previous) : null;

  const record = {
    assessed: true,
    source: input.source || "benchmark",
    date,
    form: input.form || "full",
  };
  if (exerciseId === "lunge") {
    record.left = Math.max(0, Math.round(Number(input.left) || 0));
    record.right = Math.max(0, Math.round(Number(input.right) || 0));
  } else {
    record.value = Math.max(0, Math.round(Number(input.value) || 0));
    if (variant) record.variant = variant;
  }

  const nextValue = compareValue(exerciseId, record);
  writeRecord(state, exerciseId, variant, record);
  if (exerciseId === "legRaises") {
    state.settings.legRaiseVariation = variant;
    state.exerciseVariants.legRaises = variant;
    state.settings.setupComplete = true;
  }

  state.recordHistory.unshift({
    exerciseId,
    variant,
    value: record.value ?? null,
    left: record.left ?? null,
    right: record.right ?? null,
    date,
    source: record.source,
    form: record.form,
  });

  let prAwarded = false;
  const improved = previousValue == null ? nextValue > 0 : nextValue > previousValue;
  if (record.source !== "baseline" && improved) {
    const prId = `pr:${exerciseId}:${variant || "default"}:${nextValue}`;
    prAwarded = addEvent(state, {
      id: prId,
      date,
      amount: BONUS.pr,
      kind: "pr",
      exerciseId,
      reason: `New ${getExercise(exerciseId).name} record: ${formatRecordValue(exerciseId, record)}.`,
    });
    if (prAwarded) {
      addAchievement(state, {
        id: prId,
        date,
        title: `New record — ${getExercise(exerciseId).short}`,
        detail: formatRecordValue(exerciseId, record),
      });
    }
  }

  const milestones = [];
  for (const level of LEVELS) {
    const id = `req:${level.id}:${exerciseId}`;
    if (state.completedMilestones[id]) continue;
    if (nextValue < level.requirements[exerciseId]) continue;
    state.completedMilestones[id] = {
      date,
      xpAwarded: BONUS.requirement,
      source: record.source,
      exerciseId,
      level: level.id,
    };
    const awarded = addEvent(state, {
      id,
      date,
      amount: BONUS.requirement,
      kind: "requirement",
      exerciseId,
      reason: `${getExercise(exerciseId).name} met the ${level.title} benchmark for the first time.`,
    });
    if (awarded) {
      addAchievement(state, {
        id,
        date,
        title: `${getExercise(exerciseId).short} — ${level.title}`,
        detail: "First time this level's benchmark was met. +20 XP.",
      });
      milestones.push(id);
    }
  }

  recomputeTotal(state);
  return { state, error: null, prAwarded, milestones, levelReady: levelUpAvailable(state) };
}

export function confirmLegRaiseBaseline(state, variationId, date = new Date().toISOString()) {
  if (!["lying", "hangingKnee", "hangingStraight"].includes(variationId)) {
    return { state, error: "Unknown leg-raise variation." };
  }
  const existing = state.personalRecords.legRaises.variations[variationId];
  state.settings.legRaiseVariation = variationId;
  state.settings.setupComplete = true;
  state.exerciseVariants.legRaises = variationId;
  if (!existing?.assessed && state.personalRecords.legRaises.pendingBaseline != null) {
    const value = state.personalRecords.legRaises.pendingBaseline;
    state.personalRecords.legRaises.variations[variationId] = {
      assessed: true,
      value,
      source: "baseline",
      date,
      form: "full",
      variant: variationId,
    };
    state.recordHistory.unshift({
      exerciseId: "legRaises",
      variant: variationId,
      value,
      date,
      source: "baseline",
      form: "full",
    });
    const level = LEVELS[0];
    const id = "req:1:legRaises";
    if (value >= level.requirements.legRaises && !state.completedMilestones[id]) {
      state.completedMilestones[id] = {
        date,
        xpAwarded: 0,
        source: "baseline",
        exerciseId: "legRaises",
        level: 1,
      };
      addAchievement(state, {
        id,
        date,
        title: `Leg raises — Initiate`,
        detail: `Self-reported baseline of ${value} ${variationLabel(variationId)} meets the Initiate benchmark. No XP bonus.`,
      });
    }
  }
  return { state, error: null };
}

export function dismissSetup(state) {
  state.settings.setupComplete = true;
  return state;
}

export function levelUpAvailable(state) {
  if (state.currentLevel >= 5) return null;
  const nextId = state.currentLevel + 1;
  if (state.completedLevels[String(nextId)] || state.completedLevels[nextId]) return null;
  if (eventExists(state, `level:${nextId}`)) return null;
  const progress = summarizeProgress(state);
  return progress.ready ? nextId : null;
}

export function confirmLevelUp(state, date = new Date().toISOString()) {
  const nextId = levelUpAvailable(state);
  if (!nextId) return { state, awarded: false };
  const level = levelById(nextId);
  state.currentLevel = nextId;
  state.completedLevels[nextId] = { date, source: "earned", title: level.title };
  const id = `level:${nextId}`;
  addEvent(state, {
    id,
    date,
    amount: BONUS.level,
    kind: "level",
    reason: `Level ${nextId} — ${level.title} confirmed. XP does not replace the benchmarks.`,
  });
  addAchievement(state, {
    id,
    date,
    title: level.title,
    detail: `Level ${nextId} unlocked after every benchmark was met. +${BONUS.level} XP.`,
  });
  recomputeTotal(state);
  return { state, awarded: true, level };
}

export function formatRecordValue(exerciseId, record) {
  if (exerciseId === "lunge") return `${record.left} left / ${record.right} right`;
  const exercise = getExercise(exerciseId);
  const unit = exercise?.unit === "sec" ? "sec" : "reps";
  const variant = record.variant ? ` (${variationLabel(record.variant)})` : "";
  return `${record.value} ${unit}${variant}`;
}

export function suggestRecords(state, workout) {
  const suggestions = [];
  for (const step of workout.steps || []) {
    if (!XP_RATES[step.exerciseId] || step.skipped) continue;
    if (step.exerciseId === "lsit" || step.exerciseId === "hollow") continue;
    const record = activeRecord(state, step.exerciseId);
    const best = (step.rounds || []).reduce((max, round) => {
      if (step.exerciseId === "lunge") {
        const left = Number(round.actualLeft) || 0;
        const right = Number(round.actualRight) || 0;
        return Math.max(max, Math.min(left, right));
      }
      return Math.max(max, Number(round.actual) || 0);
    }, 0);
    const current = record.assessed ? compareValue(step.exerciseId, record) : null;
    if (best > 0 && (current == null || best > current)) {
      suggestions.push({ exerciseId: step.exerciseId, value: best, current });
    }
  }
  return suggestions;
}
