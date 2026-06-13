/**
 * The Skill Rating Engine — DriveScore's fair, motivating skill measure.
 *
 * Pure, deterministic Elo over (question difficulty + correctness). No AI/LLM,
 * no DB, no React — kept dependency-free and isolated so it stays
 * unit-testable (see `rating.test.ts`), exactly like `diagnose.ts`.
 *
 * Why Elo and not a points total: a sum of marks/XP rewards sheer VOLUME (grind
 * easy questions to win) and accuracy% rewards TIMIDITY (answer two easy ones,
 * "100%"). Elo instead measures the hardest level you reliably beat:
 *
 *   - correct on a question above your rating   -> big gain
 *   - correct on one far below you              -> ~zero gain (volume farming dies)
 *   - wrong on a hard question                  -> tiny loss (expected, no shame)
 *   - wrong on an easy question                 -> meaningful loss
 *
 * Every question is an "opponent"; answering it is a match. The result is
 * deterministic and explainable ("Hard solved: +18"), in keeping with the
 * product's no-black-box positioning.
 *
 * See docs/rating-system-spec.md for the full design + decision log.
 */

import type { Difficulty, Subject } from "./types";

// ── Tunable constants ──────────────────────────────────────────────────────

/** Every student starts here. */
export const START_RATING = 1000;

/** A rating can never fall below this floor. */
export const RATING_FLOOR = 400;

/** Standard Elo divisor (a 400-point gap ≈ 10:1 expected odds). */
export const ELO_DIVISOR = 400;

/** Fast calibration for a subject's first N rated questions, then stabilise. */
export const CALIBRATION_QUESTIONS = 30;
export const K_CALIBRATION = 32;
export const K_STABLE = 16;

/** Static question rating by difficulty (v2 may calibrate from real data). */
export const QUESTION_RATING: Record<Difficulty, number> = {
  Easy: 800,
  Medium: 1100,
  Hard: 1400,
};

/**
 * Overall rating mirrors the real NEET marks split (360/180/180 of 720), so the
 * single headline number honestly answers "how NEET-ready am I?".
 */
export const OVERALL_WEIGHTS: Record<Subject, number> = {
  Biology: 0.5,
  Physics: 0.25,
  Chemistry: 0.25,
};

const SUBJECTS: Subject[] = ["Physics", "Chemistry", "Biology"];

// ── Levels — "Road to the White Coat" ───────────────────────────────────────

export type LevelInfo = {
  name: string;
  /** Inclusive lower bound of the band. */
  floor: number;
};

/** Ascending by floor. The top level is the student's actual life goal. */
export const LEVELS: LevelInfo[] = [
  { name: "Aspirant", floor: 0 },
  { name: "Achiever", floor: 900 },
  { name: "Scholar", floor: 1050 },
  { name: "Ranker", floor: 1200 },
  { name: "Topper", floor: 1350 },
  { name: "White Coat", floor: 1500 },
];

/**
 * Levels are sticky: a band is only LOST once the rating falls this far below
 * its floor, so a rating hovering at a boundary doesn't flicker between levels.
 */
export const DEMOTION_BUFFER = 25;

// ── Core Elo math ────────────────────────────────────────────────────────────

export function questionRating(difficulty: Difficulty): number {
  return QUESTION_RATING[difficulty];
}

/** K-factor: bigger while the subject rating is still calibrating. */
export function kFactor(questionsRated: number): number {
  return questionsRated < CALIBRATION_QUESTIONS ? K_CALIBRATION : K_STABLE;
}

/** Expected score (probability of a correct answer) for this match-up. */
export function expectedScore(
  studentRating: number,
  qRating: number,
): number {
  return 1 / (1 + 10 ** ((qRating - studentRating) / ELO_DIVISOR));
}

/** One subject's rating state. */
export type SubjectState = { rating: number; questionsRated: number };

/**
 * Apply a single match to one subject's rating. Returns the new (rounded,
 * floored) rating, the signed integer delta, and the incremented count.
 */
