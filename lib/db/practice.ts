import "server-only";

/**
 * Student self-practice generation (Stage 2 + 3).
 *
 * Turns the DriveScore GLOBAL pool (questions with centre_id IS NULL) into two
 * student pathways:
 *   1. Lesson practice — a focused test on one subject + chapter.
 *   2. Full NEET mock  — a shuffled 180-Q paper (45 Phy + 45 Chem + 90 Bio).
 *
 * Both GENERATE a personal mock on the fly (kind='lesson'|'bank', centre_id
 * NULL, owner_student_id = the student), then the EXISTING test → attempt →
 * report → diagnosis pipeline runs against it unchanged.
 *
 * Generation uses the SERVICE client: students have no RLS insert policy on
 * mocks/mock_questions (only staff do), and random sampling reads the whole
 * pool. The personal mock is then readable by its owner thanks to the
 * mocks_student_select policy added in migration 0008.
 */

import { getServiceClient } from "./client";
import { listBatchesForCentre } from "./queries";
import { SUBJECTS } from "@/lib/questions/validate";
import { chapterRank } from "@/lib/questions/chapters";
import type { Subject, Difficulty, PublicQuestion } from "@/lib/types";

/** Full NEET pattern: how many of each subject in a generated full mock. */
export const NEET_PATTERN: { subject: Subject; count: number }[] = [
  { subject: "Physics", count: 45 },
  { subject: "Chemistry", count: 45 },
  { subject: "Biology", count: 90 },
];

export type ChapterInfo = { chapter: string; questionCount: number };
export type SubjectSyllabus = {
  subject: Subject;
  questionCount: number;
  chapters: ChapterInfo[];
};

/** Fisher–Yates shuffle (returns a new array). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * The browsable global syllabus: each subject with its chapters + how many
 * questions each chapter has. Empty subjects/chapters are omitted.
 */
export async function listGlobalSyllabus(
  source: "pyq" | "ai" = "pyq",
): Promise<SubjectSyllabus[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("questions")
    .select("subject, chapter")
    .is("centre_id", null)
    .eq("source", source)
    .eq("hidden", false);
  if (error) throw error;

  const rows = (data ?? []) as { subject: string; chapter: string }[];

  return SUBJECTS.map((subject) => {
    const subjectRows = rows.filter((r) => r.subject === subject);
    const byChapter = new Map<string, number>();
    for (const r of subjectRows) {
      byChapter.set(r.chapter, (byChapter.get(r.chapter) ?? 0) + 1);
    }
    const chapters = [...byChapter.entries()]
      .map(([chapter, questionCount]) => ({ chapter, questionCount }))
      // NCERT syllabus order (Class 11 → Class 12), not alphabetical.
      .sort((a, b) => chapterRank(subject, a.chapter) - chapterRank(subject, b.chapter));
    return { subject, questionCount: subjectRows.length, chapters };
  }).filter((s) => s.questionCount > 0);
}

/** Random global question ids for a subject (optionally one chapter). */
async function sampleGlobalIds(
  subject: Subject,
  chapter: string | null,
  count: number,
): Promise<string[]> {
  const supabase = getServiceClient();
  let query = supabase
    .from("questions")
    .select("id")
    .is("centre_id", null)
    .eq("source", "pyq") // the full NEET mock uses real past-paper questions only
    .eq("hidden", false)
    .eq("subject", subject);
  if (chapter) query = query.eq("chapter", chapter);

  const { data, error } = await query;
  if (error) throw error;
  const ids = (data ?? []).map((r) => r.id as string);
  return shuffle(ids).slice(0, count);
}

/** Create a personal mock + its ordered question links. Returns the mock id. */
async function createGeneratedMock(
  studentId: string,
  kind: "lesson" | "bank",
  title: string,
  questionIds: string[],
): Promise<string> {
  const supabase = getServiceClient();

  const { data: mock, error: mErr } = await supabase
    .from("mocks")
    .insert({
      centre_id: null,
      batch_id: null,
      owner_student_id: studentId,
      kind,
      title,
      status: "published", // generated sessions are immediately takeable
      max_attempts: 1, // each "start" makes a fresh mock → practice stays unlimited
    })
    .select("id")
    .single();
  if (mErr) throw mErr;

  const mockId = mock.id as string;
  const links = questionIds.map((question_id, position) => ({
    mock_id: mockId,
    question_id,
    position,
  }));
  const { error: lErr } = await supabase.from("mock_questions").insert(links);
  if (lErr) throw lErr;

  return mockId;
}

