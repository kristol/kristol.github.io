import { SCHEMA_VERSION, STORAGE_KEY, DRAFT_KEY, defaultSettings } from "./config.js";

function baselineRecord(value, date) {
  return { assessed: true, value, source: "baseline", date, form: "full" };
}

export function createInitialState(date = new Date().toISOString()) {
  const milestone = (exerciseId) => ({
    date,
    xpAwarded: 0,
    source: "baseline",
    exerciseId,
    level: 1,
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: date,
    settings: defaultSettings(),
    currentLevel: 1,
    totalXP: 0,
    personalRecords: {
      pullups: baselineRecord(3, date),
      pushups: baselineRecord(25, date),
      lsit: baselineRecord(10, date),
      scapular: { assessed: false },
      hollow: { assessed: false },
      lunge: { assessed: false },
      legRaises: {
        pendingBaseline: 10,
        variations: { lying: null, hangingKnee: null, hangingStraight: null },
      },
    },
    exerciseVariants: { legRaises: null },
    workoutHistory: [],
    xpEvents: [],
    completedMilestones: {
      "req:1:pullups": milestone("pullups"),
      "req:1:pushups": milestone("pushups"),
      "req:1:lsit": milestone("lsit"),
    },
    completedLevels: {
      1: { date, source: "initial", title: "Initiate" },
    },
    achievementHistory: [
      {
        id: "level:1",
        date,
        title: "Initiate",
        detail: "Starting rank. Level 1 is unlocked from the beginning.",
      },
      {
        id: "req:1:pullups",
        date,
        title: "Strict pull-ups — Initiate",
        detail: "Self-reported baseline of 3 reps meets the Initiate benchmark. No XP bonus.",
      },
      {
        id: "req:1:pushups",
        date,
        title: "Strict push-ups — Initiate",
        detail: "Self-reported baseline of 25 reps meets the Initiate benchmark. No XP bonus.",
      },
      {
        id: "req:1:lsit",
        date,
        title: "Strict L-sit — Initiate",
        detail: "Self-reported baseline of 10 seconds meets the Initiate benchmark. No XP bonus.",
      },
    ],
    recordHistory: [
      { exerciseId: "pullups", value: 3, date, source: "baseline", form: "full" },
      { exerciseId: "pushups", value: 25, date, source: "baseline", form: "full" },
      { exerciseId: "lsit", value: 10, date, source: "baseline", form: "full" },
    ],
  };
}

function fail(error) {
  return { ok: false, error, state: null };
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function recomputeTotal(state) {
  state.totalXP = state.xpEvents.reduce((sum, event) => sum + Number(event.amount || 0), 0);
  return state;
}

export function migrate(input) {
  if (!isObject(input)) return fail("That file is not a Climber Quest backup.");
  if (input.schemaVersion !== SCHEMA_VERSION) {
    return fail("This backup uses a schema this version of the app cannot read.");
  }
  if (!isObject(input.settings) || !isObject(input.personalRecords)) {
    return fail("The backup is missing settings or personal records.");
  }
  if (!Number.isInteger(input.currentLevel) || input.currentLevel < 1 || input.currentLevel > 5) {
    return fail("The backup has an invalid level.");
  }
  if (!Array.isArray(input.workoutHistory) || !Array.isArray(input.xpEvents)) {
    return fail("The backup is missing workout or XP history.");
  }
  if (!isObject(input.completedMilestones) || !isObject(input.completedLevels)) {
    return fail("The backup is missing achievement records.");
  }

  const ids = new Set();
  for (const event of input.xpEvents) {
    if (!isObject(event) || typeof event.id !== "string" || !Number.isFinite(Number(event.amount))) {
      return fail("An XP entry in the backup is invalid.");
    }
    if (ids.has(event.id)) return fail("The backup repeats an XP reward and was rejected.");
    ids.add(event.id);
    if (Number(event.amount) < 0) return fail("Negative XP is not allowed.");
  }

  const workoutIds = new Set();
  for (const workout of input.workoutHistory) {
    if (!isObject(workout) || typeof workout.id !== "string" || !Array.isArray(workout.steps)) {
      return fail("A workout in the backup is invalid.");
    }
    if (workoutIds.has(workout.id)) return fail("The backup repeats a workout id and was rejected.");
    workoutIds.add(workout.id);
  }

  const settings = defaultSettings();
  settings.restSeconds = Number.isFinite(Number(input.settings.restSeconds))
    ? Math.max(0, Math.round(Number(input.settings.restSeconds)))
    : settings.restSeconds;
  settings.legRaiseVariation = input.settings.legRaiseVariation || null;
  settings.setupComplete = Boolean(input.settings.setupComplete);
  if (isObject(input.settings.targets)) {
    for (const quest of Object.keys(settings.targets)) {
      if (isObject(input.settings.targets[quest]?.exercises)) {
        settings.targets[quest] = input.settings.targets[quest];
      }
    }
  }

  const state = {
    schemaVersion: SCHEMA_VERSION,
    createdAt: typeof input.createdAt === "string" ? input.createdAt : new Date().toISOString(),
    settings,
    currentLevel: input.currentLevel,
    totalXP: 0,
    personalRecords: input.personalRecords,
    exerciseVariants: isObject(input.exerciseVariants) ? input.exerciseVariants : { legRaises: settings.legRaiseVariation },
    workoutHistory: input.workoutHistory,
    xpEvents: input.xpEvents.map((event) => ({ ...event, amount: Number(event.amount) })),
    completedMilestones: input.completedMilestones,
    completedLevels: input.completedLevels,
    achievementHistory: Array.isArray(input.achievementHistory) ? input.achievementHistory : [],
    recordHistory: Array.isArray(input.recordHistory) ? input.recordHistory : [],
  };
  state.exerciseVariants.legRaises = settings.legRaiseVariation;
  if (!isObject(state.personalRecords.legRaises)) {
    state.personalRecords.legRaises = {
      pendingBaseline: null,
      variations: { lying: null, hangingKnee: null, hangingStraight: null },
    };
  }
  if (!isObject(state.personalRecords.legRaises.variations)) {
    state.personalRecords.legRaises.variations = { lying: null, hangingKnee: null, hangingStraight: null };
  }
  recomputeTotal(state);
  return { ok: true, error: null, state };
}

export function importState(current, raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "That file is not valid JSON. Your current progress was left as it is.", state: current };
  }
  const result = migrate(parsed);
  if (!result.ok) {
    return { ok: false, error: `${result.error} Your current progress was left as it is.`, state: current };
  }
  return { ok: true, error: null, state: result.state };
}

