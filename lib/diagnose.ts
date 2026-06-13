/**
 * The Diagnosis Engine — the core differentiator of DriveScore.
 *
 * Pure, deterministic logic over (score + per-question time). No AI/LLM.
 * This module is intentionally dependency-free and isolated so it stays
 * unit-testable (see `diagnose.test.ts`).
 *
 * Classification order matters — the FIRST matching rule wins:
 *
 *   1. unattempted                       -> TIME_MANAGEMENT
 *   2. correct && slow                   -> TOO_SLOW
 *   3. correct                           -> SOLID
 *   --- from here the answer is WRONG ---
 *   4. Easy difficulty                   -> CARELESS   (slip on an easy one)
 *   5. Medium/Hard && rushed             -> GUESS      (barely engaged = a guess)
 *   6. otherwise (Medium/Hard, worked it)-> CONCEPT_GAP (a real gap)
 */

import type { DiagnosisCategory, Question } from "./types";

/** A question is "slow" when time spent exceeds 140% of par. */
export const SLOW_FACTOR = 1.4;

/** A wrong answer answered in under 40% of par counts as "rushed" (a guess). */
export const RUSH_FACTOR = 0.4;

/**
 * Classify a single attempt into exactly one diagnosis category.
 *
 * @param q           the question that was (or wasn't) answered
 * @param pickedIndex the chosen option index, or null if left blank
 * @param timeSec     seconds spent on the question
 */
export function diagnose(
  q: Question,
  pickedIndex: number | null,
  timeSec: number,
): DiagnosisCategory {
  // 1. Left blank / ran out of time.
  if (pickedIndex === null) {
    return "TIME_MANAGEMENT";
  }

  const correct = pickedIndex === q.answerIndex;
  const slow = timeSec > q.parTimeSec * SLOW_FACTOR;
  const rushed = timeSec < q.parTimeSec * RUSH_FACTOR;

  // 2. Knows it, but not fluent.
  if (correct && slow) {
    return "TOO_SLOW";
  }

  // 3. Correct and on-pace — not a problem.
  if (correct) {
    return "SOLID";
  }

  // --- The answer is WRONG from here on. ---

  // 4. An easy question should have been known — getting it wrong is a slip.
  if (q.difficulty === "Easy") {
    return "CARELESS";
  }

  // 5. Wrong on Medium/Hard, answered too fast to have worked it out: a guess.
  if (rushed) {
    return "GUESS";
  }

  // 6. Wrong on Medium/Hard at a real working pace: a genuine knowledge gap.
  return "CONCEPT_GAP";
}

/** Display metadata for each category. Drives the report UI. */
export const CATEGORY_META: Record<
  DiagnosisCategory,
  {
    title: string;
    advice: string;
    /** Tailwind colour token (see tailwind.config.ts). */
    color: string;
    /** True for buckets that represent a problem worth showing. */
    isProblem: boolean;
  }
> = {
  CONCEPT_GAP: {
    title: "Concept Gaps",
    advice: "Re-learn from the NCERT chapter before practising more.",
    color: "gap",
    isProblem: true,
  },
  GUESS: {
    title: "Guessing",
    advice:
      "Answered too fast without really working it out. On hard questions, slow down and use elimination instead of guessing.",
    color: "guess",
    isProblem: true,
  },
  CARELESS: {
    title: "Careless Slips",
    advice: "You knew these but slipped — slow down on easy questions.",
    color: "careless",
    isProblem: true,
  },
  TOO_SLOW: {
    title: "Too Slow",
    advice: "Correct, but too slow — practise these for speed.",
    color: "slow",
    isProblem: true,
  },
  TIME_MANAGEMENT: {
    title: "Time Management",
    advice: "Left blank — work on pacing across the full paper.",
    color: "time",
    isProblem: true,
  },
  SOLID: {
    title: "Solid",
    advice: "Correct and on time — keep it up.",
    color: "solid",
    isProblem: false,
  },
};

/** Stable display order for the problem categories. */
export const PROBLEM_ORDER: DiagnosisCategory[] = [
  "CONCEPT_GAP",
  "GUESS",
  "CARELESS",
  "TOO_SLOW",
  "TIME_MANAGEMENT",
];