export function applyOne(
  state: SubjectState,
  qRating: number,
  correct: boolean,
): { rating: number; delta: number; questionsRated: number } {
  const k = kFactor(state.questionsRated);
  const expected = expectedScore(state.rating, qRating);
  const actual = correct ? 1 : 0;
  const raw = state.rating + k * (actual - expected);
  const rating = Math.max(RATING_FLOOR, Math.round(raw));
  return {
    rating,
    delta: rating - state.rating,
    questionsRated: state.questionsRated + 1,
  };
}

/** Exam-weighted overall from the three subject ratings (missing → START). */
export function overallRating(
  subjects: Partial<Record<Subject, number>>,
): number {
  let sum = 0;
  for (const s of SUBJECTS) {
    sum += OVERALL_WEIGHTS[s] * (subjects[s] ?? START_RATING);
  }
  return Math.round(sum);
}

// ── Level resolution (sticky) ────────────────────────────────────────────────

/** Highest band whose floor ≤ rating (the "natural" level, ignoring history). */
function naturalIndex(rating: number): number {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (rating >= LEVELS[i].floor) idx = i;
    else break;
  }
  return idx;
}

function indexOfLevel(name: string | null): number {
  if (!name) return -1;
  const i = LEVELS.findIndex((l) => l.name === name);
  return i;
}

/**
 * Resolve the level for a rating, given the level the student CURRENTLY holds.
 *
 * - Promotion is immediate (cross a floor → you're there).
 * - Demotion is sticky: you keep a level until the rating drops `DEMOTION_BUFFER`
 *   points below that band's floor, then step down one band and re-evaluate.
 *
 * Pass `currentLevel = null` for a fresh resolution with no history.
 */
export function levelFor(rating: number, currentLevel: string | null): LevelInfo {
  const natural = naturalIndex(rating);
  let cur = indexOfLevel(currentLevel);
  if (cur < 0) return LEVELS[natural]; // no history → natural band

  // Promotion (or no change) is immediate.
  if (natural >= cur) return LEVELS[natural];

  // Below the current band's floor: step down one band at a time, but only once
  // past the buffer, so a near-boundary rating stays put.
  while (cur > 0 && rating < LEVELS[cur].floor - DEMOTION_BUFFER) {
    cur -= 1;
  }
  return LEVELS[cur];
}

/** Progress toward the next level (for the home-screen progress bar). */
export function levelProgress(rating: number): {
  current: LevelInfo;
  next: LevelInfo | null;
  pointsToNext: number | null;
  pctToNext: number;
} {
  const idx = naturalIndex(rating);
  const current = LEVELS[idx];
  const next = idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
  if (!next) return { current, next: null, pointsToNext: null, pctToNext: 100 };
  const span = next.floor - current.floor;
  const into = rating - current.floor;
  return {
    current,
    next,
    pointsToNext: Math.max(0, next.floor - rating),
    pctToNext: Math.max(0, Math.min(100, Math.round((into / span) * 100))),
  };
}

// ── Attempt-level application ────────────────────────────────────────────────

/** One graded question, reduced to just what the rating engine needs. */
export type RatingInput = {
  questionId: string;
  subject: Subject;
  difficulty: Difficulty;
  /** False = left blank: no match is played, rating untouched. */
  attempted: boolean;
  correct: boolean;
  /**
   * True if the student has answered THIS question correctly on a PRIOR attempt.
   * Anti-farming: re-answering a question you've already aced earns zero — you
   * can't grind memorised answers. (A previously-wrong question still counts;
   * getting it right now is real learning.)
   */
  previouslyCorrect: boolean;
};

/** The recorded outcome of one question for the `rating_events` ledger. */
export type RatingDelta = {
  questionId: string;
  subject: Subject;
  delta: number;
  ratingAfter: number;
};

/**
 * Generic per-question input keyed by an arbitrary BUCKET (a subject, or a
 * `subject|chapter` pair). The same Elo math drives every grain.
 */
