/**
 * Seed a whole demo UNIVERSE: 6 coaching centres, each with 25–30 students and
 * its own teacher login, then ~30 days of realistic practice for every student
 * so the teacher dashboards (leaderboard, weak chapters, active-this-week) and
 * the per-student drill-down dashboards all look lived-in.
 *
 * Spread per centre (so dashboards are interesting):
 *   active · steady · struggling · lazy · inactive(stopped ~2wk ago) · newbie(no practice)
 *
 * Runs the REAL engine: each session is graded by lib/grade + scored by
 * lib/rating. For speed, all rows are accumulated with client-generated UUIDs
 * and written in a few BULK inserts per centre (instead of hundreds of
 * sequential round-trips), so the whole thing finishes in ~1–2 minutes.
 *
 * The teacher of a centre can drill into ANY student to see that student's full
 * dashboard, so no per-student logins are needed.
 *
 * Idempotent: deletes any prior demo centre by name (cascades) before seeding.
 *
 *   npx tsx scripts/seed-demo-centres.ts
 */

import { config } from "dotenv";
import { randomUUID } from "node:crypto";
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
const TEACHER_PASSWORD = "Teacher-Demo-2026";
const ckey = (s: string, c: string) => `${s}|${c}`;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const rand = () => Math.random();
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const randInt = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
function joinCode(): string {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += A[Math.floor(rand() * A.length)];
  return s;
}
const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 24);

/** Insert rows in chunks so a single request never gets too large. */
async function insertChunked(table: string, rows: any[], size = 1000) {
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await sb.from(table).insert(rows.slice(i, i + size));
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}
async function upsertChunked(table: string, rows: any[], onConflict: string, size = 1000) {
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await sb.from(table).upsert(rows.slice(i, i + size), { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

// ── the demo universe ───────────────────────────────────────────────────────
const CENTRES = [
  "Velocity Academy — Coimbatore",
  "Apex Career Institute — Madurai",
  "Pinnacle Learning — Velachery",
  "Sigma Classes — Trichy",
  "Catalyst Academy — Salem",
  "Brilliant Tutorials — T. Nagar",
];

const FIRST = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
  "Diya", "Saanvi", "Aadhya", "Ananya", "Pari", "Anika", "Navya", "Riya", "Myra", "Sara",
  "Karthik", "Harini", "Lakshmi", "Meena", "Nithya", "Priya", "Rahul", "Sneha", "Varun", "Deepa",
  "Akash", "Bhavya", "Charan", "Divya", "Gokul", "Ishita", "Janani", "Kavya", "Manoj", "Nandini",
];
const LAST = [
  "Sharma", "Verma", "Iyer", "Nair", "Menon", "Reddy", "Rao", "Pillai", "Krishnan", "Subramanian",
  "Gupta", "Patel", "Kumar", "Raj", "Das", "Bose", "Chandran", "Ganesh", "Murthy", "Naidu",
];
const usedNames = new Set<string>();
function studentName(): string {
  for (let i = 0; i < 50; i++) {
    const n = `${pick(FIRST)} ${pick(LAST)}`;
    if (!usedNames.has(n)) { usedNames.add(n); return n; }
  }
  return `${pick(FIRST)} ${pick(LAST)} ${randInt(2, 9)}`;
}

// ── archetypes ──────────────────────────────────────────────────────────────
type Archetype = { name: string; talent: number; sessionProb: number; maxDay: number; twoChance: number };
const ARCH: Record<string, Archetype> = {
  active:     { name: "active",     talent: 1.18, sessionProb: 0.82, maxDay: DAYS, twoChance: 0.3  },
  steady:     { name: "steady",     talent: 1.0,  sessionProb: 0.5,  maxDay: DAYS, twoChance: 0.12 },
  struggling: { name: "struggling", talent: 0.8,  sessionProb: 0.55, maxDay: DAYS, twoChance: 0.1  },
  lazy:       { name: "lazy",       talent: 0.93, sessionProb: 0.32, maxDay: DAYS, twoChance: 0.05 },
  inactive:   { name: "inactive",   talent: 1.03, sessionProb: 0.7,  maxDay: 15,   twoChance: 0.1  },
  newbie:     { name: "newbie",     talent: 1.0,  sessionProb: 0,    maxDay: 0,    twoChance: 0    },
};
/** Build a realistic class roster of archetypes for n students. */
function rosterArchetypes(n: number): Archetype[] {
  const out: Archetype[] = [];
  const add = (k: keyof typeof ARCH, frac: number) => {
    for (let i = 0; i < Math.round(n * frac); i++) out.push(ARCH[k]);
  };
  add("active", 0.16);
  add("steady", 0.26);
  add("struggling", 0.2);
  add("lazy", 0.18);
  add("inactive", 0.1);
  add("newbie", 0.1);
  while (out.length < n) out.push(ARCH.steady);
  return shuffle(out).slice(0, n);
}

function baseAccuracy(dayFrac: number, subject: Subject, talent: number): number {
  let acc = 0.42 + 0.4 * dayFrac + (talent - 1) * 0.5;
  if (subject === "Biology") acc += 0.06;
  else if (subject === "Chemistry") acc -= 0.05;
  return acc;
}
const diffAdj = (d: Difficulty) => (d === "Easy" ? 0.15 : d === "Hard" ? -0.18 : 0);

// ── global question pool grouped by subject → chapter ──────────────────────
type Pool = Record<Subject, Map<string, Question[]>>;
async function loadPool(): Promise<Pool> {
  const cols = "id, subject, chapter, concept, difficulty, par_time_sec, text, options, answer_index";
  const rows: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("questions").select(cols).is("centre_id", null).eq("hidden", false)
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
      id: r.id, subject: subj, chapter: r.chapter, concept: r.concept,
      difficulty: r.difficulty as Difficulty, parTimeSec: r.par_time_sec,
      text: r.text, options: (r.options as string[]) ?? [], answerIndex: r.answer_index,
    };
    if (!pool[subj].has(q.chapter)) pool[subj].set(q.chapter, []);
    pool[subj].get(q.chapter)!.push(q);
  }
  return pool;
}