/**
 * Generate a LESSON practice mock for one subject + chapter. `count` caps how
 * many questions (defaults 15; uses fewer if the chapter has fewer).
 * Returns null if the chapter has no questions.
 */
export async function generateLessonMock(
  studentId: string,
  subject: Subject,
  chapter: string,
  count = 15,
): Promise<string | null> {
  const ids = await sampleGlobalIds(subject, chapter, count);
  if (ids.length === 0) return null;
  return createGeneratedMock(studentId, "lesson", `${chapter} — practice`, ids);
}

/**
 * Generate a full NEET-pattern mock (45 Phy + 45 Chem + 90 Bio), shuffled from
 * the global pool. Returns null if the pool can't supply at least one question.
 */
export async function generateFullMock(studentId: string): Promise<string | null> {
  const perSubject = await Promise.all(
    NEET_PATTERN.map((p) => sampleGlobalIds(p.subject, null, p.count)),
  );
  // Interleave by subject block but keep subject grouping (Phy, Chem, Bio).
  const ordered = perSubject.flat();
  if (ordered.length === 0) return null;
  return createGeneratedMock(studentId, "bank", "Full NEET Mock", ordered);
}

// ─────────────────── "Climb the Lesson" game mode (Stage 5) ───────────────────

export type ClimbQuestion = PublicQuestion & { difficulty: Difficulty };

/**
 * Serve ONE global question for a chapter at the requested difficulty, excluding
 * ids already seen this run. Falls back to any unseen question in the chapter if
 * that difficulty is exhausted. Answer key is stripped (graded server-side).
 */
export async function sampleClimbQuestion(
  subject: Subject,
  chapter: string,
  difficulty: Difficulty | null,
  excludeIds: string[],
  source: "pyq" | "ai" = "pyq",
): Promise<ClimbQuestion | null> {
  const supabase = getServiceClient();
  const ex = new Set(excludeIds);
  const idsFor = async (diff: Difficulty | null) => {
    let q = supabase.from("questions").select("id").is("centre_id", null)
      .eq("source", source).eq("hidden", false)
      .eq("subject", subject).eq("chapter", chapter);
    if (diff) q = q.eq("difficulty", diff);
    const { data } = await q;
    return (data ?? []).map((r) => r.id as string).filter((id) => !ex.has(id));
  };
  let ids = difficulty ? await idsFor(difficulty) : [];
  if (ids.length === 0) ids = await idsFor(null); // any unseen in the chapter
  if (ids.length === 0) return null;

  const pick = ids[Math.floor(Math.random() * ids.length)];
  const { data, error } = await supabase
    .from("questions")
    .select("id, subject, chapter, concept, difficulty, par_time_sec, text, options, image_url")
    .eq("id", pick).single();
  if (error || !data) return null;
  return {
    id: data.id,
    subject: data.subject as Subject,
    chapter: data.chapter,
    concept: data.concept,
    difficulty: data.difficulty as Difficulty,
    parTimeSec: data.par_time_sec,
    text: data.text,
    options: (data.options as string[]) ?? [],
    imageUrl: (data.image_url as string | null) ?? null,
  };
}

/**
 * Create a personal mock from a SPECIFIC ordered list of question ids (the ones
 * a student actually answered during a Climb run), so the run can be graded +
 * reported through the existing attempt/report pipeline.
 */
export async function createMockFromQuestionIds(
  studentId: string,
  title: string,
  questionIds: string[],
): Promise<string> {
  const supabase = getServiceClient();
  const { data: mock, error } = await supabase
    .from("mocks")
    .insert({
      centre_id: null, batch_id: null, owner_student_id: studentId,
      kind: "lesson", title, status: "published", max_attempts: 1,
    })
    .select("id").single();
  if (error) throw error;
  const mockId = mock.id as string;
  if (questionIds.length) {
    const links = questionIds.map((question_id, position) => ({ mock_id: mockId, question_id, position }));
    const { error: e2 } = await supabase.from("mock_questions").insert(links);
    if (e2) throw e2;
  }
  return mockId;
}

