import { LEVELS, PROGRESS_EXERCISE_IDS, levelById } from "./config.js";
import { getExercise, variationLabel } from "./exercises.js";

export function compareValue(exerciseId, record) {
  if (!record || !record.assessed) return null;
  if (exerciseId === "lunge") {
    const left = Number(record.left);
    const right = Number(record.right);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
    return Math.min(left, right);
  }
  const value = Number(record.value);
  return Number.isFinite(value) ? value : null;
}

export function activeRecord(state, exerciseId) {
  const records = state.personalRecords || {};
  if (exerciseId === "legRaises") {
    const variant = state.settings?.legRaiseVariation || state.exerciseVariants?.legRaises || null;
    if (!variant) {
      return { assessed: false, reason: "variation", variant: null };
    }
    const stored = records.legRaises?.variations?.[variant];
    if (!stored?.assessed) {
      return { assessed: false, reason: "untested", variant };
    }
    return { ...stored, assessed: true, variant };
  }
  const stored = records[exerciseId];
  if (!stored?.assessed) return { assessed: false, reason: "untested" };
  return { ...stored, assessed: true };
}

export function requirementMet(exerciseId, record, requirement) {
  const value = compareValue(exerciseId, record);
  if (value == null) return false;
  return value >= requirement;
}

export function summarizeProgress(state) {
  const currentLevel = state.currentLevel;
  const atMax = currentLevel >= 5;
  const targetLevel = levelById(atMax ? 5 : currentLevel + 1);
  const items = PROGRESS_EXERCISE_IDS.map((exerciseId) => {
    const exercise = getExercise(exerciseId);
    const record = activeRecord(state, exerciseId);
    const requirement = targetLevel.requirements[exerciseId];
    if (!record.assessed) {
      return {
        exerciseId,
        name: exercise.name,
        unit: exercise.unit,
        assessed: false,
        reason: record.reason,
        variant: record.variant || null,
        requirement,
        statusLabel: record.reason === "variation" ? "Variation not chosen" : "Not assessed",
      };
    }
    const value = compareValue(exerciseId, record);
    const ratio = Math.min(value / requirement, 1);
    const remaining = Math.max(0, requirement - value);
    return {
      exerciseId,
      name: exercise.name,
      unit: exercise.unit,
      assessed: true,
      value,
      left: record.left ?? null,
      right: record.right ?? null,
      variant: record.variant || null,
      variantLabel: record.variant ? variationLabel(record.variant) : null,
      source: record.source || null,
      date: record.date || null,
      requirement,
      ratio,
      remaining,
      met: value >= requirement,
    };
  });

  const assessed = items.filter((item) => item.assessed);
  const average = assessed.length
    ? assessed.reduce((sum, item) => sum + item.ratio, 0) / assessed.length
    : null;
  const open = assessed.filter((item) => !item.met).sort((a, b) => a.ratio - b.ratio);
  const ready = !atMax && items.every((item) => item.assessed && item.met);

  return {
    currentLevel,
    currentTitle: levelById(currentLevel).title,
    targetLevel: targetLevel.id,
    targetTitle: targetLevel.title,
    atMax,
    items,
    average,
    assessedCount: assessed.length,
    totalCount: items.length,
    furthest: open[0] || null,
    ready,
  };
}

export function levelRequirementRows(state, levelId) {
  const level = levelById(levelId);
  return PROGRESS_EXERCISE_IDS.map((exerciseId) => {
    const exercise = getExercise(exerciseId);
    const record = activeRecord(state, exerciseId);
    const requirement = level.requirements[exerciseId];
    const met = requirementMet(exerciseId, record, requirement);
    const milestone = state.completedMilestones?.[`req:${levelId}:${exerciseId}`] || null;
    return {
      exerciseId,
      name: exercise.name,
      unit: exercise.unit,
      requirement,
      assessed: Boolean(record.assessed),
      value: record.assessed ? compareValue(exerciseId, record) : null,
      met,
      milestoneDate: milestone?.date || null,
    };
  });
}

export function unitNoun(unit, count) {
  if (unit === "sec") return count === 1 ? "second" : "seconds";
  if (unit === "perSide") return "per side";
  return count === 1 ? "rep" : "reps";
}
