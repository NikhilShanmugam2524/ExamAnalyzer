import "server-only";

/**
 * Student progress data — powers the /progress dashboard (RLS-scoped reads).
 *
 * The rating trajectory is reconstructed from the `rating_events` ledger by
 * CUMULATIVELY SUMMING per-subject deltas across attempts in date order. We do
 * NOT read `rating_after` for the trend: a whole attempt's events are inserted
 * in one batch and share a timestamp, so they can't be ordered reliably — but
 * deltas telescope to the exact rating regardless of within-attempt order.
 *
 * Nothing here is stored specially; it's all derived from existing tables.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { START_RATING } from "@/lib/rating";
import type { Subject } from "@/lib/types";

const SUBJECTS: Subject[] = ["Physics", "Chemistry", "Biology"];

/** One point on a subject's rating worm. */
export type TrendPoint = { t: number; rating: number };

export type SubjectTrend = { subject: Subject; points: TrendPoint[] };

export type RecentAttempt = {
  attemptId: string;
  title: string;
  date: number;
  marks: number;
  maxMarks: number;
  /** Net rating change across all subjects for this attempt. */
  delta: number;
};

export type ChapterStanding = {
  subject: Subject;
  chapter: string;
  rating: number;
  level: string;
};

export type StudentProgress = {
  trend: SubjectTrend[];
  recent: RecentAttempt[];
  strengths: ChapterStanding[];
  weaknesses: ChapterStanding[];
  /** Total rated attempts — drives the cold-start empty state. */
  attemptCount: number;
};

export async function getStudentProgress(
  studentId: string,
): Promise<StudentProgress> {
  const supabase = createSupabaseServerClient(); // RLS: student reads own rows

  // Submitted attempts, oldest first (the timeline spine).
  const { data: attemptRows, error: aErr } = await supabase
    .from("attempts")
    .select("id, mock_id, submitted_at, total_marks, max_marks")
    .eq("student_id", studentId)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: true });
  if (aErr) throw aErr;
  const attempts = attemptRows ?? [];

  // All rating deltas for this student, grouped by attempt + subject.
  const { data: eventRows, error: eErr } = await supabase
    .from("rating_events")
    .select("attempt_id, subject, delta")
    .eq("student_id", studentId);
  if (eErr) throw eErr;

  // attemptId → subject → summed delta; attemptId → total delta.
  const byAttempt = new Map<string, Map<Subject, number>>();
  const totalByAttempt = new Map<string, number>();
  for (const ev of eventRows ?? []) {
    const aid = ev.attempt_id as string;
    const subj = ev.subject as Subject;
    const d = Number(ev.delta);
    if (!byAttempt.has(aid)) byAttempt.set(aid, new Map());
    const m = byAttempt.get(aid)!;
    m.set(subj, (m.get(subj) ?? 0) + d);
    totalByAttempt.set(aid, (totalByAttempt.get(aid) ?? 0) + d);
  }

  // Build the per-subject worm. ALL THREE subjects are always plotted so the
  // graph is a constant three-line comparison: a subject the student hasn't
  // practised yet rides flat along the 1000 baseline (carry-forward), making
  // "Physics is climbing, Chem/Bio haven't moved" obvious at a glance.
  const running: Record<Subject, number> = { Physics: 0, Chemistry: 0, Biology: 0 };
  const points: Record<Subject, TrendPoint[]> = { Physics: [], Chemistry: [], Biology: [] };

  for (const a of attempts) {
    const t = new Date(a.submitted_at as string).getTime();
    const m = byAttempt.get(a.id as string);
    if (m) {
      for (const s of SUBJECTS) {
        if (m.has(s)) running[s] += m.get(s)!;
      }
    }
    for (const s of SUBJECTS) {
      points[s].push({ t, rating: START_RATING + running[s] });
    }
  }

  const trend: SubjectTrend[] = SUBJECTS.map((s) => ({ subject: s, points: points[s] }));

  // Recent attempts (most recent first) with title + net rating change.
  const recentSlice = attempts.slice(-6).reverse();
  const mockIds = [...new Set(recentSlice.map((a) => a.mock_id as string))];
  const titleById = new Map<string, string>();
  if (mockIds.length > 0) {
    const { data: mockRows } = await supabase
      .from("mocks")
      .select("id, title")
      .in("id", mockIds);
    for (const mk of mockRows ?? []) titleById.set(mk.id as string, mk.title as string);
  }
  const recent: RecentAttempt[] = recentSlice.map((a) => ({
    attemptId: a.id as string,
    title: titleById.get(a.mock_id as string) ?? "Practice",
    date: new Date(a.submitted_at as string).getTime(),
    marks: (a.total_marks as number) ?? 0,
    maxMarks: (a.max_marks as number) ?? 0,
    delta: totalByAttempt.get(a.id as string) ?? 0,
  }));

  // Chapter standings — strongest + weakest lessons.
  const { data: chapterRows, error: cErr } = await supabase
    .from("student_chapter_ratings")
    .select("subject, chapter, rating, level")
    .eq("student_id", studentId);
  if (cErr) throw cErr;
  const chapters: ChapterStanding[] = (chapterRows ?? []).map((r) => ({
    subject: r.subject as Subject,
    chapter: r.chapter as string,
    rating: Math.round(Number(r.rating)),
    level: r.level as string,
  }));
  const sorted = [...chapters].sort((a, b) => b.rating - a.rating);
  const strengths = sorted.slice(0, 5);
  const weaknesses = sorted.slice(-5).reverse().filter((w) => !strengths.includes(w));

  return { trend, recent, strengths, weaknesses, attemptCount: attempts.length };
}