/** The correct option index for one question (server-only check). */
export async function getQuestionAnswerIndex(id: string): Promise<number | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("questions").select("answer_index").eq("id", id).single();
  if (error || !data) return null;
  return data.answer_index as number;
}

/** How many global questions a chapter has (to size the run / show on entry). */
export async function chapterQuestionCount(
  subject: Subject, chapter: string, source: "pyq" | "ai" = "pyq",
): Promise<number> {
  const supabase = getServiceClient();
  const { count } = await supabase
    .from("questions").select("*", { count: "exact", head: true })
    .is("centre_id", null).eq("source", source).eq("hidden", false)
    .eq("subject", subject).eq("chapter", chapter);
  return count ?? 0;
}

/**
 * Flag a question as wrong (crowd QA for the auto-published AI track). After a
 * couple of distinct students report it, the question is auto-hidden.
 */
export async function reportQuestion(questionId: string, studentId: string): Promise<void> {
  const supabase = getServiceClient();
  await supabase.from("question_reports")
    .upsert({ question_id: questionId, student_id: studentId }, { onConflict: "question_id,student_id" });
  const { count } = await supabase.from("question_reports")
    .select("*", { count: "exact", head: true }).eq("question_id", questionId);
  if ((count ?? 0) >= 2) {
    await supabase.from("questions").update({ hidden: true }).eq("id", questionId);
  }
}

// ─────────────────────── Teacher visibility (Stage 4) ───────────────────────

export type PracticeActivityRow = {
  attemptId: string;
  studentName: string;
  title: string;
  kind: "lesson" | "bank";
  totalMarks: number | null;
  maxMarks: number | null;
  accuracy: number | null;
  submittedAt: string;
};

/**
 * Recent DriveScore self-practice attempts (lesson + full mock) by the students
 * of one centre — for the teacher's "Practice activity" view.
 *
 * Scoped to the centre's own students. The attempts/answers teacher RLS already
 * grants access to these, but the practice mocks have centre_id NULL so we read
 * via the service client and enforce the centre boundary by student id here.
 */
export async function listPracticeActivityForCentre(
  centreId: string,
  limit = 50,
): Promise<PracticeActivityRow[]> {
  const supabase = getServiceClient();

  const batches = await listBatchesForCentre(centreId);
  if (batches.length === 0) return [];

  const { data: students, error: sErr } = await supabase
    .from("students")
    .select("id, name")
    .in(
      "batch_id",
      batches.map((b) => b.id),
    );
  if (sErr) throw sErr;
  const studentName = new Map(
    (students ?? []).map((s) => [s.id as string, s.name as string]),
  );
  const studentIds = [...studentName.keys()];
  if (studentIds.length === 0) return [];

  // Submitted attempts by these students (newest first).
  const { data: attempts, error: aErr } = await supabase
    .from("attempts")
    .select("id, student_id, mock_id, total_marks, max_marks, accuracy, submitted_at")
    .in("student_id", studentIds)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(300);
  if (aErr) throw aErr;

  const rows = attempts ?? [];
  const mockIds = [...new Set(rows.map((r) => r.mock_id as string))];
  if (mockIds.length === 0) return [];

  // Keep only attempts whose mock is a practice mock (lesson | bank).
  const { data: mocks, error: mErr } = await supabase
    .from("mocks")
    .select("id, title, kind")
    .in("id", mockIds)
    .in("kind", ["lesson", "bank"]);
  if (mErr) throw mErr;
  const mockMeta = new Map(
    (mocks ?? []).map((m) => [
      m.id as string,
      { title: m.title as string, kind: m.kind as "lesson" | "bank" },
    ]),
  );

  const result: PracticeActivityRow[] = [];
  for (const a of rows) {
    const meta = mockMeta.get(a.mock_id as string);
    if (!meta) continue; // not a practice mock
    result.push({
      attemptId: a.id as string,
      studentName: studentName.get(a.student_id as string) ?? "—",
      title: meta.title,
      kind: meta.kind,
      totalMarks: (a.total_marks as number | null) ?? null,
      maxMarks: (a.max_marks as number | null) ?? null,
      accuracy: (a.accuracy as number | null) ?? null,
      submittedAt: a.submitted_at as string,
    });
    if (result.length >= limit) break;
  }
  return result;
}
