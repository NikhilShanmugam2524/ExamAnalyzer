/**
 * Seed ~30 days of realistic practice for ONE student, so the progress
 * dashboard (rating trend + chapter standings + recent tests) and the home
 * level card look "lived-in" for demos.
 *
 * It runs the REAL engine: every simulated attempt is graded by lib/grade and
 * scored by lib/rating, then written to the same tables the live app writes
 * (mocks, mock_questions, attempts, answers, student_ratings,
 * student_chapter_ratings, rating_events). So what the dashboard shows is exactly
 * what the app would have produced — just back-dated across 30 days.
 *
 * Targets the SEED_STUDENT_EMAIL student (falls back to "Aarav Menon"), and
 * RESETS that student's practice data first, so it is safe to re-run.
 *
 *   npx tsx scripts/seed-demo-progress.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { buildReport } from "../lib/grade";
import {
  applyAttempt,
  applyByBucket,
  levelFor,
  overallRating,
  START_RATING,
  type BucketInput,
  type RatingInput,
  type SubjectState,
} from "../lib/rating";
import type { Attempt, Difficulty, Question, Subject } from "../lib/types";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("✗ Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const sb = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SUBJECTS: Subject[] = ["Physics", "Chemistry", "Biology"];
const DAYS = 30;
const ckey = (s: string, c: string) => `${s}|${c}`;

// ── tiny helpers ──────────────────────────────────────────────────────────
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const rand = () => Math.random();
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** Skill grows over the month; Biology strongest, Chemistry weakest (spread). */
function baseAccuracy(dayFrac: number, subject: Subject): number {
  let acc = 0.42 + 0.4 * dayFrac;
  if (subject === "Biology") acc += 0.06;
  else if (subject === "Chemistry") acc -= 0.05;
  return acc;
}
const diffAdj = (d: Difficulty) => (d === "Easy" ? 0.15 : d === "Hard" ? -0.18 : 0);

// ── locate the student ────────────────────────────────────────────────────
async function findStudent(): Promise<{ id: string; name: string }> {
  const email = process.env.SEED_STUDENT_EMAIL;
  if (email) {
    for (let page = 1; ; page++) {
      const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
      if (u) {
        const { data: s } = await sb
          .from("students")
          .select("id, name")
          .eq("profile_id", u.id)
          .maybeSingle();
        if (s) return { id: s.id as string, name: s.name as string };
        break;
      }
      if (data.users.length < 1000) break;
    }
  }
  const { data: byName } = await sb
    .from("students")
    .select("id, name")
    .eq("name", "Aarav Menon")
    .maybeSingle();
  if (byName) return { id: byName.id as string, name: byName.name as string };
  throw new Error("No demo student found (set SEED_STUDENT_EMAIL or seed Aarav Menon).");
}

// ── load the global question pool, grouped by subject → chapter ────────────
type Pool = Record<Subject, Map<string, Question[]>>;
async function loadPool(): Promise<Pool> {
  const cols = "id, subject, chapter, concept, difficulty, par_time_sec, text, options, answer_index";
  const rows: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("questions")
      .select(cols)
      .is("centre_id", null)
      .eq("hidden", false)
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const pool: Pool = { Physics: new Map(), Chemistry: new Map(), Biology: new Map() };
  for (const r of rows) {
    const subj = r.subject as Subject;
    if (!pool[subj]) continue;
    const q: Question = {
      id: r.id,
      subject: subj,
      chapter: r.chapter,
      concept: r.concept,
      difficulty: r.difficulty as Difficulty,
      parTimeSec: r.par_time_sec,
      text: r.text,
      options: (r.options as string[]) ?? [],
      answerIndex: r.answer_index,
    };
    if (!pool[subj].has(q.chapter)) pool[subj].set(q.chapter, []);
    pool[subj].get(q.chapter)!.push(q);
  }
  return pool;
}

// ── wipe this student's prior practice data (re-runnable) ──────────────────
async function reset(studentId: string) {
  const { data: atts } = await sb.from("attempts").select("id").eq("student_id", studentId);
  const attemptIds = (atts ?? []).map((a) => a.id as string);
  await sb.from("rating_events").delete().eq("student_id", studentId);
  if (attemptIds.length) await sb.from("answers").delete().in("attempt_id", attemptIds);
  await sb.from("attempts").delete().eq("student_id", studentId);
  await sb.from("student_ratings").delete().eq("student_id", studentId);
  await sb.from("student_chapter_ratings").delete().eq("student_id", studentId);
  await sb.from("mocks").delete().eq("owner_student_id", studentId); // cascades mock_questions
}

