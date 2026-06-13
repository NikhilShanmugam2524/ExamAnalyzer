/**
 * Shared domain types for DriveScore.
 *
 * These mirror the spec exactly so the seed data, the test session and the
 * Diagnosis Engine all speak the same language.
 */

export type Subject = "Physics" | "Chemistry" | "Biology";

export type Difficulty = "Easy" | "Medium" | "Hard";

export type Question = {
  id: string;
  subject: Subject;
  /** NCERT chapter name, e.g. "Ray Optics" */
  chapter: string;
  /** Finer concept tag, e.g. "Concave mirror image formation" */
  concept: string;
  difficulty: Difficulty;
  /** Expected time for an average student, in seconds. */
  parTimeSec: number;
  text: string;
  /** Exactly 4 options. May be blank strings for image-only questions. */
  options: string[];
  /** Index (0–3) of the correct option. */
  answerIndex: number;
  /** Optional figure for diagram questions (public URL). */
  imageUrl?: string | null;
};

/**
 * A question as sent to the BROWSER — without `answerIndex`. The correct
 * answer must never reach the client; grading happens server-side.
 */
export type PublicQuestion = Omit<Question, "answerIndex">;

export type Attempt = {
  questionId: string;
  /** null = unattempted / left blank. */
  pickedIndex: number | null;
  /** Seconds the student spent on this question. */
  timeSec: number;
};

/** The diagnosis buckets produced by the engine. */
export type DiagnosisCategory =
  | "CONCEPT_GAP"
  | "GUESS"
  | "CARELESS"
  | "TOO_SLOW"
  | "TIME_MANAGEMENT"
  | "SOLID";

export type Role = "student" | "teacher" | "parent";