function browserStorage(kind) {
  try {
    const store = kind === "session" ? sessionStorage : localStorage;
    return typeof store === "undefined" ? null : store;
  } catch {
    return null;
  }
}

export function loadState() {
  const store = browserStorage("local");
  if (!store) return createInitialState();
  const raw = store.getItem(STORAGE_KEY);
  if (!raw) {
    const state = createInitialState();
    saveState(state);
    return state;
  }
  const result = importState(null, raw);
  if (!result.ok) {
    const backupKey = `${STORAGE_KEY}-unreadable`;
    if (!store.getItem(backupKey)) store.setItem(backupKey, raw);
    const fresh = createInitialState();
    saveState(fresh);
    return fresh;
  }
  return result.state;
}

export function saveState(state) {
  const store = browserStorage("local");
  if (!store) return;
  recomputeTotal(state);
  store.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadDraft() {
  const store = browserStorage("session");
  if (!store) return null;
  const raw = store.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw);
    if (!draft || typeof draft.id !== "string" || !Array.isArray(draft.steps)) return null;
    return draft;
  } catch {
    return null;
  }
}

export function saveDraft(draft) {
  const store = browserStorage("session");
  if (!store) return;
  if (!draft) store.removeItem(DRAFT_KEY);
  else store.setItem(DRAFT_KEY, JSON.stringify(draft));
}
