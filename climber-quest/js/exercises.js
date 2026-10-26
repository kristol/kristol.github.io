export const PAIN_NOTICE =
  "Stop any exercise that causes localized finger, elbow, or shoulder pain. Mild effort is fine. Sharp or pinpoint pain is a stop signal, not a rep to push through.";

export const LEG_RAISE_VARIATIONS = [
  {
    id: "lying",
    label: "Lying leg raises",
    detail: "Lie on your back and raise straight or softly bent legs without swinging. This is the usual match for a beginner baseline.",
  },
  {
    id: "hangingKnee",
    label: "Hanging knee raises",
    detail: "Hang from the bar and lift your knees with control. Do not swing. This is harder on the grip than lying raises.",
  },
  {
    id: "hangingStraight",
    label: "Hanging straight-leg raises",
    detail: "Hang from the bar and lift straight legs with control. Keep this separate from knee raises.",
  },
];

const progress = [
  {
    id: "pullups",
    name: "Strict pull-ups",
    short: "Pull-ups",
    unit: "reps",
    summary: "Chin clearly over the bar, from straight arms, without a kip.",
    counts: "Start in a controlled hang with extended elbows. Pull until your chin clearly passes above the bar. Lower back to straight arms.",
    doesNotCount: "Kipping, kicking, jumping, or a chin that stays below the bar.",
    cues: ["Brace before you pull.", "Keep the motion smooth enough that you could pause.", "Stop the set when the next rep would get sloppy."],
  },
  {
    id: "pushups",
    name: "Strict push-ups",
    short: "Push-ups",
    unit: "reps",
    summary: "Straight body, chest close to the floor, elbows locked out at the top.",
    counts: "Keep your body in one line. Lower until your chest comes close to the floor, then push until your elbows are fully extended.",
    doesNotCount: "Partial reps, a sagging hip, or a shortened range just to hit a number.",
    cues: ["Hands under your shoulders, or slightly wider.", "Squeeze your glutes so the lower back does not dip.", "Use the bars or parallettes if your wrists prefer them."],
  },
  {
    id: "legRaises",
    name: "Controlled leg raises",
    short: "Leg raises",
    unit: "reps",
    summary: "One variation only. Records from different variations stay separate.",
    counts: "Use the variation you selected. Move at a pace you can stop. The baseline of 10 reps is stored only after you name the variation.",
    doesNotCount: "A different variation than the one on the record. Swinging reps.",
    cues: ["Exhale as your legs rise.", "Keep your neck relaxed.", "If your back arches hard on the floor, shorten the range instead of forcing it."],
  },
  {
    id: "lsit",
    name: "Strict L-sit",
    short: "L-sit",
    unit: "sec",
    summary: "Straight arms, feet off the floor. The full record needs straight knees and legs about horizontal.",
    counts: "Support yourself on parallettes or push-up bars. Arms stay straight and feet leave the floor. A full record needs both knees extended and the legs about horizontal.",
    doesNotCount: "Tucked L-sits and one-leg variations. Those are useful practice in the daily workout and do not update the full L-sit record.",
    cues: ["Push the floor away so your shoulders stay strong.", "Point your knees forward in the full position.", "Drop down before your hips start to sag."],
  },
  {
    id: "scapular",
    name: "Scapular pull-ups",
    short: "Scapular pulls",
    unit: "reps",
    summary: "Straight elbows. Lift a little by pulling the shoulder blades down.",
    counts: "Hang with straight elbows. Pull your shoulder blades down and together so your body rises slightly, then return under control.",
    doesNotCount: "Bending the elbows. That turns it into a partial pull-up.",
    cues: ["Think about putting your shoulder blades in your back pockets.", "Keep the neck long.", "Small range is the point."],
  },
  {
    id: "hollow",
    name: "Hollow-body hold",
    short: "Hollow hold",
    unit: "sec",
    summary: "Lower back stays on the floor. The full record uses extended arms and extended legs.",
    counts: "Lie on your back, brace, and keep your lower back against the floor. A full record has arms extended overhead and legs extended, both off the floor.",
    doesNotCount: "Tucked holds. They count as workout practice and do not update the full hollow-body record.",
    cues: ["Press the lower back into the floor before you lift.", "If the back peels up, tuck more during training.", "Breathe behind the brace."],
  },
  {
    id: "lunge",
    name: "Reverse lunge with knee drive",
    short: "Reverse lunges",
    unit: "perSide",
    summary: "Step back, stand, and drive the rear knee through. Each side has its own count.",
    counts: "Step backward into a controlled lunge, stand, and drive the rear knee forward. Finish in balance before the next rep. Left and right are recorded separately.",
    doesNotCount: "A rep you cannot pause at the end. Rushing the knee drive.",
    cues: ["Keep the front heel down.", "The torso stays tall.", "The record uses the lower of the two sides, because both sides have to meet the benchmark."],
  },
];

