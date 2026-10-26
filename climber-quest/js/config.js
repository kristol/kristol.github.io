export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = "climber-quest-state";
export const DRAFT_KEY = "climber-quest-draft";

export const LEVELS = [
  {
    id: 1,
    title: "Initiate",
    requirements: { pullups: 3, pushups: 25, legRaises: 10, lsit: 10, scapular: 5, hollow: 15, lunge: 8 },
  },
  {
    id: 2,
    title: "Apprentice",
    requirements: { pullups: 5, pushups: 30, legRaises: 12, lsit: 15, scapular: 8, hollow: 25, lunge: 10 },
  },
  {
    id: 3,
    title: "Adept",
    requirements: { pullups: 8, pushups: 40, legRaises: 15, lsit: 25, scapular: 10, hollow: 35, lunge: 12 },
  },
  {
    id: 4,
    title: "Elite",
    requirements: { pullups: 12, pushups: 50, legRaises: 18, lsit: 40, scapular: 12, hollow: 45, lunge: 15 },
  },
  {
    id: 5,
    title: "Master",
    requirements: { pullups: 20, pushups: 60, legRaises: 20, lsit: 60, scapular: 15, hollow: 60, lunge: 20 },
  },
];

export const XP_RATES = {
  pullups: 3,
  pushups: 0.5,
  legRaises: 1,
  lsit: 0.5,
  scapular: 1,
  hollow: 0.25,
  lunge: 0.5,
};

export const COMPLETION_XP = {
  training: 10,
  climbing: 5,
  recovery: 3,
};

export const BONUS = {
  pr: 10,
  requirement: 20,
  level: 100,
};

export const PROGRESS_EXERCISE_IDS = ["pullups", "pushups", "legRaises", "lsit", "scapular", "hollow", "lunge"];

export const DEFAULT_TARGETS = {
  training: {
    rounds: 2,
    exercises: {
      pullups: { min: 1, max: 2, unit: "reps" },
      pushups: { min: 10, max: 15, unit: "reps" },
      legRaises: { min: 5, max: 8, unit: "reps" },
      lsit: { min: 4, max: 6, unit: "sec" },
      scapular: { min: 3, max: 5, unit: "reps" },
      hollow: { min: 10, max: 15, unit: "sec" },
      lunge: { min: 5, max: 5, unit: "perSide" },
    },
  },
  climbing: {
    rounds: 1,
    exercises: {
      wrists: { min: 20, max: 30, unit: "sec" },
      shoulders: { min: 8, max: 10, unit: "reps" },
      hips: { min: 6, max: 8, unit: "perSide" },
      deadbug: { min: 4, max: 6, unit: "perSide" },
      balance: { min: 5, max: 5, unit: "perSide" },
    },
  },
  recovery: {
    rounds: 1,
    exercises: {
      breath: { min: 30, max: 45, unit: "sec" },
      forearms: { min: 20, max: 30, unit: "sec" },
      slides: { min: 6, max: 8, unit: "reps" },
      hips: { min: 6, max: 8, unit: "perSide" },
    },
  },
};

export const QUEST_LABELS = {
  training: "Training quest",
  climbing: "Climbing-day quest",
  recovery: "Recovery quest",
};

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function formatTarget(target) {
  if (!target) return "";
  const unit = target.unit === "sec" ? "sec" : target.unit === "perSide" ? "per side" : "reps";
  if (target.min === target.max) return `${target.min} ${unit}`;
  return `${target.min}–${target.max} ${unit}`;
}

export function levelById(id) {
  return LEVELS.find((level) => level.id === id) || null;
}

export function defaultSettings() {
  return {
    restSeconds: 30,
    legRaiseVariation: null,
    setupComplete: false,
    targets: clone(DEFAULT_TARGETS),
  };
}