// ── accumulator: all DB rows for one centre, written in bulk at the end ─────
type Rows = {
  mocks: any[]; mockQuestions: any[]; attempts: any[]; answers: any[]; ratingEvents: any[];
  studentRatings: any[]; chapterRatings: any[];
};
const emptyRows = (): Rows => ({ mocks: [], mockQuestions: [], attempts: [], answers: [], ratingEvents: [], studentRatings: [], chapterRatings: [] });

/** Simulate one practice session — pure: mutates state, pushes rows, no I/O. */
function runSession(
  studentId: string, questions: Question[], when: Date, dayFrac: number, talent: number,
  subjectState: Record<Subject, SubjectState>, chapterState: Record<string, SubjectState>,
  seenCorrect: Set<string>, rows: Rows,
) {
  const chapter = questions[0].chapter;
  const subject = questions[0].subject;
  const iso = when.toISOString();

  const answers: Attempt[] = questions.map((q) => {
    const par = q.parTimeSec || 60;
    const pBlank = Math.max(0.02, 0.1 * (1 - dayFrac));
    if (rand() < pBlank) return { questionId: q.id, pickedIndex: null, timeSec: Math.round(par * (0.3 + rand() * 0.5)) };
    const pCorrect = clamp(baseAccuracy(dayFrac, subject, talent) + diffAdj(q.difficulty) + (rand() - 0.5) * 0.16, 0.05, 0.96);
    const correct = rand() < pCorrect;
    let picked = q.answerIndex;
    if (!correct) { do { picked = Math.floor(rand() * 4); } while (picked === q.answerIndex); }
    let factor = 0.6 + rand() * 0.9;
    if (correct && rand() < 0.12) factor = 1.5 + rand() * 0.6;
    if (!correct && rand() < 0.15) factor = 0.15 + rand() * 0.2;
    return { questionId: q.id, pickedIndex: picked, timeSec: Math.max(3, Math.round(par * factor)) };
  });

  const report = buildReport(questions, answers);
  const mockId = randomUUID();
  const attemptId = randomUUID();

  rows.mocks.push({ id: mockId, centre_id: null, batch_id: null, owner_student_id: studentId, kind: "lesson", title: `${chapter} — practice`, status: "published", max_attempts: 1, created_at: iso });
  questions.forEach((q, position) => rows.mockQuestions.push({ mock_id: mockId, question_id: q.id, position }));
  rows.attempts.push({ id: attemptId, mock_id: mockId, student_id: studentId, submitted_at: iso, total_marks: report.score, max_marks: report.maxScore, accuracy: report.accuracyPct });
  answers.forEach((a) => rows.answers.push({ attempt_id: attemptId, question_id: a.questionId, picked_index: a.pickedIndex, time_sec: a.timeSec }));

  const inputs: RatingInput[] = report.items.map((it) => ({
    questionId: it.question.id, subject: it.question.subject, difficulty: it.question.difficulty,
    attempted: it.attempted, correct: it.correct, previouslyCorrect: seenCorrect.has(it.question.id),
  }));
  const res = applyAttempt(subjectState, inputs);
  Object.assign(subjectState, res.finalSubjects);

  const bucketInputs: BucketInput[] = report.items.map((it) => ({
    bucket: ckey(it.question.subject, it.question.chapter), difficulty: it.question.difficulty,
    attempted: it.attempted, correct: it.correct, previouslyCorrect: seenCorrect.has(it.question.id),
  }));
  Object.assign(chapterState, applyByBucket(chapterState, bucketInputs).final);

  res.deltas.forEach((d) => rows.ratingEvents.push({
    attempt_id: attemptId, question_id: d.questionId, student_id: studentId,
    subject: d.subject, delta: d.delta, rating_after: d.ratingAfter, created_at: iso,
  }));
  for (const it of report.items) if (it.correct) seenCorrect.add(it.question.id);
}