const extra = [
  {
    id: "warmup",
    name: "Warm-up",
    short: "Warm-up",
    unit: "info",
    summary: "About two easy minutes for wrists, shoulders, and hips.",
    counts: "Gentle wrist waves and circles, shoulder circles or shoulder-blade shrugs, and easy hip circles. Stay well short of a stretch that hurts.",
    doesNotCount: "This step is preparation. It does not award exercise XP.",
    cues: ["Pain-free range only.", "You should feel warmer, not tired.", "Skip it only if you already warmed up."],
  },
  {
    id: "wrists",
    name: "Wrist waves",
    short: "Wrists",
    unit: "sec",
    summary: "Easy wrist motion before climbing or after it.",
    counts: "Slowly open and close the hands, then circle the wrists in both directions.",
    doesNotCount: "Forcing a stretch into a sore wrist.",
    cues: ["Keep the elbows soft.", "Shake the hands out at the end."],
  },
  {
    id: "shoulders",
    name: "Shoulder circles",
    short: "Shoulders",
    unit: "reps",
    summary: "Large, lazy circles to wake the shoulders up.",
    counts: "Circle both arms slowly. Add a few shoulder-blade shrugs if that feels useful.",
    doesNotCount: "Fast swinging or painful overhead reaches.",
    cues: ["Stay in a range that feels smooth.", "Breathe."],
  },
  {
    id: "hips",
    name: "Hip mobility",
    short: "Hips",
    unit: "perSide",
    summary: "Easy hip circles or step-back rocks.",
    counts: "Hold a wall if you want. Circle the hip or rock gently into a short lunge.",
    doesNotCount: "A deep stretch that changes your climbing later.",
    cues: ["Small range.", "Even time on both sides."],
  },
  {
    id: "deadbug",
    name: "Dead bug",
    short: "Dead bug",
    unit: "perSide",
    summary: "Easy core control with the lower back quiet.",
    counts: "Lie on your back, brace, and slowly reach the opposite arm and leg away. Keep the lower back down.",
    doesNotCount: "A rep where the back arches off the floor.",
    cues: ["Move slower than you want to.", "Shorten the reach if the back lifts."],
  },
  {
    id: "balance",
    name: "Slow step and balance",
    short: "Balance",
    unit: "perSide",
    summary: "A coordination step without hard pulling.",
    counts: "Step back, stand tall, and pause in balance. This does not update your lunge record.",
    doesNotCount: "Rushing. Using this set as a max-effort lunge test.",
    cues: ["Eyes on a still point.", "Finish each rep standing quietly."],
  },
  {
    id: "breath",
    name: "Easy breathing",
    short: "Breathing",
    unit: "sec",
    summary: "A short downshift for a rest day.",
    counts: "Sit or lie down and breathe quietly. Unclench your jaw and hands.",
    doesNotCount: "This is a check-in, not a test.",
    cues: ["If you feel wiped out, stop after this.", "Recovery never costs XP."],
  },
  {
    id: "forearms",
    name: "Forearm flush",
    short: "Forearms",
    unit: "sec",
    summary: "Light motion for tired forearms. Not a grip workout.",
    counts: "Open and close the hands, rotate the forearms, and shake them out.",
    doesNotCount: "Squeezing something as hard as you can. Hangboard work is not part of this program.",
    cues: ["Stay light.", "Stop if a tendon feels sharp."],
  },
  {
    id: "slides",
    name: "Shoulder-blade slides",
    short: "Blade slides",
    unit: "reps",
    summary: "Slide the shoulder blades down and around without a hard hang.",
    counts: "Arms can be at your sides or hovering in front. Pull the shoulder blades down, then let them relax.",
    doesNotCount: "Turning this into a max pull or a finger test.",
    cues: ["Neck stays easy.", "Small motion."],
  },
];

export const EXERCISES = [...progress, ...extra];

export function getExercise(id) {
  return EXERCISES.find((exercise) => exercise.id === id) || null;
}

export function isProgressExercise(id) {
  return progress.some((exercise) => exercise.id === id);
}

export function variationLabel(id) {
  return LEG_RAISE_VARIATIONS.find((item) => item.id === id)?.label || "Variation not chosen";
}