export type BucketInput = {
  bucket: string;
  difficulty: Difficulty;
  attempted: boolean;
  correct: boolean;
  previouslyCorrect: boolean;
};

export type BucketDelta = {
  bucket: string;
  delta: number;
  ratingAfter: number;
  /** Index back into the input array (to recover questionId/subject/etc). */
  index: number;
};

/**
 * Apply a sequence of matches grouped by an arbitrary bucket key. This is the
 * shared primitive behind both per-subject and per-chapter ratings, so the
 * skip/anti-farming rules can never drift between grains.
 *
 * Buckets absent from `current` start at the default rating. Blanks are skipped
 * (no match); previously-aced questions record a zero delta (anti-farming).
 */
export function applyByBucket(
  current: Record<string, SubjectState>,
  inputs: BucketInput[],
): { final: Record<string, SubjectState>; deltas: BucketDelta[] } {
  const final: Record<string, SubjectState> = {};
  for (const key of Object.keys(current)) final[key] = { ...current[key] };

  const deltas: BucketDelta[] = [];
  inputs.forEach((inp, index) => {
    if (!inp.attempted) return; // blank → no match played
    if (!final[inp.bucket]) {
      final[inp.bucket] = { rating: START_RATING, questionsRated: 0 };
    }
    const state = final[inp.bucket];

    if (inp.previouslyCorrect) {
      deltas.push({ bucket: inp.bucket, delta: 0, ratingAfter: state.rating, index });
      return;
    }

    const res = applyOne(state, questionRating(inp.difficulty), inp.correct);
    final[inp.bucket] = { rating: res.rating, questionsRated: res.questionsRated };
    deltas.push({ bucket: inp.bucket, delta: res.delta, ratingAfter: res.rating, index });
  });

  return { final, deltas };
}

export type AttemptResult = {
  /** One entry per ATTEMPTED question, in input order (blanks omitted). */
  deltas: RatingDelta[];
  /** New per-subject states after the whole attempt. */
  finalSubjects: Record<Subject, SubjectState>;
  overallBefore: number;
  overallAfter: number;
  /** Sum of all deltas in this attempt. */
  totalDelta: number;
};

/**
 * Apply a full attempt's worth of questions to the student's ratings.
 *
 * `current` must contain all three subjects (use START defaults for any the
 * student hasn't touched yet). Processes inputs in order so calibration K-shifts
 * land deterministically. Pure: returns new state, mutates nothing.
 */
export function applyAttempt(
  current: Record<Subject, SubjectState>,
  inputs: RatingInput[],
): AttemptResult {
  const overallBefore = overallRating({
    Physics: current.Physics.rating,
    Chemistry: current.Chemistry.rating,
    Biology: current.Biology.rating,
  });

  // Run the shared bucket engine keyed by subject.
  const { final, deltas: bucketDeltas } = applyByBucket(current, inputs.map((inp) => ({
    bucket: inp.subject,
    difficulty: inp.difficulty,
    attempted: inp.attempted,
    correct: inp.correct,
    previouslyCorrect: inp.previouslyCorrect,
  })));

  const finalSubjects: Record<Subject, SubjectState> = {
    Physics: final.Physics,
    Chemistry: final.Chemistry,
    Biology: final.Biology,
  };

  // Re-attach the per-question identity to each delta.
  const deltas: RatingDelta[] = bucketDeltas.map((d) => ({
    questionId: inputs[d.index].questionId,
    subject: inputs[d.index].subject,
    delta: d.delta,
    ratingAfter: d.ratingAfter,
  }));

  const overallAfter = overallRating({
    Physics: finalSubjects.Physics.rating,
    Chemistry: finalSubjects.Chemistry.rating,
    Biology: finalSubjects.Biology.rating,
  });

  return {
    deltas,
    finalSubjects,
    overallBefore,
    overallAfter,
    totalDelta: deltas.reduce((s, d) => s + d.delta, 0),
  };
}