/** Simulate a student's full history (sync), pushing all rows into `rows`. */
function seedStudent(
  studentId: string, pool: Pool, subjChapters: Record<Subject, string[]>, arch: Archetype, rows: Rows,
): number {
  const subjectState: Record<Subject, SubjectState> = {
    Physics: { rating: START_RATING, questionsRated: 0 },
    Chemistry: { rating: START_RATING, questionsRated: 0 },
    Biology: { rating: START_RATING, questionsRated: 0 },
  };
  const chapterState: Record<string, SubjectState> = {};
  const seenCorrect = new Set<string>();
  const usedByChapter = new Map<string, Set<string>>();

  const subjectBag: Subject[] = ["Biology", "Biology", "Biology", "Biology", "Physics", "Physics", "Physics", "Chemistry", "Chemistry"];
  const ring: Record<Subject, number> = { Physics: 0, Chemistry: 0, Biology: 0 };

  const now = Date.now();
  let sessions = 0;
  for (let day = 0; day < arch.maxDay; day++) {
    if (rand() > arch.sessionProb) continue;
    const dayFrac = day / (DAYS - 1);
    const count = rand() < arch.twoChance ? 2 : 1;
    for (let k = 0; k < count; k++) {
      const subject = pick(subjectBag);
      const chapters = subjChapters[subject];
      if (chapters.length === 0) continue;
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
      runSession(studentId, chosen, when, dayFrac, arch.talent, subjectState, chapterState, seenCorrect, rows);
      sessions++;
    }
  }

  // Newbie / no-practice student: leave them unrated (no rating rows).
  if (sessions === 0) return 0;

  const nowIso = new Date().toISOString();
  SUBJECTS.forEach((s) => rows.studentRatings.push({
    student_id: studentId, subject: s, rating: subjectState[s].rating,
    questions_rated: subjectState[s].questionsRated, level: levelFor(subjectState[s].rating, null).name, updated_at: nowIso,
  }));
  const overall = overallRating({ Physics: subjectState.Physics.rating, Chemistry: subjectState.Chemistry.rating, Biology: subjectState.Biology.rating });
  rows.studentRatings.push({
    student_id: studentId, subject: "Overall", rating: overall,
    questions_rated: SUBJECTS.reduce((n, s) => n + subjectState[s].questionsRated, 0),
    level: levelFor(overall, null).name, updated_at: nowIso,
  });

  for (const [key, st] of Object.entries(chapterState)) {
    if (st.questionsRated <= 0) continue;
    const [subject, chapter] = key.split("|");
    rows.chapterRatings.push({ student_id: studentId, subject, chapter, rating: st.rating, questions_rated: st.questionsRated, level: levelFor(st.rating, null).name, updated_at: nowIso });
  }
  return sessions;
}