// ── simulate one session and write it through the real engine ──────────────
async function runSession(
  studentId: string,
  questions: Question[],
  when: Date,
  dayFrac: number,
  subjectState: Record<Subject, SubjectState>,
  chapterState: Record<string, SubjectState>,
  seenCorrect: Set<string>,
) {
  const subject = questions[0].subject;
  const chapter = questions[0].chapter;
  const iso = when.toISOString();

  // Simulate the student's answers.
  const answers: Attempt[] = questions.map((q) => {
    const par = q.parTimeSec || 60;
    const pBlank = Math.max(0.02, 0.1 * (1 - dayFrac));
    if (rand() < pBlank) return { questionId: q.id, pickedIndex: null, timeSec: Math.round(par * (0.3 + rand() * 0.5)) };
    const pCorrect = clamp(baseAccuracy(dayFrac, subject) + diffAdj(q.difficulty) + (rand() - 0.5) * 0.16, 0.08, 0.95);
    const correct = rand() < pCorrect;
    let picked = q.answerIndex;
    if (!correct) { do { picked = Math.floor(rand() * 4); } while (picked === q.answerIndex); }
    // time: mostly near par, with occasional slow (correct) / rushed (wrong) for diagnosis variety
    let factor = 0.6 + rand() * 0.9;
    if (correct && rand() < 0.12) factor = 1.5 + rand() * 0.6;
    if (!correct && rand() < 0.15) factor = 0.15 + rand() * 0.2;
    return { questionId: q.id, pickedIndex: picked, timeSec: Math.max(3, Math.round(par * factor)) };
  });

  const report = buildReport(questions, answers);

  // Mock + ordered questions (so the report link works), back-dated.
  const { data: mock, error: mErr } = await sb
    .from("mocks")
    .insert({
      centre_id: null,
      batch_id: null,
      owner_student_id: studentId,
      kind: "lesson",
      title: `${chapter} — practice`,
      status: "published",
      max_attempts: 1,
      created_at: iso,
    })
    .select("id")
    .single();
  if (mErr) throw mErr;
  const mockId = mock.id as string;
  await sb.from("mock_questions").insert(
    questions.map((q, position) => ({ mock_id: mockId, question_id: q.id, position })),
  );

  // Attempt + answers, back-dated.
  const { data: attempt, error: aErr } = await sb
    .from("attempts")
    .insert({
      mock_id: mockId,
      student_id: studentId,
      submitted_at: iso,
      total_marks: report.score,
      max_marks: report.maxScore,
      accuracy: report.accuracyPct,
    })
    .select("id")
    .single();
  if (aErr) throw aErr;
  const attemptId = attempt.id as string;
  await sb.from("answers").insert(
    answers.map((a) => ({
      attempt_id: attemptId,
      question_id: a.questionId,
      picked_index: a.pickedIndex,
      time_sec: a.timeSec,
    })),
  );

  // Ratings — exactly as lib/db/ratings.ts does it.
  const inputs: RatingInput[] = report.items.map((it) => ({
    questionId: it.question.id,
    subject: it.question.subject,
    difficulty: it.question.difficulty,
    attempted: it.attempted,
    correct: it.correct,
    previouslyCorrect: seenCorrect.has(it.question.id),
  }));
  const res = applyAttempt(subjectState, inputs);
  Object.assign(subjectState, res.finalSubjects);

  const bucketInputs: BucketInput[] = report.items.map((it) => ({
    bucket: ckey(it.question.subject, it.question.chapter),
    difficulty: it.question.difficulty,
    attempted: it.attempted,
    correct: it.correct,
    previouslyCorrect: seenCorrect.has(it.question.id),
  }));
  const cRes = applyByBucket(chapterState, bucketInputs);
  Object.assign(chapterState, cRes.final);

  if (res.deltas.length) {
    await sb.from("rating_events").insert(
      res.deltas.map((d) => ({
        attempt_id: attemptId,
        question_id: d.questionId,
        student_id: studentId,
        subject: d.subject,
        delta: d.delta,
        rating_after: d.ratingAfter,
        created_at: iso,
      })),
    );
  }

  for (const it of report.items) if (it.correct) seenCorrect.add(it.question.id);
  return { subject, chapter, score: report.score, max: report.maxScore };
}