async function upsertTeacher(email: string, fullName: string, centreId: string): Promise<void> {
  let id: string | null = null;
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) { id = found.id; await sb.auth.admin.updateUserById(id, { password: TEACHER_PASSWORD, email_confirm: true, user_metadata: { full_name: fullName } }); break; }
    if (data.users.length < 1000) break;
  }
  if (!id) {
    const { data, error } = await sb.auth.admin.createUser({ email, password: TEACHER_PASSWORD, email_confirm: true, user_metadata: { full_name: fullName } });
    if (error) throw error;
    id = data.user.id;
  }
  const { error: pErr } = await sb.from("profiles").upsert({ id, role: "teacher", centre_id: centreId, full_name: fullName });
  if (pErr) throw pErr;
}

async function main() {
  console.log("Seeding demo centres…\n");

  const pool = await loadPool();
  for (const s of SUBJECTS) if (pool[s].size === 0) throw new Error(`No global questions for ${s} — seed the question bank first.`);
  const chaptersFor = (s: Subject) =>
    shuffle([...pool[s].entries()].filter(([, qs]) => qs.length >= 5).map(([c]) => c)).slice(0, 8);

  // Clean slate — remove any prior demo centres by name (cascades to all data).
  const { data: prior } = await sb.from("centres").select("id").in("name", CENTRES);
  if (prior && prior.length) {
    await sb.from("centres").delete().in("id", prior.map((c) => c.id));
    console.log(`  • cleared ${prior.length} prior demo centre(s)\n`);
  }

  const creds: string[] = [];
  for (const centreName of CENTRES) {
    const { data: centre, error: cErr } = await sb
      .from("centres").insert({ name: centreName, join_code: joinCode() }).select("id, join_code").single();
    if (cErr) throw cErr;
    const centreId = centre.id as string;

    const teacherEmail = `teacher.${slug(centreName)}@drivescore.demo`;
    await upsertTeacher(teacherEmail, `${centreName.split("—")[0].trim()} Faculty`, centreId);

    const subjChapters: Record<Subject, string[]> = {
      Physics: chaptersFor("Physics"), Chemistry: chaptersFor("Chemistry"), Biology: chaptersFor("Biology"),
    };

    const n = randInt(25, 30);
    const studentRows = Array.from({ length: n }, () => ({ centre_id: centreId, batch_id: null, name: studentName() }));
    const { data: inserted, error: sErr } = await sb.from("students").insert(studentRows).select("id, name");
    if (sErr) throw sErr;

    // Simulate everyone in-memory, then bulk-write the whole centre.
    const rows = emptyRows();
    const archetypes = rosterArchetypes(n);
    let rated = 0, newbies = 0;
    for (let i = 0; i < inserted.length; i++) {
      const sessions = seedStudent(inserted[i].id as string, pool, subjChapters, archetypes[i], rows);
      if (sessions > 0) rated++; else newbies++;
    }

    // FK-safe order: mocks → mock_questions → attempts → answers → rating_events
    await insertChunked("mocks", rows.mocks);
    await insertChunked("mock_questions", rows.mockQuestions);
    await insertChunked("attempts", rows.attempts);
    await insertChunked("answers", rows.answers);
    await insertChunked("rating_events", rows.ratingEvents);
    await upsertChunked("student_ratings", rows.studentRatings, "student_id,subject");
    await upsertChunked("student_chapter_ratings", rows.chapterRatings, "student_id,subject,chapter");

    creds.push(`  ${centreName}\n     login: ${teacherEmail}  /  ${TEACHER_PASSWORD}   ·  join code: ${centre.join_code}`);
    console.log(`  ✓ ${centreName.padEnd(34)} ${n} students  (${rated} practising, ${newbies} not yet started, ${rows.attempts.length} tests)`);
  }

  console.log(`\n✓ Done — ${CENTRES.length} centres seeded.\n`);
  console.log("Teacher logins (each sees their own centre; drill into any student for their dashboard):\n");
  creds.forEach((c) => console.log(c + "\n"));
}

main().catch((e) => {
  console.error("\n✗ Demo-centre seed failed:", e?.message ?? e);
  process.exit(1);
});