async function main() {
  const student = await findStudent();
  console.log(`Seeding 30-day demo for: ${student.name} (${student.id})\n`);

  const pool = await loadPool();
  for (const s of SUBJECTS) {
    if (pool[s].size === 0) throw new Error(`No global questions for ${s}.`);
  }

  // Pick a working set of chapters per subject (enough questions each).
  const chaptersFor = (s: Subject) =>
    shuffle([...pool[s].entries()].filter(([, qs]) => qs.length >= 5).map(([c]) => c)).slice(0, 8);
  const subjChapters: Record<Subject, string[]> = {
    Physics: chaptersFor("Physics"),
    Chemistry: chaptersFor("Chemistry"),
    Biology: chaptersFor("Biology"),
  };

  await reset(student.id);
  console.log("  • reset prior practice data");

  // Running engine state, accumulated across the whole month.
  const subjectState: Record<Subject, SubjectState> = {
    Physics: { rating: START_RATING, questionsRated: 0 },
    Chemistry: { rating: START_RATING, questionsRated: 0 },
    Biology: { rating: START_RATING, questionsRated: 0 },
  };
  const chapterState: Record<string, SubjectState> = {};
  const seenCorrect = new Set<string>();
  const usedByChapter = new Map<string, Set<string>>();

  // Weighted subject rotation (Biology emphasised, like the exam).
  const subjectBag: Subject[] = [
    "Biology", "Biology", "Biology", "Biology",
    "Physics", "Physics", "Physics",
    "Chemistry", "Chemistry",
  ];
  const ring: Record<Subject, number> = { Physics: 0, Chemistry: 0, Biology: 0 };

  const now = Date.now();
  let sessions = 0;
  for (let day = 0; day < DAYS; day++) {
    if (rand() < 0.12) continue; // an occasional rest day
    const dayFrac = day / (DAYS - 1);
    const count = rand() < 0.25 ? 2 : 1; // sometimes two sessions a day
    for (let k = 0; k < count; k++) {
      const subject = pick(subjectBag);
      const chapters = subjChapters[subject];
      if (chapters.length === 0) continue;
      // mostly advance through chapters; sometimes revisit an earlier one
      let chapter: string;
      if (rand() < 0.25 && ring[subject] > 0) chapter = chapters[Math.floor(rand() * Math.min(ring[subject] + 1, chapters.length))];
      else { chapter = chapters[ring[subject] % chapters.length]; ring[subject]++; }

      const poolQs = pool[subject].get(chapter) ?? [];
      if (poolQs.length === 0) continue;
      const used = usedByChapter.get(ckey(subject, chapter)) ?? new Set<string>();
      const fresh = shuffle(poolQs.filter((q) => !used.has(q.id)));
      const target = Math.min(10, Math.max(6, poolQs.length));
      const chosen = (fresh.length >= target ? fresh : shuffle(poolQs)).slice(0, target);
      chosen.forEach((q) => used.add(q.id));
      usedByChapter.set(ckey(subject, chapter), used);

      const when = new Date(now - (DAYS - 1 - day) * 86400000 + (8 + Math.floor(rand() * 12)) * 3600000 + k * 5400000);
      const r = await runSession(student.id, chosen, when, dayFrac, subjectState, chapterState, seenCorrect);
      sessions++;
      console.log(`  • ${when.toISOString().slice(0, 10)}  ${r.subject.slice(0, 3)}  ${r.chapter}  ${r.score}/${r.max}`);
    }
  }

  // Final snapshots — student_ratings (subjects + Overall) and chapter ratings.
  const now2 = new Date().toISOString();
  const subjectUpserts = SUBJECTS.map((s) => ({
    student_id: student.id,
    subject: s,
    rating: subjectState[s].rating,
    questions_rated: subjectState[s].questionsRated,
    level: levelFor(subjectState[s].rating, null).name,
    updated_at: now2,
  }));
  const overall = overallRating({
    Physics: subjectState.Physics.rating,
    Chemistry: subjectState.Chemistry.rating,
    Biology: subjectState.Biology.rating,
  });
  subjectUpserts.push({
    student_id: student.id,
    subject: "Overall" as Subject,
    rating: overall,
    questions_rated: SUBJECTS.reduce((n, s) => n + subjectState[s].questionsRated, 0),
    level: levelFor(overall, null).name,
    updated_at: now2,
  });
  await sb.from("student_ratings").upsert(subjectUpserts, { onConflict: "student_id,subject" });

  const chapterUpserts = Object.entries(chapterState)
    .filter(([, st]) => st.questionsRated > 0)
    .map(([key, st]) => {
      const [subject, chapter] = key.split("|");
      return {
        student_id: student.id,
        subject,
        chapter,
        rating: st.rating,
        questions_rated: st.questionsRated,
        level: levelFor(st.rating, null).name,
        updated_at: now2,
      };
    });
  if (chapterUpserts.length) {
    await sb.from("student_chapter_ratings").upsert(chapterUpserts, { onConflict: "student_id,subject,chapter" });
  }

  console.log(`\n✓ Done — ${sessions} sessions over ${DAYS} days.`);
  console.log(`  Overall ${overall} (${levelFor(overall, null).name})  ·  ` +
    SUBJECTS.map((s) => `${s.slice(0, 3)} ${subjectState[s].rating}`).join(" · "));
  console.log(`  Chapters rated: ${chapterUpserts.length}`);
}

main().catch((e) => {
  console.error("\n✗ Demo seed failed:", e?.message ?? e);
  process.exit(1);
});
